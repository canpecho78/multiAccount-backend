import { Server } from "socket.io";
import { whatsappService } from "../services/whatsappService";
import { Session } from "../models/Session";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
import { Assignment } from "../models/Assignment";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export function registerSocketHandlers(io: Server) {
  io.use((socket, next) => {
    try {
      const token = (socket.handshake.auth as any)?.token || (socket.handshake.headers["authorization"] as string | undefined);
      let raw = token || "";
      if (raw.startsWith("Bearer ")) raw = raw.slice(7);
      if (!raw) return next(new Error("Unauthorized"));
      const decoded = jwt.verify(raw, env.jwtSecret) as { sub: string; role: string };
      (socket.data as any).user = decoded;
      return next();
    } catch (e) {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    console.log("📡 Cliente conectado:", socket.id, "user:", (socket.data as any)?.user?.sub);

    socket.on("create-session", async (data: any) => {
      try {
        let sessionId: string;
        let name = "";
        let phone = "";

        if (typeof data === "string") {
          sessionId = data;
        } else if (typeof data === "object") {
          sessionId = data.sessionId;
          name = data.name || "";
          phone = data.phone || "";
        } else {
          return;
        }

        await Session.findOneAndUpdate(
          { sessionId },
          { sessionId, name: name || `Sesión ${sessionId}`, phone: phone || "Desconocido", isConnected: false, updatedAt: new Date() },
          { upsert: true, new: true }
        );

        if (!whatsappService.getSession(sessionId)) {
          await whatsappService.createSession(sessionId);
        }
      } catch (error) {
        console.error("❌ Error creando sesión:", error);
      }
    });

    socket.on("send-message", async (data: { sessionId: string; to: string; text: string }) => {
      try {
        const { sessionId, to, text } = data;
        const authUser = (socket.data as any).user as { sub: string; role: string };
        if (authUser?.role === "empleado") {
          const assigned = await Assignment.findOne({ sessionId, chatId: to, user: authUser.sub, active: true });
          if (!assigned) throw new Error("No autorizado a enviar a este chat");
        }
        await whatsappService.sendMessage(sessionId, to, text);
      } catch (error) {
        console.error("❌ Error enviando mensaje:", error);
        socket.emit("message-error", { error: error instanceof Error ? error.message : String(error) });
      }
    });

    socket.on("get-sessions", async () => {
      try {
        const dbSessions = await Session.find({});
        const memory = whatsappService.getAllSessions();
        const sessionsWithStatus = dbSessions.map((session) => ({
          ...session.toObject(),
          isConnected: memory[session.sessionId]?.isConnected || false,
          lastSeen: memory[session.sessionId]?.lastSeen || session.lastActivity,
        }));
        socket.emit("sessions-list", sessionsWithStatus);
      } catch (error) {
        console.error("❌ Error obteniendo sesiones:", error);
      }
    });

    // Backward compatible: accepts string sessionId OR object { sessionId, page?, limit?, type? }
    socket.on(
      "get-chats",
      async (
        payload:
          | string
          | { sessionId: string; page?: number; limit?: number; type?: string }
      ) => {
        try {
          let sessionId: string;
          let page = 1;
          let limit = 20;
          let type = "all"; // group | individual | all

          if (typeof payload === "string") {
            sessionId = payload;
          } else if (typeof payload === "object" && payload) {
            sessionId = payload.sessionId;
            page = Math.max(1, Number(payload.page ?? 1));
            limit = Math.max(1, Math.min(100, Number(payload.limit ?? 20)));
            type = String(payload.type ?? "all").toLowerCase();
          } else {
            return;
          }

          const filter: any = { sessionId };
          // WhatsApp JIDs: groups end with '@g.us', individuals with '@s.whatsapp.net'
          if (type === "group") {
            filter.chatId = /@g\.us$/;
          } else if (type === "individual") {
            filter.chatId = /@s\.whatsapp\.net$/;
          }

          // ACL for empleado: only assigned chats
          const authUser = (socket.data as any).user as { sub: string; role: string };
          if (authUser?.role === "empleado") {
            const assigned = await Assignment.find({ sessionId, user: authUser.sub, active: true });
            const allowedChatIds = assigned.map((a) => a.chatId);
            if (allowedChatIds.length === 0) {
              return socket.emit("chats-list", { sessionId, chats: [], meta: { page, limit, total: 0, totalPages: 0 } });
            }
            filter.chatId = filter.chatId
              ? { $and: [{ $regex: filter.chatId }, { $in: allowedChatIds }] }
              : { $in: allowedChatIds };
          }

          const total = await Chat.countDocuments(filter);
          const chats = await Chat.find(filter)
            .sort({ isPinned: -1, lastMessageTime: -1 }) // Primero anclados, luego por fecha
            .skip((page - 1) * limit)
            .limit(limit);

          // Sincronizar lastMessageTime desde Message si está desactualizado
          const chatsWithUpdatedTime = await Promise.all(
            chats.map(async (chat) => {
              const chatObj = chat.toObject();
              
              // Buscar el último mensaje real de este chat
              const lastMsg = await Message.findOne({ 
                sessionId: chat.sessionId, 
                chatId: chat.chatId 
              })
                .sort({ timestamp: -1 })
                .select('body timestamp')
                .lean();

              if (lastMsg) {
                // Si el mensaje más reciente es diferente al guardado, actualizar
                if (!chat.lastMessageTime || lastMsg.timestamp > chat.lastMessageTime) {
                  chatObj.lastMessageTime = lastMsg.timestamp;
                  chatObj.lastMessage = lastMsg.body || chatObj.lastMessage;
                  
                  // Actualizar en BD de forma asíncrona
                  Chat.findByIdAndUpdate(chat._id, {
                    lastMessageTime: lastMsg.timestamp,
                    lastMessage: lastMsg.body || chat.lastMessage,
                    updatedAt: new Date(),
                  }).exec().catch(err => console.error('Error updating chat:', err));
                }
              }
              
              return chatObj;
            })
          );

          socket.emit("chats-list", {
            sessionId,
            chats: chatsWithUpdatedTime,
            meta: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          });
        } catch (error) {
          console.error("❌ Error obteniendo chats:", error);
        }
      }
    );

    socket.on(
      "get-messages",
      async (data: { sessionId: string; chatId: string; page?: number; limit?: number }) => {
        try {
          const sessionId = data.sessionId;
          const chatId = data.chatId;
          const page = Math.max(1, Number(data.page ?? 1));
          const limit = Math.max(1, Math.min(200, Number(data.limit ?? 50)));

          // ACL for empleado: must be assigned to chat
          const authUser = (socket.data as any).user as { sub: string; role: string };
          if (authUser?.role === "empleado") {
            const assigned = await Assignment.findOne({ sessionId, chatId, user: authUser.sub, active: true });
            if (!assigned) throw new Error("No autorizado a este chat");
          }

          const filter = { sessionId, chatId };
          const total = await Message.countDocuments(filter);
          const docs = await Message.find(filter)
            .sort({ timestamp: -1 })
            .skip((page - 1) * limit)
            .limit(limit);

          // Mapear mensajes con todos los campos de multimedia
          const messages = docs.reverse().map((msg) => ({
            messageId: msg.messageId,
            chatId: msg.chatId,
            sessionId: msg.sessionId,
            from: msg.from,
            to: msg.to,
            body: msg.body,
            fromMe: msg.fromMe,
            timestamp: msg.timestamp,
            messageType: msg.messageType || 'text',
            status: msg.status || 'delivered',
            // Campos de multimedia
            mediaUrl: msg.mediaUrl || undefined,
            mediaType: msg.mediaType || undefined,
            mediaFilename: msg.mediaFilename || undefined,
            mediaMimetype: msg.mediaMimetype || undefined,
            mediaSize: msg.mediaSize || undefined,
            isVoiceNote: msg.isVoiceNote || false,
          }));

          socket.emit("messages-list", {
            sessionId,
            chatId,
            messages,
            meta: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          });
        } catch (error) {
          console.error("❌ Error obteniendo mensajes:", error);
        }
      }
    );

    socket.on("disconnect-session", async (sessionId: string) => {
      try {
        await whatsappService.disconnectSession(sessionId);
        console.log(`🔌 Sesión desconectada: ${sessionId}`);
      } catch (error) {
        console.error("❌ Error desconectando sesión:", error);
      }
    });

    // Anclar/desanclar chat
    socket.on("pin-chat", async (data: { sessionId: string; chatId: string; isPinned: boolean }) => {
      try {
        const { sessionId, chatId, isPinned } = data;
        
        const chat = await Chat.findOneAndUpdate(
          { sessionId, chatId },
          { isPinned, updatedAt: new Date() },
          { new: true }
        );

        if (!chat) {
          return socket.emit("chat-error", { error: "Chat no encontrado" });
        }

        // Emitir a todos los clientes conectados
        io.emit("chat-updated", {
          sessionId,
          chatId,
          action: "pin",
          chat: chat.toObject(),
        });

        socket.emit("chat-pin-success", { 
          message: isPinned ? "Chat anclado" : "Chat desanclado",
          chat: chat.toObject() 
        });
      } catch (error) {
        console.error("❌ Error anclando chat:", error);
        socket.emit("chat-error", { error: (error as Error).message });
      }
    });

    // Archivar/desarchivar chat
    socket.on("archive-chat", async (data: { sessionId: string; chatId: string; isArchived: boolean }) => {
      try {
        const { sessionId, chatId, isArchived } = data;
        
        const chat = await Chat.findOneAndUpdate(
          { sessionId, chatId },
          { isArchived, updatedAt: new Date() },
          { new: true }
        );

        if (!chat) {
          return socket.emit("chat-error", { error: "Chat no encontrado" });
        }

        // Emitir a todos los clientes conectados
        io.emit("chat-updated", {
          sessionId,
          chatId,
          action: "archive",
          chat: chat.toObject(),
        });

        socket.emit("chat-archive-success", { 
          message: isArchived ? "Chat archivado" : "Chat desarchivado",
          chat: chat.toObject() 
        });
      } catch (error) {
        console.error("❌ Error archivando chat:", error);
        socket.emit("chat-error", { error: (error as Error).message });
      }
    });

    // Marcar chat como leído
    socket.on("mark-chat-read", async (data: { sessionId: string; chatId: string }) => {
      try {
        const { sessionId, chatId } = data;
        
        const chat = await Chat.findOneAndUpdate(
          { sessionId, chatId },
          { unreadCount: 0, updatedAt: new Date() },
          { new: true }
        );

        if (!chat) {
          return socket.emit("chat-error", { error: "Chat no encontrado" });
        }

        // Emitir a todos los clientes conectados
        io.emit("chat-updated", {
          sessionId,
          chatId,
          action: "read",
          chat: chat.toObject(),
        });

        socket.emit("chat-read-success", { 
          message: "Chat marcado como leído",
          chat: chat.toObject() 
        });
      } catch (error) {
        console.error("❌ Error marcando chat como leído:", error);
        socket.emit("chat-error", { error: (error as Error).message });
      }
    });
  });
}
