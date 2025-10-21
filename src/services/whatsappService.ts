import {
  WASocket,
  DisconnectReason,
  ConnectionState,
  downloadMediaMessage,
} from "@whiskeysockets/baileys";
import P from "pino";
import qrcode from "qrcode";
import { Boom } from "@hapi/boom";
import { Session } from "../models/Session";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
import { Media } from "../models/Media";
import { Contact } from "../models/Contact";
import { Server as IOServer } from "socket.io";
import { useMongoAuthState } from "./mongoAuthState";
import { sessionManager } from "./sessionManager";
import { makeSocket, getStore } from "./whatsapp/socketFactory";
import { bindContactHandlers } from "./whatsapp/events/contacts";
import { bindMessageHandlers } from "./whatsapp/events/messages";
import { bindConnectionHandlers } from "./whatsapp/events/connection";
import { getProfilePictureUsingSock } from "./whatsapp/profile";
import { sendMessageUsingSock } from "./whatsapp/sendMessage";
import { generateQrForSession } from "./whatsapp/qr";
import { env } from "../config/env";
import { metricsCounters } from "../metrics/metrics";

// store handling moved to socketFactory

export interface SessionData {
  sock: WASocket;
  isConnected: boolean;
  lastSeen: Date;
}

class WhatsAppService {
  private sessions: Record<string, SessionData> = {};
  private io?: IOServer;
  private metrics = {
    skippedMessagesNonContact: 0,
    skippedChatsNonContact: 0,
    skippedPresenceNonContact: 0,
  };

  setSocket(io: IOServer) {
    this.io = io;
  }

  getSession(sessionId: string) {
    return this.sessions[sessionId];
  }

  getAllSessions() {
    return this.sessions;
  }

  // Determina el tipo de chat a partir del JID
  private getChatType(jid: string): 'contact' | 'group' | 'unknown' {
    if (typeof jid !== 'string') return 'unknown';
    if (jid.endsWith('@s.whatsapp.net')) return 'contact';
    if (jid.endsWith('@g.us')) return 'group';
    return 'unknown';
  }

  async initializeExistingSessions() {
    const existingSessions = await Session.find({});
    for (const session of existingSessions) {
      try {
        await this.createSession(session.sessionId);
      } catch (err) {
        console.error("Error initializing session", session.sessionId, err);
      }
    }
  }

  async createSession(sessionId: string) {
    // Forzar desconexión de sesión existente si existe
    const existingSession = this.sessions[sessionId];
    if (existingSession?.sock) {
      console.log(`Desconectando sesión existente ${sessionId}`);
      try {
        await existingSession.sock.logout();
      } catch (err: any) {
        // Evitar crash si la conexión ya estaba cerrada
        console.warn(`Advertencia al hacer logout de ${sessionId}: ${err?.message || err}`);
      } finally {
        delete this.sessions[sessionId];
      }
    }

    // Limpiar estado de autenticación para forzar nuevo QR
    await sessionManager.createOrUpdateSession(sessionId, {
      status: "pending",
      isActive: true,
      qrCode: null, // Limpiar QR existente
      isConnected: false,
    } as any);

    const { state, saveCreds } = await useMongoAuthState(sessionId);

    const sock = makeSocket(state);

    this.sessions[sessionId] = {
      sock,
      isConnected: false,
      lastSeen: new Date(),
    };

    // Bind connection events
    bindConnectionHandlers(sock, sessionId, this.io, {
      updateSessionState: (sessionId: string, isConnected: boolean, lastSeen: Date) => {
        if (this.sessions[sessionId]) {
          this.sessions[sessionId].isConnected = isConnected;
          this.sessions[sessionId].lastSeen = lastSeen;
        }
      },
      onConnected: async (sessionId: string) => {
        // Preload chats
        await this.loadExistingChats(sessionId, sock, {
          type: "individual",
          limit: Number(process.env.PRELOAD_CHATS_LIMIT || 30),
        });
      },
      onDisconnected: async (sessionId: string, reason: string) => {
        const shouldReconnect = !reason.includes("loggedOut") && !reason.includes("Logged out");
        if (shouldReconnect) {
          console.log(`Reconectando sesión ${sessionId} en 5 segundos`);
          setTimeout(() => this.createSession(sessionId), 5001);
        } else {
          delete this.sessions[sessionId];
          await sessionManager.markAsInactive(sessionId, "Logged out");
        }
      },
    });

    // Bind mensajes y contactos
    bindMessageHandlers(sock, sessionId, this.io, {
      onMessage: async (msg: any) => {
        await this.handleIncomingMessage(sessionId, msg);
      },
    });
    bindContactHandlers(sock, sessionId);

    // Manejo de chats: solo contactos individuales (no grupos)
    sock.ev.on('chats.upsert', async (chats: any[]) => {
      try {
        for (const chat of chats) {
          const jid: string | undefined = chat?.id;
          if (!jid || typeof jid !== 'string') continue;
          const type = this.getChatType(jid);
          if (!env.allowGroups && type !== 'contact') {
            // Saltar grupos u otros tipos (broadcast, status, etc.)
            this.metrics.skippedChatsNonContact++;
            try { metricsCounters.skippedChatsNonContact.inc(); } catch {}
            continue;
          }

          const name = (chat?.name || chat?.subject || jid.split('@')[0] || 'Desconocido') as string;

          // Intentar relacionar con Contact ya existente
          let relatedContact = null as any;
          try { relatedContact = await Contact.findOne({ jid, sessionId }); } catch {}

          await Chat.findOneAndUpdate(
            { chatId: jid, sessionId },
            {
              name,
              phone: jid,
              isGroup: false,
              updatedAt: new Date(),
              contactId: relatedContact?._id || null,
            },
            { upsert: true, new: true }
          );

          console.log(`📒 Chat upsert (contacto): ${jid} (${name})`);
        }
      } catch (e) {
        console.warn(`No se pudieron procesar chats.upsert en sesión ${sessionId}:`, e);
      }
    });

    // Actualizaciones de chats: solo para contactos individuales
    sock.ev.on('chats.update', async (updates: any[]) => {
      try {
        for (const u of updates) {
          const jid: string | undefined = u?.id;
          if (!jid || typeof jid !== 'string') continue;
          const type = this.getChatType(jid);
          if (!env.allowGroups && type !== 'contact') { 
            this.metrics.skippedChatsNonContact++; 
            try { metricsCounters.skippedChatsNonContact.inc(); } catch {}
            continue; 
          }

          const name = (u?.name || u?.subject) as string | undefined;
          const payload: any = { updatedAt: new Date() };
          if (name) payload.name = name;

          await Chat.findOneAndUpdate(
            { chatId: jid, sessionId },
            payload,
            { upsert: false, new: true }
          );

          console.log(`✏️  Chat update (contacto): ${jid}${name ? ` -> ${name}` : ''}`);
        }
      } catch (e) {
        console.warn(`No se pudieron procesar chats.update en sesión ${sessionId}:`, e);
      }
    });

    // Presencia: ignorar grupos, solo registrar eventos de contactos
    sock.ev.on('presence.update', (presence: any) => {
      try {
        const jid: string | undefined = presence?.id || presence?.jid;
        if (!jid || typeof jid !== 'string') return;
        const type = this.getChatType(jid);
        if (!env.allowGroups && type !== 'contact') { 
          this.metrics.skippedPresenceNonContact++; 
          try { metricsCounters.skippedPresenceNonContact.inc(); } catch {}
          return; 
        }

        const state = presence?.presence || presence?.status || 'unknown';
        console.log(`👀 Presence contacto ${jid}: ${state}`);
      } catch (e) {
        console.warn(`No se pudo procesar presence.update en sesión ${sessionId}:`, e);
      }
    });

    // contacts handled by bindContactHandlers

    sock.ev.on("creds.update", saveCreds);

    return sock;
  }

  /**
   * Iniciar sesión (si no existe) y esperar a que se genere un QR en la base de datos.
   * Devuelve el QR en base64 o el estado si ya está conectada.
   */
  async generateQrForSession(
    sessionId: string,
    opts?: { timeoutMs?: number; pollMs?: number; force?: boolean; retries?: number; retryDelayMs?: number }
  ): Promise<{ status: "qr_ready" | "connected" | "pending" | "disconnected" | "error"; qr?: string | null }>
  {
    // Handle session cleanup if force is requested
    if (opts?.force) {
      const existing = this.sessions[sessionId];
      if (existing?.sock) {
        try { await existing.sock.logout(); } catch {}
        delete this.sessions[sessionId];
      }
    }

    return await generateQrForSession(sessionId, (sessionId) => this.createSession(sessionId), opts);
  }

  /**
   * Obtener foto de perfil de un contacto y guardar en MongoDB (delegado)
   */
  async getProfilePicture(sessionId: string, jid: string): Promise<string | null> {
    const session = this.sessions[sessionId];
    if (!session || !session.isConnected) {
      throw new Error("Sesión no conectada");
    }
    return await getProfilePictureUsingSock(session.sock, sessionId, jid);
  }

  /**
   * Descargar y guardar multimedia de un mensaje en MongoDB
   */
  private async downloadAndSaveMedia(
    msg: any,
    sessionId: string,
    messageId: string,
    chatId: string
  ): Promise<{ 
    fileId: string;
    type: string; 
    filename: string; 
    mimetype?: string;
    size?: number;
    isVoiceNote?: boolean;
  } | null> {
    try {
      const messageType = Object.keys(msg.message)[0];
      
      // Tipos de multimedia soportados
      const mediaTypes = [
        "imageMessage",
        "videoMessage",
        "audioMessage",
        "documentMessage",
        "stickerMessage",
      ];

      if (!mediaTypes.includes(messageType)) {
        return null;
      }

      // Descargar el archivo
      const buffer = await downloadMediaMessage(
        msg,
        "buffer",
        {},
        {
          logger: P({ level: "silent" }),
          reuploadRequest: () => Promise.resolve({} as any),
        }
      );

      if (!buffer) {
        console.error("Failed to download media");
        return null;
      }

      // Determinar tipo y extensión
      let mediaTypeSimple: "image" | "video" | "audio" | "document" | "sticker" | "voice" = "document";
      let extension = "";
      const mediaInfo = msg.message[messageType];
      const mimetype = mediaInfo?.mimetype || "application/octet-stream";
      const isVoiceNote = mediaInfo?.ptt || false;

      switch (messageType) {
        case "imageMessage":
          mediaTypeSimple = "image";
          extension = mimetype.includes("png") ? "png" : "jpg";
          break;
        case "videoMessage":
          mediaTypeSimple = "video";
          extension = "mp4";
          break;
        case "audioMessage":
          mediaTypeSimple = isVoiceNote ? "voice" : "audio";
          extension = isVoiceNote ? "ogg" : "mp3";
          break;
        case "documentMessage":
          mediaTypeSimple = "document";
          extension = mediaInfo?.fileName?.split(".").pop() || "pdf";
          break;
        case "stickerMessage":
          mediaTypeSimple = "sticker";
          extension = "webp";
          break;
      }

      // Generar ID y nombre únicos
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const fileId = `${mediaTypeSimple}_${timestamp}_${randomId}`;
      const filename = `${fileId}.${extension}`;

      // Extraer metadata adicional
      const width = mediaInfo?.width || null;
      const height = mediaInfo?.height || null;
      const duration = mediaInfo?.seconds || null;
      const caption = mediaInfo?.caption || null;
      const originalFilename = mediaInfo?.fileName || null;

      // Guardar en MongoDB
      await Media.create({
        fileId,
        messageId,
        sessionId,
        chatId,
        mediaType: mediaTypeSimple,
        filename,
        originalFilename,
        mimetype,
        size: (buffer as Buffer).length,
        data: buffer as Buffer,
        width,
        height,
        duration,
        caption,
        isVoiceNote,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log(`✅ Media saved in MongoDB: ${fileId} (${mediaTypeSimple})`);

      return {
        fileId,
        type: messageType,
        filename,
        mimetype,
        size: (buffer as Buffer).length,
        isVoiceNote,
      };
    } catch (error) {
      console.error("Error downloading media:", error);
      return null;
    }
  }

  private async handleIncomingMessage(sessionId: string, msg: any) {
    try {
      if (!msg.message || msg.key.fromMe) return;

      const messageType = Object.keys(msg.message)[0];
      const from = msg.key.remoteJid;
      const messageId = msg.key.id;
      const timestamp = new Date(msg.messageTimestamp * 1000);

      // Filtrar grupos: solo procesamos contactos individuales
      const chatType = this.getChatType(from);
      if (!env.allowGroups && chatType !== 'contact') {
        this.metrics.skippedMessagesNonContact++;
        try { metricsCounters.skippedMessagesNonContact.inc(); } catch {}
        console.log(`↩️  Omitiendo mensaje de chat no individual (${chatType}) desde ${from}`);
        return;
      }

      // Extraer contenido del mensaje según el tipo
      let messageContent = "";
      let mediaData: any = null;

      switch (messageType) {
        case "conversation":
          messageContent = msg.message.conversation;
          break;
        case "extendedTextMessage":
          messageContent = msg.message.extendedTextMessage?.text || "";
          break;
        case "imageMessage":
          messageContent = msg.message.imageMessage?.caption || "[Imagen]";
          mediaData = await this.downloadAndSaveMedia(msg, sessionId, messageId, from);
          break;
        case "videoMessage":
          messageContent = msg.message.videoMessage?.caption || "[Video]";
          mediaData = await this.downloadAndSaveMedia(msg, sessionId, messageId, from);
          break;
        case "audioMessage":
          messageContent = msg.message.audioMessage?.ptt ? "[Nota de voz]" : "[Audio]";
          mediaData = await this.downloadAndSaveMedia(msg, sessionId, messageId, from);
          break;
        case "documentMessage":
          const docName = msg.message.documentMessage?.fileName || "documento";
          messageContent = `[Documento: ${docName}]`;
          mediaData = await this.downloadAndSaveMedia(msg, sessionId, messageId, from);
          break;
        case "stickerMessage":
          messageContent = "[Sticker]";
          mediaData = await this.downloadAndSaveMedia(msg, sessionId, messageId, from);
          break;
        default:
          messageContent = "[Multimedia no soportado]";
      }

      console.log(`📨 Mensaje recibido de ${from} en sesión ${sessionId}`);

      // Mapear messageType de Baileys a tipo simplificado
      let simplifiedMessageType = 'text';
      if (messageType === 'imageMessage' || messageType === 'stickerMessage') {
        simplifiedMessageType = 'image';
      } else if (messageType === 'videoMessage') {
        simplifiedMessageType = 'video';
      } else if (messageType === 'audioMessage') {
        simplifiedMessageType = 'audio';
      } else if (messageType === 'documentMessage') {
        simplifiedMessageType = 'document';
      }

      // Guardar mensaje con datos de multimedia
      try {
        // Buscar contacto para relacionar
        let contactDoc = null as any;
        try { contactDoc = await Contact.findOne({ jid: from, sessionId }); } catch {}

        await Message.create({
          messageId,
          chatId: from,
          sessionId,
          contactId: contactDoc?._id || null,
          from,
          to: sessionId,
          body: messageContent,
          fromMe: false,
          timestamp,
          messageType: simplifiedMessageType, // Tipo simplificado
          status: "delivered",
          // Campos adicionales para multimedia
          mediaUrl: mediaData?.fileId, // Ahora es el fileId en MongoDB
          mediaType: messageType, // Tipo original de Baileys
          mediaFilename: mediaData?.filename,
          mediaMimetype: mediaData?.mimetype,
          mediaSize: mediaData?.size,
          isVoiceNote: mediaData?.isVoiceNote || false,
        });
        console.log(`✅ Mensaje guardado: ${messageId} (tipo: ${simplifiedMessageType})`);
      } catch (msgError) {
        console.error(`❌ Error guardando mensaje:`, msgError);
      }

      // Incrementar contador de mensajes recibidos
      try {
        await sessionManager.incrementMessageCount(sessionId, "received");
      } catch (countError) {
        console.error(`❌ Error incrementando contador:`, countError);
      }

      // Guardar o actualizar chat con foto de perfil
      try {
        const contactName = msg.pushName || from.split("@")[0] || "Desconocido";
        
        // Intentar obtener foto de perfil
        let profilePicUrl = null;
        try {
          profilePicUrl = await this.getProfilePicture(sessionId, from);
        } catch (error) {
          console.log(`No se pudo obtener foto de perfil para ${from}`);
        }
        
        // Intentar relacionar con Contact
        let relatedContact = null as any;
        try { relatedContact = await Contact.findOne({ jid: from, sessionId }); } catch {}

        const chat = await Chat.findOneAndUpdate(
          { chatId: from, sessionId },
          {
            $set: {
              name: contactName,
              phone: from,
              lastMessage: messageContent,
              lastMessageTime: timestamp,
              updatedAt: new Date(),
              profilePicUrl, // Agregar foto de perfil
              contactId: relatedContact?._id || null,
            },
            $inc: { unreadCount: 1 },
            $setOnInsert: {
              chatId: from,
              sessionId,
              isArchived: false,
              isPinned: false,
              createdAt: new Date(),
            },
          },
          { upsert: true, new: true }
        );

        console.log(`✅ Chat guardado/actualizado: ${from} (${chat.name})`);

        // Emitir evento de chat actualizado para refrescar listas en tiempo real
        this.io?.emit("chat-updated", {
          sessionId,
          chatId: from,
          action: "new-message",
          chat: chat.toObject(),
        });
      } catch (chatError) {
        console.error(`❌ Error guardando chat ${from}:`, chatError);
      }

      // Emitir evento Socket.IO con datos de multimedia
      this.io?.emit("message", {
        sessionId,
        from,
        to: sessionId,
        body: messageContent,
        text: messageContent, // Mantener por compatibilidad
        timestamp: timestamp.toISOString(),
        messageId,
        fromMe: false,
        messageType: simplifiedMessageType,
        status: "delivered",
        // Campos de multimedia
        mediaUrl: mediaData?.fileId,
        mediaType: messageType, // Tipo original de Baileys
        mediaFilename: mediaData?.filename,
        mediaMimetype: mediaData?.mimetype,
        mediaSize: mediaData?.size,
        isVoiceNote: mediaData?.isVoiceNote || false,
      });
    } catch (error) {
      console.error("❌ Error general handling incoming message:", error);
    }
  }

  private async loadExistingChats(
    sessionId: string,
    _sock: WASocket,
    opts?: { type?: "group" | "individual" | "all"; limit?: number }
  ) {
    try {
      const limit = Math.max(1, Math.min(100, Number(opts?.limit || 30)));

      console.log(`📱 Cargando chats individuales para sesión ${sessionId} (límite: ${limit})...`);

      const memStore = getStore();
      if (memStore) {
        const all = memStore.chats.all() as any[];
        
        const individuals = all
          .filter((c) => {
            if (!c?.id || typeof c.id !== "string") return false;
            const isIndividual = c.id.endsWith("@s.whatsapp.net");
            const isGroup = c.id.endsWith("@g.us");
            return isIndividual && !isGroup;
          })
          .sort((a, b) => {
            const timeA = Number(a.conversationTimestamp || 0);
            const timeB = Number(b.conversationTimestamp || 0);
            return timeB - timeA;
          })
          .slice(0, limit);

        console.log(`✅ Encontrados ${individuals.length} chats individuales en store`);

        // Guardar en MongoDB con fotos de perfil
        for (const c of individuals) {
          const chatId = c.id as string;
          const name = (c.name || c.subject || chatId.split("@")[0] || "Desconocido") as string;
          const lastMessageTime = c.conversationTimestamp 
            ? new Date(Number(c.conversationTimestamp) * 1000) 
            : new Date();

          // Obtener foto de perfil
          let profilePicUrl = null;
          try {
            profilePicUrl = await this.getProfilePicture(sessionId, chatId);
          } catch (error) {
            console.log(`No profile pic for ${chatId}`);
          }

          await Chat.findOneAndUpdate(
            { chatId, sessionId },
            {
              name,
              phone: chatId,
              lastMessageTime,
              unreadCount: Number(c.unreadCount || 0),
              updatedAt: new Date(),
              profilePicUrl,
            },
            { upsert: true, new: true }
          );
        }
      } else {
        console.log(`📦 Cargando chats individuales desde MongoDB...`);
        
        const pipeline = [
          { 
            $match: { 
              sessionId, 
              chatId: { $regex: /@s\\.whatsapp\\.net$/ } 
            } 
          },
          { $sort: { timestamp: -1 } },
          {
            $group: {
              _id: "$chatId",
              lastMessage: { $first: "$body" },
              lastMessageTime: { $first: "$timestamp" },
            },
          },
          { $limit: limit },
        ];

        const recentIndividuals = await Message.aggregate(pipeline as any);
        
        console.log(`✅ Encontrados ${recentIndividuals.length} chats individuales en MongoDB`);
        
        for (const doc of recentIndividuals as any[]) {
          const chatId = doc._id as string;
          const name = chatId.split("@")[0] || "Desconocido";
          
          // Obtener foto de perfil
          let profilePicUrl = null;
          try {
            profilePicUrl = await this.getProfilePicture(sessionId, chatId);
          } catch (error) {
            console.log(`No profile pic for ${chatId}`);
          }
          
          await Chat.findOneAndUpdate(
            { chatId, sessionId },
            {
              name,
              phone: chatId,
              lastMessage: doc.lastMessage,
              lastMessageTime: doc.lastMessageTime,
              updatedAt: new Date(),
              profilePicUrl,
            },
            { upsert: true, new: true }
          );
        }
      }
      
      console.log(`✅ Chats individuales cargados correctamente para ${sessionId}`);
    } catch (error) {
      console.error("❌ Error loading existing chats:", error);
    }
  }

  /**
   * Enviar mensaje (delegado a sendMessageUsingSock)
   */
  async sendMessage(
    sessionId: string,
    to: string,
    text: string,
    options?: {
      mediaFileId?: string;
      caption?: string;
      mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'voice';
      fileBuffer?: Buffer;
      filename?: string;
      mimetype?: string;
    }
  ) {
    const session = this.sessions[sessionId];
    if (!session || !session.isConnected) throw new Error("Sesión no conectada");

    // Validar destino: solo contactos individuales
    const type = this.getChatType(to);
    if (!env.allowGroups && type !== 'contact') {
      throw new Error('Solo se permite enviar mensajes a contactos individuales (@s.whatsapp.net)');
    }

    const { messageId } = await sendMessageUsingSock(sessionId, session.sock, to, text, options);
    this.io?.emit("message-sent", { sessionId, to, text, messageId });
  }

  // Obtener métricas internas (para monitoreo)
  getMetrics() {
    return { ...this.metrics };
  }

  async disconnectSession(sessionId: string) {
    const s = this.sessions[sessionId];
    if (!s) return;
    await s.sock.logout();
    delete this.sessions[sessionId];
    await sessionManager.markAsInactive(sessionId, "Manual disconnect");
  }
}

export const whatsappService = new WhatsAppService();