import { Request, Response } from "express";
import { Chat } from "../models/Chat";
import { Assignment } from "../models/Assignment";
import { Message } from "../models/Message";
import { logAction } from "./adminController";

export const getChatsBySession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
    const type = String(req.query.type || "all").toLowerCase(); // group | individual | all

    const filter: any = { sessionId };
    // WhatsApp JIDs: groups end with '@g.us', individuals with '@s.whatsapp.net'
    if (type === "group") {
      filter.chatId = /@g\.us$/;
    } else if (type === "individual") {
      filter.chatId = /@s\.whatsapp\.net$/;
    }

    // ACL: employees solo ven chats asignados
    const authUser = (req as any).user as { sub: string; role: string } | undefined;
    if (authUser && authUser.role === "empleado") {
      const assigned = await Assignment.find({ sessionId, user: authUser.sub, active: true });
      const allowedChatIds = assigned.map((a) => a.chatId);
      // Si no tiene asignaciones, respuesta vacía directa para optimizar
      if (allowedChatIds.length === 0) {
        return res.json({ success: true, data: [], meta: { page, limit, total: 0, totalPages: 0 } });
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

    // Sincronizar lastMessageTime desde Message si está desactualizado o vacío
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
            
            // Actualizar en BD de forma asíncrona (no bloqueante)
            Chat.findByIdAndUpdate(chat._id, {
              lastMessageTime: lastMsg.timestamp,
              lastMessage: lastMsg.body || chat.lastMessage,
              updatedAt: new Date(),
            }).exec().catch(err => console.error('Error updating chat lastMessageTime:', err));
          }
        }
        
        return chatObj;
      })
    );

    res.json({
      success: true,
      data: chatsWithUpdatedTime,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    try {
      const user = (req as any).user;
      await logAction(
        user?.sub,
        "list",
        "chats",
        { sessionId: req.params.sessionId, page: req.query.page, limit: req.query.limit, type: req.query.type, error: (error as Error).message },
        false,
        (error as Error).message
      );
    } catch {}
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

/**
 * Actualizar estado de anclado (pin/unpin)
 */
export const togglePinChat = async (req: Request, res: Response) => {
  try {
    const { sessionId, chatId } = req.params;
    const { isPinned } = req.body as { isPinned: boolean };

    if (typeof isPinned !== "boolean") {
      return res.status(400).json({ success: false, error: "isPinned debe ser boolean" });
    }

    const chat = await Chat.findOneAndUpdate(
      { sessionId, chatId },
      { isPinned, updatedAt: new Date() },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat no encontrado" });
    }

    res.json({ 
      success: true, 
      message: isPinned ? "Chat anclado" : "Chat desanclado",
      data: chat 
    });
  } catch (error) {
    try {
      const user = (req as any).user;
      await logAction(
        user?.sub,
        "pin",
        "chats",
        { sessionId: req.params.sessionId, chatId: req.params.chatId, isPinned: (req.body as any)?.isPinned, error: (error as Error).message },
        false,
        (error as Error).message
      );
    } catch {}
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

/**
 * Actualizar estado de archivado (archive/unarchive)
 */
export const toggleArchiveChat = async (req: Request, res: Response) => {
  try {
    const { sessionId, chatId } = req.params;
    const { isArchived } = req.body as { isArchived: boolean };

    if (typeof isArchived !== "boolean") {
      return res.status(400).json({ success: false, error: "isArchived debe ser boolean" });
    }

    const chat = await Chat.findOneAndUpdate(
      { sessionId, chatId },
      { isArchived, updatedAt: new Date() },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat no encontrado" });
    }

    res.json({ 
      success: true, 
      message: isArchived ? "Chat archivado" : "Chat desarchivado",
      data: chat 
    });
  } catch (error) {
    try {
      const user = (req as any).user;
      await logAction(
        user?.sub,
        "archive",
        "chats",
        { sessionId: req.params.sessionId, chatId: req.params.chatId, isArchived: (req.body as any)?.isArchived, error: (error as Error).message },
        false,
        (error as Error).message
      );
    } catch {}
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

/**
 * Marcar chat como leído (resetear unreadCount)
 */
export const markChatAsRead = async (req: Request, res: Response) => {
  try {
    const { sessionId, chatId } = req.params;

    const chat = await Chat.findOneAndUpdate(
      { sessionId, chatId },
      { unreadCount: 0, updatedAt: new Date() },
      { new: true }
    );

    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat no encontrado" });
    }

    res.json({ 
      success: true, 
      message: "Chat marcado como leído",
      data: chat 
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};
