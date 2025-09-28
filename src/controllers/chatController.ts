import { Request, Response } from "express";
import { Chat } from "../models/Chat";
import { Assignment } from "../models/Assignment";

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
      .sort({ lastMessageTime: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      data: chats,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};
