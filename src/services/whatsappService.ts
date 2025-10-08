import {
  default as makeWASocket,
  WASocket,
  DisconnectReason,
  ConnectionState,
} from "@whiskeysockets/baileys";
import P from "pino";
import qrcode from "qrcode";
import { Boom } from "@hapi/boom";
import { Session } from "../models/Session";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
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
          type: "individual", // SOLO personas, NO grupos
          limit: Number(process.env.PRELOAD_CHATS_LIMIT || 30), // Límite reducido por defecto
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

  private async handleIncomingMessage(sessionId: string, msg: any) {
    try {
      if (!msg.message || msg.key.fromMe) return;

      const messageContent =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.imageMessage?.caption ||
        "[Multimedia]";

      const from = msg.key.remoteJid;
      const messageId = msg.key.id;
      const timestamp = new Date(msg.messageTimestamp * 1000);

      console.log(`📨 Mensaje recibido de ${from} en sesión ${sessionId}`);

      // Guardar mensaje
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
          messageType: Object.keys(msg.message)[0],
          status: "delivered",
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

      // Guardar o actualizar chat
      try {
        const contactName = msg.pushName || from.split("@")[0] || "Desconocido";
        
        const chat = await Chat.findOneAndUpdate(
          { chatId: from, sessionId },
          {
            $set: {
              name: contactName,
              phone: from,
              lastMessage: messageContent,
              lastMessageTime: timestamp,
              updatedAt: new Date(),
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

      // Emitir evento Socket.IO
      this.io?.emit("message", {
        sessionId,
        from,
        text: messageContent,
        timestamp: timestamp.toISOString(),
        messageId,
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
      // Limitar a máximo 100 chats para no saturar el servidor
      const limit = Math.max(1, Math.min(100, Number(opts?.limit || 30)));

      console.log(`📱 Cargando chats individuales para sesión ${sessionId} (límite: ${limit})...`);

      if (store) {
        // Cargar solo chats individuales desde el store en memoria
        const all = store.chats.all() as any[];
        
        // Filtrar SOLO chats individuales (ignorar grupos)
        // Los chats individuales terminan en @s.whatsapp.net
        // Los grupos terminan en @g.us
        const individuals = all
          .filter((c) => {
            if (!c?.id || typeof c.id !== "string") return false;
            
            // SOLO chats individuales (personas)
            const isIndividual = c.id.endsWith("@s.whatsapp.net");
            
            // Ignorar grupos explícitamente
            const isGroup = c.id.endsWith("@g.us");
            
            return isIndividual && !isGroup;
          })
          // Ordenar por más recientes primero
          .sort((a, b) => {
            const timeA = Number(a.conversationTimestamp || 0);
            const timeB = Number(b.conversationTimestamp || 0);
            return timeB - timeA; // Más recientes primero
          })
          // Limitar cantidad
          .slice(0, limit);

        console.log(`✅ Encontrados ${individuals.length} chats individuales en store`);

        // Guardar en MongoDB
        for (const c of individuals) {
          const chatId = c.id as string;
          const name = (c.name || c.subject || chatId.split("@")[0] || "Desconocido") as string;
          const lastMessageTime = c.conversationTimestamp 
            ? new Date(Number(c.conversationTimestamp) * 1000) 
            : new Date();

          await Chat.findOneAndUpdate(
            { chatId, sessionId },
            {
              name,
              phone: chatId,
              lastMessageTime,
              unreadCount: Number(c.unreadCount || 0),
              updatedAt: new Date(),
            },
            { upsert: true, new: true }
          );
        }
      } else {
        // Fallback: cargar solo chats individuales desde MongoDB
        console.log(`📦 Cargando chats individuales desde MongoDB...`);
        
        const pipeline = [
          { 
            $match: { 
              sessionId, 
              // SOLO chats individuales (personas)
              chatId: { $regex: /@s\\.whatsapp\\.net$/ } 
            } 
          },
          { $sort: { timestamp: -1 } }, // Más recientes primero
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
          
          await Chat.findOneAndUpdate(
            { chatId, sessionId },
            {
              name,
              phone: chatId,
              lastMessage: doc.lastMessage,
              lastMessageTime: doc.lastMessageTime,
              updatedAt: new Date(),
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


  
  async sendMessage(sessionId: string, to: string, text: string) {
    const session = this.sessions[sessionId];
    if (!session || !session.isConnected) throw new Error("Sesión no conectada");

    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await session.sock.sendMessage(to, { text });

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
