import { Request, Response } from "express";
import { Session } from "../models/Session";
import { AuthState } from "../models/AuthState";
import { AuthKey } from "../models/AuthKey";
import { whatsappService } from "../services/whatsappService";

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
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const disconnectSession = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    await whatsappService.disconnectSession(sessionId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const regenerateQR = async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ success: false, error: "sessionId requerido" });
    }

    console.log(`🔄 Regenerando QR para sesión: ${sessionId}`);

    // Limpiar credenciales existentes
    await AuthState.deleteOne({ sessionId });
    await AuthKey.deleteMany({ sessionId });

    // Resetear estado de la sesión
    await Session.findOneAndUpdate(
      { sessionId },
      {
        status: "pending",
        isActive: true,
        isConnected: false,
        qrCode: null,
        connectionAttempts: 0,
        lastDisconnectReason: null,
        updatedAt: new Date()
      }
    );

    // Desconectar sesión existente si está conectada
    whatsappService.disconnectSession(sessionId);

    // Crear nueva sesión (esto generará un nuevo QR)
    setTimeout(async () => {
      try {
        await whatsappService.createSession(sessionId);
        console.log(`✅ Nueva sesión creada para ${sessionId}`);
      } catch (error) {
        console.error(`❌ Error creando nueva sesión para ${sessionId}:`, error);
      }
    }, 1000);

    res.json({ 
      success: true, 
      message: "QR regenerado. La sesión se reiniciará automáticamente." 
    });

  } catch (error) {
    console.error(`❌ Error regenerando QR para ${req.params.sessionId}:`, error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};
