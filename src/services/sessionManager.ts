import { Session, SessionDoc } from "../models/Session";
import { AuthState } from "../models/AuthState";
import { AuthKey } from "../models/AuthKey";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
import { Assignment } from "../models/Assignment";

/**
 * SessionManager - Servicio centralizado para gestión de sesiones en MongoDB
 * Proporciona control completo y escalabilidad para múltiples sesiones de WhatsApp
 */
export class SessionManager {
  /**
   * Crear o actualizar una sesión en la base de datos
   */
  async createOrUpdateSession(
    sessionId: string,
    data: Partial<SessionDoc>
  ): Promise<SessionDoc> {
    const session = await Session.findOneAndUpdate(
      { sessionId },
      {
        ...data,
        sessionId,
        updatedAt: new Date(),
        lastActivity: new Date(),
      },
      { upsert: true, new: true }
    );
    return session;
  }

  /**
   * Limpiar credenciales/keys de autenticación para forzar un nuevo emparejamiento (QR fresco)
   */
  async clearAuth(sessionId: string): Promise<void> {
    await AuthKey.deleteMany({ sessionId });
    await AuthState.deleteOne({ sessionId });
    await Session.findOneAndUpdate(
      { sessionId },
      {
        status: "pending",
        isActive: true,
        isConnected: false,
        qrCode: null,
        updatedAt: new Date(),
        lastDisconnectReason: null,
        connectionAttempts: 0,
      }
    );
  }

  /**
   * Obtener una sesión por ID
   */
  async getSession(sessionId: string): Promise<SessionDoc | null> {
    return await Session.findOne({ sessionId });
  }

  /**
   * Obtener todas las sesiones activas
   */
  async getActiveSessions(): Promise<SessionDoc[]> {
    return await Session.find({ isActive: true }).sort({ lastActivity: -1 });
  }

  /**
   * Obtener sesiones conectadas
   */
  async getConnectedSessions(): Promise<SessionDoc[]> {
    return await Session.find({ isConnected: true, isActive: true });
  }

  /**
   * Actualizar estado de conexión
   */
  async updateConnectionStatus(
    sessionId: string,
    isConnected: boolean,
    status: SessionDoc["status"],
    metadata?: {
      phone?: string;
      name?: string;
      platform?: string;
      version?: string;
    }
  ): Promise<void> {
    const updateData: any = {
      isConnected,
      status,
      lastActivity: new Date(),
      updatedAt: new Date(),
    };

    if (isConnected) {
      updateData.connectionAttempts = 0;
      updateData.lastDisconnectReason = null;
      updateData.qrCode = null;
    }

    if (metadata) {
      Object.assign(updateData, metadata);
    }

    await Session.findOneAndUpdate({ sessionId }, updateData);
  }

  /**
   * Registrar intento de conexión
   */
  async recordConnectionAttempt(
    sessionId: string,
    success: boolean,
    reason?: string
  ): Promise<void> {
    const update: any = {
      lastConnectionAttempt: new Date(),
      updatedAt: new Date(),
    };

    if (!success) {
      update.$inc = { connectionAttempts: 1 };
      update.lastDisconnectReason = reason || "Unknown";
      update.status = "error";
    }

    await Session.findOneAndUpdate({ sessionId }, update);
  }

  /**
   * Actualizar código QR
   */
  async updateQRCode(sessionId: string, qrCode: string): Promise<void> {
    await Session.findOneAndUpdate(
      { sessionId },
      {
        qrCode,
        status: "qr_ready",
        updatedAt: new Date(),
      }
    );
  }

  /**
   * Incrementar contador de mensajes
   */
  async incrementMessageCount(
    sessionId: string,
    type: "sent" | "received"
  ): Promise<void> {
    const field = type === "sent" ? "messagesSent" : "messagesReceived";
    await Session.findOneAndUpdate(
      { sessionId },
      {
        $inc: { [field]: 1 },
        lastActivity: new Date(),
        updatedAt: new Date(),
      }
    );
  }

  /**
   * Actualizar conteo de chats
   */
  async updateChatCount(sessionId: string): Promise<void> {
    const count = await Chat.countDocuments({ sessionId });
    await Session.findOneAndUpdate(
      { sessionId },
      { totalChats: count, updatedAt: new Date() }
    );
  }

  /**
   * Actualizar health check y uso de memoria
   */
  async updateHealthCheck(sessionId: string, memoryMB: number): Promise<void> {
    await Session.findOneAndUpdate(
      { sessionId },
      {
        lastHealthCheck: new Date(),
        memoryUsage: memoryMB,
        updatedAt: new Date(),
      }
    );
  }

  /**
   * Marcar sesión como inactiva
   */
  async markAsInactive(sessionId: string, reason?: string): Promise<void> {
    await Session.findOneAndUpdate(
      { sessionId },
      {
        isActive: false,
        status: "inactive",
        lastDisconnectReason: reason || "Marked as inactive",
        updatedAt: new Date(),
      }
    );
  }

  /**
   * Eliminar sesión completamente (incluyendo datos relacionados)
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Eliminar en orden: mensajes, chats, assignments, auth keys, auth state, sesión
    await Message.deleteMany({ sessionId });
    await Chat.deleteMany({ sessionId });
    await Assignment.deleteMany({ sessionId });
    await AuthKey.deleteMany({ sessionId });
    await AuthState.deleteOne({ sessionId });
    await Session.deleteOne({ sessionId });
  }

  /**
   * Limpiar sesiones inactivas (más de X días sin actividad)
   */
  async cleanupInactiveSessions(daysInactive: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysInactive);

    const inactiveSessions = await Session.find({
      lastActivity: { $lt: cutoffDate },
      isConnected: false,
    });

    let deletedCount = 0;
    for (const session of inactiveSessions) {
      await this.deleteSession(session.sessionId);
      deletedCount++;
    }

    return deletedCount;
  }

  /**
   * Obtener estadísticas generales
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    connected: number;
    disconnected: number;
    pending: number;
    totalMessages: number;
    totalChats: number;
  }> {
    const [
      total,
      active,
      connected,
      disconnected,
      pending,
      totalMessages,
      totalChats,
    ] = await Promise.all([
      Session.countDocuments({}),
      Session.countDocuments({ isActive: true }),
      Session.countDocuments({ isConnected: true }),
      Session.countDocuments({ status: "disconnected" }),
      Session.countDocuments({ status: "pending" }),
      Message.countDocuments({}),
      Chat.countDocuments({}),
    ]);

    return {
      total,
      active,
      connected,
      disconnected,
      pending,
      totalMessages,
      totalChats,
    };
  }

  /**
   * Obtener sesiones que necesitan atención (muchos intentos fallidos)
   */
  async getProblematicSessions(
    minAttempts: number = 5
  ): Promise<SessionDoc[]> {
    return await Session.find({
      connectionAttempts: { $gte: minAttempts },
      isActive: true,
    }).sort({ connectionAttempts: -1 });
  }

  /**
   * Resetear intentos de conexión
   */
  async resetConnectionAttempts(sessionId: string): Promise<void> {
    await Session.findOneAndUpdate(
      { sessionId },
      {
        connectionAttempts: 0,
        lastDisconnectReason: null,
        updatedAt: new Date(),
      }
    );
  }
}

export const sessionManager = new SessionManager();
