import dotenv from "dotenv";
import express, { Request, Response } from "express";
import {
  default as makeWASocket,
  useMultiFileAuthState,
  WASocket,
  DisconnectReason,
  ConnectionState,
} from "@whiskeysockets/baileys";
import http from "http";
import { Server } from "socket.io";
import qrcode from "qrcode";
import mongoose from "mongoose";
import { Boom } from "@hapi/boom";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

app.use(express.json());

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://multitaskingryl:Intruso4123@cluster0.9qejt.mongodb.net/Anka?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGODB_URI)
  .then(() => console.log("✅ MongoDB conectado"))
  .catch((error) => console.error("❌ Error conectando MongoDB:", error));

// MongoDB Schemas
const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  isConnected: { type: Boolean, default: false },
  lastActivity: { type: Date, default: Date.now },
  qrCode: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const ChatSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  sessionId: { type: String, required: true },
  name: { type: String, default: "Desconocido" },
  phone: { type: String, required: true },
  lastMessage: { type: String, default: "" },
  lastMessageTime: { type: Date, default: Date.now },
  unreadCount: { type: Number, default: 0 },
  isArchived: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const MessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true },
  chatId: { type: String, required: true },
  sessionId: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  body: { type: String, required: true },
  fromMe: { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now },
  messageType: { type: String, default: "conversation" },
  status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
  createdAt: { type: Date, default: Date.now }
});

const ConnectionLogSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  connectionState: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  reason: { type: String, default: null },
  qrGenerated: { type: Boolean, default: false }
});

// Models
const Session = mongoose.model("Session", SessionSchema);
const Chat = mongoose.model("Chat", ChatSchema);
const Message = mongoose.model("Message", MessageSchema);
const ConnectionLog = mongoose.model("ConnectionLog", ConnectionLogSchema);

// Sesiones activas en memoria
interface SessionData {
  sock: WASocket;
  isConnected: boolean;
  lastSeen: Date;
}

const sessions: Record<string, SessionData> = {};

// Crear nueva sesión de WhatsApp
async function createSession(sessionId: string) {
  try {
    console.log(`🚀 Iniciando sesión: ${sessionId}`);

    // Verificar si la sesión ya existe en la base de datos
    let dbSession = await Session.findOne({ sessionId });
    
    const { state, saveCreds } = await useMultiFileAuthState(`auth_info/${sessionId}`);

    const sock = makeWASocket({
      auth: state,
      printQRInTerminal: false, // Deshabilitamos el QR en terminal para solo manejarlo en la DB
      connectTimeoutMs: 60000,
      defaultQueryTimeoutMs: 0,
      keepAliveIntervalMs: 10000,
      emitOwnEvents: true,
      syncFullHistory: false,
    });

    sessions[sessionId] = { 
      sock, 
      isConnected: false, 
      lastSeen: new Date() 
    };

    sock.ev.on("connection.update", async (update: Partial<ConnectionState>) => {
      const { connection, lastDisconnect, qr } = update;

      console.log(`📊 Estado de conexión para ${sessionId}:`, connection);

      // Log de conexión
      await ConnectionLog.create({
        sessionId,
        connectionState: connection || "unknown",
        reason: lastDisconnect?.error?.message || null,
        qrGenerated: !!qr
      });

      if (qr) {
        try {
          const qrImage = await qrcode.toDataURL(qr);
          console.log(`📱 QR generado para sesión: ${sessionId}`);
          
          // Guardar QR en base de datos
          await Session.findOneAndUpdate(
            { sessionId },
            { 
              qrCode: qrImage, 
              isConnected: false, 
              updatedAt: new Date() 
            },
            { upsert: true, new: true }
          );

          // Emitir QR a clientes conectados
          io.emit("qr", { sessionId, qr: qrImage });
        } catch (qrError) {
          console.error("❌ Error generando QR:", qrError);
        }
      }

      if (connection === "open") {
        console.log(`✅ Sesión conectada: ${sessionId}`);
        sessions[sessionId].isConnected = true;
        sessions[sessionId].lastSeen = new Date();

        // Actualizar estado en base de datos
        await Session.findOneAndUpdate(
          { sessionId },
          { 
            isConnected: true, 
            lastActivity: new Date(), 
            qrCode: null, // Limpiar QR cuando se conecta
            updatedAt: new Date() 
          },
          { upsert: true }
        );

        // Emitir conexión exitosa
        io.emit("connected", { sessionId, status: true });

        // Cargar chats existentes
        await loadExistingChats(sessionId, sock);

      } else if (connection === "close") {
        console.log(`❌ Sesión desconectada: ${sessionId}`);
        
        const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
        
        sessions[sessionId].isConnected = false;
        
        // Actualizar estado en base de datos
        await Session.findOneAndUpdate(
          { sessionId },
          { 
            isConnected: false, 
            lastActivity: new Date(),
            updatedAt: new Date() 
          }
        );

        // Emitir desconexión
        io.emit("connected", { sessionId, status: false });

        if (shouldReconnect) {
          console.log(`🔄 Reintentando conexión para: ${sessionId}`);
          setTimeout(() => createSession(sessionId), 5000);
        } else {
          // Si fue logout, eliminar archivos de auth
          console.log(`🗑️ Sesión cerrada permanentemente: ${sessionId}`);
          delete sessions[sessionId];
        }
      }
    });

    // Mensajes entrantes
    sock.ev.on("messages.upsert", async (m) => {
      if (m.type === "notify") {
        for (const msg of m.messages) {
          await handleIncomingMessage(sessionId, msg);
        }
      }
    });

    // Actualización de credenciales
    sock.ev.on("creds.update", saveCreds);

    return sock;
  } catch (error) {
    console.error(`❌ Error creando sesión ${sessionId}:`, error);
    throw error;
  }
}

// Manejar mensajes entrantes
async function handleIncomingMessage(sessionId: string, msg: any) {
  try {
    if (!msg.message || msg.key.fromMe) return;

    const messageContent = msg.message.conversation || 
                          msg.message.extendedTextMessage?.text || 
                          msg.message.imageMessage?.caption || 
                          "[Multimedia]";

    const from = msg.key.remoteJid;
    const messageId = msg.key.id;
    const timestamp = new Date(msg.messageTimestamp * 1000);

    console.log(`📨 Mensaje recibido en ${sessionId} de ${from}: ${messageContent}`);

    // Guardar mensaje en base de datos
    const newMessage = await Message.create({
      messageId,
      chatId: from,
      sessionId,
      from,
      to: sessionId,
      body: messageContent,
      fromMe: false,
      timestamp,
      messageType: Object.keys(msg.message)[0],
      status: "delivered"
    });

    // Actualizar o crear chat
    let chat = await Chat.findOne({ chatId: from, sessionId });
    
    if (!chat) {
      // Crear nuevo chat
      const contactName = msg.pushName || from.split("@")[0] || "Desconocido";
      chat = await Chat.create({
        chatId: from,
        sessionId,
        name: contactName,
        phone: from,
        lastMessage: messageContent,
        lastMessageTime: timestamp,
        unreadCount: 1
      });
    } else {
      // Actualizar chat existente
      chat.lastMessage = messageContent;
      chat.lastMessageTime = timestamp;
      chat.unreadCount += 1;
      chat.updatedAt = new Date();
      await chat.save();
    }

    // Emitir mensaje a clientes conectados
    io.emit("message", {
      sessionId,
      from,
      text: messageContent,
      timestamp: timestamp.toISOString(),
      messageId
    });

  } catch (error) {
    console.error("❌ Error manejando mensaje entrante:", error);
  }
}

// Cargar chats existentes
async function loadExistingChats(sessionId: string, sock: WASocket) {
  try {
    // Baileys no expone 'chats' directamente; puedes obtener los chats recientes usando groupFetchAllParticipating para grupos
    // y fetchMessagesFromJid para chats individuales si tienes los JIDs.
    // Aquí solo se muestra cómo cargar grupos como ejemplo.

    const groups = await sock.groupFetchAllParticipating();
    const recentChats = Object.values(groups);

    console.log(`📂 Cargando ${recentChats.length} grupos para sesión: ${sessionId}`);

    for (const chat of recentChats) {
      const chatId = chat.id;
      const name = chat.subject || chatId.split("@")[0] || "Desconocido";

      await Chat.findOneAndUpdate(
        { chatId, sessionId },
        {
          name,
          phone: chatId,
          unreadCount: 0,
          updatedAt: new Date()
        },
        { upsert: true, new: true }
      );
    }
  } catch (error) {
    console.error("❌ Error cargando chats existentes:", error);
  }
}

// Inicializar sesiones existentes al arrancar el servidor
async function initializeExistingSessions() {
  try {
    const existingSessions = await Session.find({});
    console.log(`🔄 Inicializando ${existingSessions.length} sesiones existentes`);

    for (const session of existingSessions) {
      try {
        await createSession(session.sessionId);
        console.log(`✅ Sesión ${session.sessionId} reinicializada`);
      } catch (error) {
        console.error(`❌ Error reinicializando sesión ${session.sessionId}:`, error);
      }
    }
  } catch (error) {
    console.error("❌ Error inicializando sesiones existentes:", error);
  }
}

// WebSocket eventos
io.on("connection", (socket) => {
  console.log("📡 Cliente conectado:", socket.id);

  // Crear nueva sesión
  socket.on("create-session", async (data: any) => {
    try {
      let sessionId: string;
      let name: string = "";
      let phone: string = "";

      if (typeof data === "string") {
        sessionId = data;
      } else if (typeof data === "object") {
        sessionId = data.sessionId;
        name = data.name || "";
        phone = data.phone || "";
      } else {
        console.error("❌ Formato de datos inválido para create-session");
        return;
      }

      if (!sessions[sessionId]) {
        // Crear/actualizar sesión en base de datos
        await Session.findOneAndUpdate(
          { sessionId },
          { 
            sessionId, 
            name: name || `Sesión ${sessionId}`, 
            phone: phone || "Desconocido",
            isConnected: false,
            updatedAt: new Date()
          },
          { upsert: true, new: true }
        );

        await createSession(sessionId);
        console.log(`🚀 Nueva sesión creada: ${sessionId}`);
      } else {
        console.log(`ℹ️ Sesión ya existe: ${sessionId}`);
      }
    } catch (error) {
      console.error("❌ Error creando sesión:", error);
    }
  });

  // Enviar mensaje
  socket.on("send-message", async (data: { sessionId: string; to: string; text: string }) => {
    try {
      const { sessionId, to, text } = data;
      const session = sessions[sessionId];
      
      if (session && session.isConnected) {
        const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await session.sock.sendMessage(to, { text });

        // Guardar mensaje enviado en base de datos
        await Message.create({
          messageId,
          chatId: to,
          sessionId,
          from: sessionId,
          to,
          body: text,
          fromMe: true,
          timestamp: new Date(),
          status: "sent"
        });

        // Actualizar chat
        await Chat.findOneAndUpdate(
          { chatId: to, sessionId },
          {
            lastMessage: text,
            lastMessageTime: new Date(),
            updatedAt: new Date()
          },
          { upsert: true }
        );

        console.log(`✅ Mensaje enviado desde ${sessionId} → ${to}`);
        
        // Confirmar envío al cliente
        socket.emit("message-sent", { sessionId, to, text, messageId });
      } else {
        console.error(`❌ Sesión no conectada: ${sessionId}`);
        socket.emit("message-error", { sessionId, error: "Sesión no conectada" });
      }
    } catch (error) {
      console.error("❌ Error enviando mensaje:", error);
      socket.emit("message-error", { error: (error instanceof Error ? error.message : String(error)) });
    }
  });

  // Obtener sesiones
  socket.on("get-sessions", async () => {
    try {
      const dbSessions = await Session.find({});
      const sessionsWithStatus = dbSessions.map(session => ({
        ...session.toObject(),
        isConnected: sessions[session.sessionId]?.isConnected || false,
        lastSeen: sessions[session.sessionId]?.lastSeen || session.lastActivity
      }));
      
      socket.emit("sessions-list", sessionsWithStatus);
    } catch (error) {
      console.error("❌ Error obteniendo sesiones:", error);
    }
  });

  // Obtener chats de una sesión
  socket.on("get-chats", async (sessionId: string) => {
    try {
      const chats = await Chat.find({ sessionId }).sort({ lastMessageTime: -1 });
      socket.emit("chats-list", { sessionId, chats });
    } catch (error) {
      console.error("❌ Error obteniendo chats:", error);
    }
  });

  // Obtener mensajes de un chat
  socket.on("get-messages", async (data: { sessionId: string; chatId: string; limit?: number }) => {
    try {
      const { sessionId, chatId, limit = 50 } = data;
      const messages = await Message.find({ sessionId, chatId })
        .sort({ timestamp: -1 })
        .limit(limit);
      
      socket.emit("messages-list", { sessionId, chatId, messages: messages.reverse() });
    } catch (error) {
      console.error("❌ Error obteniendo mensajes:", error);
    }
  });

  // Desconectar sesión
  socket.on("disconnect-session", async (sessionId: string) => {
    try {
      if (sessions[sessionId]) {
        await sessions[sessionId].sock.logout();
        delete sessions[sessionId];
        
        await Session.findOneAndUpdate(
          { sessionId },
          { isConnected: false, updatedAt: new Date() }
        );
        
        console.log(`🔌 Sesión desconectada: ${sessionId}`);
      }
    } catch (error) {
      console.error("❌ Error desconectando sesión:", error);
    }
  });
});

// Endpoints REST API
app.get("/", (req: Request, res: Response) => {
  res.json({
    message: "🚀 API WhatsApp Multi-sesiones con MongoDB",
    status: "running",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    activeSessions: Object.keys(sessions).length
  });
});

// Obtener todas las sesiones
app.get("/api/sessions", async (req: Request, res: Response) => {
  try {
    const dbSessions = await Session.find({});
    const sessionsWithStatus = dbSessions.map(session => ({
      ...session.toObject(),
      isConnected: sessions[session.sessionId]?.isConnected || false,
      lastSeen: sessions[session.sessionId]?.lastSeen || session.lastActivity
    }));
    
    res.json({ success: true, data: sessionsWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Obtener chats de una sesión
app.get("/api/sessions/:sessionId/chats", async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const chats = await Chat.find({ sessionId }).sort({ lastMessageTime: -1 });
    res.json({ success: true, data: chats });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Obtener mensajes de un chat
app.get("/api/sessions/:sessionId/chats/:chatId/messages", async (req: Request, res: Response) => {
  try {
    const { sessionId, chatId } = req.params;
    const { limit = 50 } = req.query;
    
    const messages = await Message.find({ sessionId, chatId })
      .sort({ timestamp: -1 })
      .limit(Number(limit));
    
    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// Limpiar sesiones desconectadas (ejecutar periódicamente)
setInterval(async () => {
  try {
    const inactiveSessions = Object.entries(sessions).filter(([_, data]) => {
      const timeDiff = new Date().getTime() - data.lastSeen.getTime();
      return timeDiff > 5 * 60 * 1000; // 5 minutos sin actividad
    });

    for (const [sessionId, _] of inactiveSessions) {
      console.log(`🧹 Limpiando sesión inactiva: ${sessionId}`);
      delete sessions[sessionId];
    }
  } catch (error) {
    console.error("❌ Error limpiando sesiones inactivas:", error);
  }
}, 5 * 60 * 1000); // Cada 5 minutos

// Inicializar servidor
server.listen(5000, async () => {
  console.log("✅ Backend corriendo en http://localhost:5000");
  
  // Inicializar sesiones existentes después de un pequeño delay
  setTimeout(initializeExistingSessions, 2000);
});