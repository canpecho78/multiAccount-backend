import {
  default as makeWASocket,
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
import { Server as IOServer } from "socket.io";
import { useMongoAuthState } from "./mongoAuthState";
import { sessionManager } from "./sessionManager";

// Resolve Baileys makeInMemoryStore across different version layouts
let store: any = null;
const resolveMakeInMemoryStore = () => {
  const candidates = [
    () => require("@whiskeysockets/baileys").makeInMemoryStore,
    () => require("@whiskeysockets/baileys/lib/Store").makeInMemoryStore,
    () => require("@whiskeysockets/baileys/lib/Store/Store").makeInMemoryStore,
    () => require("@whiskeysockets/baileys/lib/Store/index").makeInMemoryStore,
    () => require("@whiskeysockets/baileys/lib/Utils/store").makeInMemoryStore,
  ];
  for (const get of candidates) {
    try {
      const fn = get();
      if (typeof fn === "function") return fn;
    } catch (_) {
      // try next
    }
  }
  return null;
};

const makeInMemoryStore = resolveMakeInMemoryStore();
if (makeInMemoryStore) {
  store = makeInMemoryStore({ logger: P({ level: "silent" }) });
}

export interface SessionData {
  sock: WASocket;
  isConnected: boolean;
  lastSeen: Date;
}

class WhatsAppService {
  private sessions: Record<string, SessionData> = {};
  private io?: IOServer;

  setSocket(io: IOServer) {
    this.io = io;
  }

  getSession(sessionId: string) {
    return this.sessions[sessionId];
  }

  getAllSessions() {
    return this.sessions;
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
    // Registrar sesión en MongoDB
    await sessionManager.createOrUpdateSession(sessionId, {
      status: "pending",
      isActive: true,
    } as any);

    const { state, saveCreds } = await useMongoAuthState(sessionId);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      syncFullHistory: false,
    });

    // Bind global store to this socket's event emitter (if available)
    if (store) {
      store.bind(sock.ev);
    }

    this.sessions[sessionId] = {
      sock,
      isConnected: false,
      lastSeen: new Date(),
    };

    sock.ev.on("connection.update", async (update: Partial<ConnectionState> & { qr?: string }) => {
      const { connection, lastDisconnect, qr } = update as any;

      if (qr) {
        try {
          const qrImage = await qrcode.toDataURL(qr);
          await sessionManager.updateQRCode(sessionId, qrImage);
          this.io?.emit("qr", { sessionId, qr: qrImage });
        } catch (err) {
          console.error("Error generating QR", err);
          await sessionManager.recordConnectionAttempt(sessionId, false, "QR generation failed");
        }
      }

      if (connection === "open") {
        this.sessions[sessionId].isConnected = true;
        this.sessions[sessionId].lastSeen = new Date();
        
        // Obtener información del dispositivo
        const phone = sock.user?.id?.split(":")[0] || null;
        const name = sock.user?.name || "Unknown";
        
        await sessionManager.updateConnectionStatus(sessionId, true, "connected", {
          phone: phone || undefined,
          name,
          platform: "whatsapp",
        });
        
        this.io?.emit("connected", { sessionId, status: true });
        
        // Preload SOLO chats individuales (no grupos) - más recientes
        await this.loadExistingChats(sessionId, sock, {
          type: "individual",
          limit: Number(process.env.PRELOAD_CHATS_LIMIT || 30),
        });
        
        // Actualizar conteo de chats
        await sessionManager.updateChatCount(sessionId);
      } else if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        const reason = (lastDisconnect?.error as any)?.message || "Connection closed";
        
        this.sessions[sessionId].isConnected = false;
        
        await sessionManager.updateConnectionStatus(sessionId, false, "disconnected");
        await sessionManager.recordConnectionAttempt(sessionId, false, reason);
        
        this.io?.emit("connected", { sessionId, status: false });

        if (shouldReconnect) {
          setTimeout(() => this.createSession(sessionId), 5000);
        } else {
          delete this.sessions[sessionId];
          await sessionManager.markAsInactive(sessionId, "Logged out");
        }
      }
    });

    sock.ev.on("messages.upsert", async (m) => {
      if (m.type === "notify") {
        for (const msg of m.messages) {
          await this.handleIncomingMessage(sessionId, msg);
        }
      }
    });

    sock.ev.on("creds.update", saveCreds);

    return sock;
  }

  /**
   * Obtener foto de perfil de un contacto y guardar en MongoDB
   */
  async getProfilePicture(sessionId: string, jid: string): Promise<string | null> {
    try {
      const session = this.sessions[sessionId];
      if (!session || !session.isConnected) {
        throw new Error("Sesión no conectada");
      }

      // Verificar si ya existe en la base de datos (cache)
      const existing = await Media.findOne({
        sessionId,
        chatId: jid,
        mediaType: "profile-pic",
      }).sort({ createdAt: -1 });

      // Si existe y tiene menos de 24 horas, retornar el existente
      if (existing && (Date.now() - existing.createdAt.getTime()) < 24 * 60 * 60 * 1000) {
        return existing.fileId;
      }

      // Intentar obtener la foto de perfil en alta calidad
      const profilePicUrl = await session.sock.profilePictureUrl(jid, "image");
      
      if (!profilePicUrl) {
        console.log(`No profile picture found for ${jid}`);
        return null;
      }

      // Descargar la imagen
      const response = await fetch(profilePicUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Generar ID único
      const fileId = `profile_${jid.replace(/[@:.]/g, "_")}_${Date.now()}`;
      
      // Guardar en MongoDB
      await Media.create({
        fileId,
        messageId: `profile_${jid}`, // ID especial para fotos de perfil
        sessionId,
        chatId: jid,
        mediaType: "profile-pic",
        filename: `${fileId}.jpg`,
        mimetype: "image/jpeg",
        size: buffer.length,
        data: buffer,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      console.log(`✅ Profile picture saved in MongoDB: ${fileId}`);
      
      return fileId;
    } catch (error) {
      console.error(`Error getting profile picture for ${jid}:`, error);
      return null;
    }
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

      // Guardar mensaje con datos de multimedia
      try {
        await Message.create({
          messageId,
          chatId: from,
          sessionId,
          from,
          to: sessionId,
          body: messageContent,
          fromMe: false,
          timestamp,
          messageType,
          status: "delivered",
          // Campos adicionales para multimedia
          mediaUrl: mediaData?.fileId, // Ahora es el fileId en MongoDB
          mediaType: mediaData?.type,
          mediaFilename: mediaData?.filename,
          mediaMimetype: mediaData?.mimetype,
          mediaSize: mediaData?.size,
          isVoiceNote: mediaData?.isVoiceNote || false,
        });
        console.log(`✅ Mensaje guardado: ${messageId}`);
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
      } catch (chatError) {
        console.error(`❌ Error guardando chat ${from}:`, chatError);
      }

      // Emitir evento Socket.IO con datos de multimedia
      this.io?.emit("message", {
        sessionId,
        from,
        text: messageContent,
        timestamp: timestamp.toISOString(),
        messageId,
        messageType,
        media: mediaData,
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

      if (store) {
        const all = store.chats.all() as any[];
        
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
   * Enviar mensaje con multimedia desde MongoDB
   */
  async sendMessage(
    sessionId: string, 
    to: string, 
    text: string, 
    options?: {
      mediaFileId?: string; // ID del archivo en MongoDB
      caption?: string;
    }
  ) {
    const session = this.sessions[sessionId];
    if (!session || !session.isConnected) throw new Error("Sesión no conectada");

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Si hay multimedia, cargar desde MongoDB y enviar
    if (options?.mediaFileId) {
      const mediaDoc = await Media.findOne({ fileId: options.mediaFileId });
      
      if (!mediaDoc) {
        throw new Error(`Media file not found: ${options.mediaFileId}`);
      }

      const buffer = mediaDoc.data;
      const mediaOptions: any = {};
      
      switch (mediaDoc.mediaType) {
        case "image":
          mediaOptions.image = buffer;
          mediaOptions.caption = options.caption || text;
          break;
        case "video":
          mediaOptions.video = buffer;
          mediaOptions.caption = options.caption || text;
          break;
        case "audio":
        case "voice":
          mediaOptions.audio = buffer;
          mediaOptions.mimetype = mediaDoc.mimetype;
          mediaOptions.ptt = mediaDoc.isVoiceNote;
          break;
        case "document":
          mediaOptions.document = buffer;
          mediaOptions.fileName = mediaDoc.originalFilename || mediaDoc.filename;
          mediaOptions.mimetype = mediaDoc.mimetype;
          break;
        case "sticker":
          mediaOptions.sticker = buffer;
          break;
      }
      
      await session.sock.sendMessage(to, mediaOptions);
    } else {
      // Enviar solo texto
      await session.sock.sendMessage(to, { text });
    }

    await Message.create({
      messageId,
      chatId: to,
      sessionId,
      from: sessionId,
      to,
      body: text,
      fromMe: true,
      timestamp: new Date(),
      status: "sent",
      mediaUrl: options?.mediaFileId || null,
    });

    // Incrementar contador de mensajes enviados
    await sessionManager.incrementMessageCount(sessionId, "sent");

    await Chat.findOneAndUpdate(
      { chatId: to, sessionId },
      { lastMessage: text, lastMessageTime: new Date(), updatedAt: new Date() },
      { upsert: true }
    );

    this.io?.emit("message-sent", { sessionId, to, text, messageId });
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