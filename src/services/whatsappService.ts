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
        await this.loadExistingChats(sessionId, sock);
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
          lastMessage: messageContent,
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

  private async loadExistingChats(sessionId: string, sock: WASocket) {
    try {
      const groups = await sock.groupFetchAllParticipating();
      const recentChats = Object.values(groups as any);

      for (const chat of recentChats) {
        const chatId = (chat as any).id;
        const name = (chat as any).subject || chatId.split("@")[0] || "Desconocido";

        await Chat.findOneAndUpdate(
          { chatId, sessionId },
          { name, phone: chatId, unreadCount: 0, updatedAt: new Date() },
          { upsert: true, new: true }
        );
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
