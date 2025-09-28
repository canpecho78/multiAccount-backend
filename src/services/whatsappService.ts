import {
  default as makeWASocket,
  useMultiFileAuthState,
  WASocket,
  DisconnectReason,
  ConnectionState,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode";
import { Boom } from "@hapi/boom";
import { Session } from "../models/Session";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
import { Server as IOServer } from "socket.io";
import { env } from "../config/env";
import { useMongoAuthState } from "./mongoAuthState";

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
    const { state, saveCreds } =
      env.authStorage === "mongo"
        ? await useMongoAuthState(sessionId)
        : await useMultiFileAuthState(`${env.authBasePath}/${sessionId}`);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      syncFullHistory: false,
    });

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
          await Session.findOneAndUpdate(
            { sessionId },
            { qrCode: qrImage, isConnected: false, updatedAt: new Date() },
            { upsert: true, new: true }
          );
          this.io?.emit("qr", { sessionId, qr: qrImage });
        } catch (err) {
          console.error("Error generating QR", err);
        }
      }

      if (connection === "open") {
        this.sessions[sessionId].isConnected = true;
        this.sessions[sessionId].lastSeen = new Date();
        await Session.findOneAndUpdate(
          { sessionId },
          { isConnected: true, lastActivity: new Date(), qrCode: null, updatedAt: new Date() },
          { upsert: true }
        );
        this.io?.emit("connected", { sessionId, status: true });
        // Preload a limited set of chats after connection opens
        await this.loadExistingChats(sessionId, sock, {
          type: (process.env.PRELOAD_CHATS_TYPE as any) || "all",
          limit: Number(process.env.PRELOAD_CHATS_LIMIT || 50),
        });
      } else if (connection === "close") {
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        this.sessions[sessionId].isConnected = false;
        await Session.findOneAndUpdate({ sessionId }, { isConnected: false, updatedAt: new Date() });
        this.io?.emit("connected", { sessionId, status: false });

        if (shouldReconnect) {
          setTimeout(() => this.createSession(sessionId), 5000);
        } else {
          delete this.sessions[sessionId];
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

      let chat = await Chat.findOne({ chatId: from, sessionId });

      if (!chat) {
        const contactName = msg.pushName || from.split("@")[0] || "Desconocido";
        chat = await Chat.create({
          chatId: from,
          sessionId,
          name: contactName,
          phone: from,
          lastMessageTime: timestamp,
          unreadCount: 1,
        });
      } else {
        chat.lastMessage = messageContent;
        chat.lastMessageTime = timestamp;
        chat.unreadCount += 1;
        chat.updatedAt = new Date();
        await chat.save();
      }

      this.io?.emit("message", {
        sessionId,
        from,
        text: messageContent,
        timestamp: timestamp.toISOString(),
        messageId,
      });
    } catch (error) {
      console.error("Error handling incoming message:", error);
    }
  }

  private async loadExistingChats(
    sessionId: string,
    sock: WASocket,
    opts?: { type?: "group" | "individual" | "all"; limit?: number }
  ) {
    try {
      const type = (opts?.type || "all").toLowerCase() as "group" | "individual" | "all";
      const limit = Math.max(1, Math.min(500, Number(opts?.limit || 50)));

      if (type === "group" || type === "all") {
        const groups = await sock.groupFetchAllParticipating();
        const recentGroups = Object.values(groups as any).slice(0, limit);

        for (const chat of recentGroups) {
          const chatId = (chat as any).id as string;
          const name = (chat as any).subject || chatId.split("@")[0] || "Desconocido";

          await Chat.findOneAndUpdate(
            { chatId, sessionId },
            { name, phone: chatId, unreadCount: 0, updatedAt: new Date() },
            { upsert: true, new: true }
          );
        }
      }
      // Preload individual chats from recent messages in MongoDB
      if (type === "individual" || type === "all") {
        const pipeline = [
          { $match: { sessionId, chatId: { $regex: /@s\\.whatsapp\\.net$/ } } },
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
        for (const doc of recentIndividuals as any[]) {
          const chatId = doc._id as string; // @s.whatsapp.net
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
    } catch (error) {
      console.error("Error loading existing chats:", error);
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
    await Session.findOneAndUpdate({ sessionId }, { isConnected: false, updatedAt: new Date() });
  }
}

export const whatsappService = new WhatsAppService();
