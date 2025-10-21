import { Request, Response } from "express";
import { Message } from "../models/Message";
import { whatsappService } from "../services/whatsappService";
import { Assignment } from "../models/Assignment";
import { logAction } from "./adminController";

export const getMessagesByChat = async (req: Request, res: Response) => {
  try {
    const { sessionId, chatId } = req.params;
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(200, Number(req.query.limit || 50)));

    // ACL: if role is empleado, ensure chat assigned
    const authUser = (req as any).user as { sub: string; role: string } | undefined;
    if (authUser && authUser.role === "empleado") {
      const assigned = await Assignment.findOne({ sessionId, chatId, user: authUser.sub, active: true });
      if (!assigned) return res.status(403).json({ success: false, error: "No autorizado a este chat" });
    }

    const filter = { sessionId, chatId };
    const total = await Message.countDocuments(filter);
    const docs = await Message.find(filter)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const data = docs.reverse(); // keep ascending chronological order for UI

    res.json({
      success: true,
      data,
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
        "messages",
        {
          sessionId: req.params.sessionId,
          chatId: req.params.chatId,
          page: req.query.page,
          limit: req.query.limit,
          error: (error as Error).message,
        },
        false,
        (error as Error).message
      );
    } catch {}
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { to, text } = req.body as { to: string; text: string };

    if (!to || !text) return res.status(400).json({ success: false, error: "to y text son requeridos" });

    // ACL: if role is empleado, ensure chat assigned (chatId == to)
    const authUser = (req as any).user as { sub: string; role: string } | undefined;
    if (authUser && authUser.role === "empleado") {
      const assigned = await Assignment.findOne({ sessionId, chatId: to, user: authUser.sub, active: true });
      if (!assigned) return res.status(403).json({ success: false, error: "No autorizado a enviar a este chat" });
    }

    await whatsappService.sendMessage(sessionId, to, text);
    res.json({ success: true });
  } catch (error) {
    const msg = (error as Error).message || "Error";
    try {
      const user = (req as any).user;
      await logAction(
        user?.sub,
        "send",
        "messages",
        { sessionId: req.params.sessionId, to: (req.body as any)?.to, error: msg },
        false,
        msg
      );
    } catch {}
    // Si es error de validación (ej: destino no permitido), responder 400
    if (msg.includes('Solo se permite enviar mensajes a contactos individuales')) {
      return res.status(400).json({ success: false, error: msg });
    }
    res.status(500).json({ success: false, error: msg });
  }
};
