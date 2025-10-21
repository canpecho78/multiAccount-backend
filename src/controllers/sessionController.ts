import { Request, Response } from "express";
import { Session } from "../models/Session";
import { whatsappService } from "../services/whatsappService";
import { sessionManager } from "../services/sessionManager";
import { logAction } from "./adminController";

export const getSessions = async (req: Request, res: Response) => {
  try {
    const dbSessions = await Session.find({});
    const memory = whatsappService.getAllSessions();

    const sessionsWithStatus = dbSessions.map((session) => ({
      ...session.toObject(),
      isConnected: memory[session.sessionId]?.isConnected || false,
      lastSeen: memory[session.sessionId]?.lastSeen || session.lastActivity,
    }));

    res.json({ success: true, data: sessionsWithStatus });
  } catch (error) {
    try {
      const user = (req as any).user;
      await logAction(
        user?.sub,
        "list",
        "sessions",
        { error: (error as Error).message },
        false,
        (error as Error).message
      );
    } catch {}
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const createSession = async (req: Request, res: Response) => {
  try {
    const { sessionId, name = "", phone = "" } = req.body;

    if (!sessionId) return res.status(400).json({ success: false, error: "sessionId requerido" });

    await Session.findOneAndUpdate(
      { sessionId },
      {
        sessionId,
        name: name || `Sesión ${sessionId}`,
        phone: phone || "Desconocido",
        isConnected: false,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    if (!whatsappService.getSession(sessionId)) {
      await whatsappService.createSession(sessionId);
    }

    res.json({ success: true, message: "Sesión iniciada" });
  } catch (error) {
    try {
      const user = (req as any).user;
      await logAction(
        user?.sub,
        "create",
        "sessions",
        { sessionId: (req.body as any)?.sessionId, name: (req.body as any)?.name, phone: (req.body as any)?.phone, error: (error as Error).message },
        false,
        (error as Error).message
      );
    } catch {}
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const disconnectSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    // Verificar que la sesión existe
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, error: "Sesión no encontrada" });
    }

    // Desconectar en memoria si estaba conectada
    if (whatsappService.getSession(sessionId)) {
      await whatsappService.disconnectSession(sessionId);
    }

    // Deshabilitar (no borrar) en base de datos
    await Session.findOneAndUpdate(
      { sessionId },
      {
        isActive: false,
        isConnected: false,
        status: "inactive",
        lastDisconnectReason: "Disconnected by user",
        updatedAt: new Date(),
      }
    );

    res.json({ success: true, message: "Sesión desconectada y deshabilitada" });
  } catch (error) {
    try {
      const user = (req as any).user;
      await logAction(
        user?.sub,
        "disconnect",
        "sessions",
        { sessionId: req.params.sessionId, error: (error as Error).message },
        false,
        (error as Error).message
      );
    } catch {}
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const deleteSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    // Verificar que la sesión existe
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ success: false, error: "Sesión no encontrada" });
    }

    // Desconectar la sesión de WhatsApp si está activa
    if (whatsappService.getSession(sessionId)) {
      await whatsappService.disconnectSession(sessionId);
    }

    // Eliminar sesión completamente de la base de datos
    await sessionManager.deleteSession(sessionId);

    res.json({ success: true, message: "Sesión eliminada completamente" });
  } catch (error) {
    try {
      const user = (req as any).user;
      await logAction(
        user?.sub,
        "delete",
        "sessions",
        { sessionId: req.params.sessionId, error: (error as Error).message },
        false,
        (error as Error).message
      );
    } catch {}
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};
