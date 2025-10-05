import { Request, Response } from "express";
import { Assignment } from "../models/Assignment";
import { AssignmentMetrics } from "../models/AssignmentMetrics";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
import { User } from "../models/User";

// =====================================================
// GESTIÓN DE ASIGNACIONES PERSONALES
// =====================================================

export const getMyAssignments = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as { sub: string };
    const { sessionId, status } = req.query;

    const filter: any = {
      user: authUser.sub,
      active: true
    };

    if (sessionId) filter.sessionId = sessionId;
    if (status) filter.status = status;

    const assignments = await Assignment.find(filter)
      .populate("sessionId", "name")
      .populate("assignedBy", "name")
      .sort({ assignedAt: -1 });

    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const updateAssignmentStatus = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as { sub: string };
    const { assignmentId } = req.params;
    const { status, notes } = req.body;

    if (!["completed", "pending", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Estado inválido. Debe ser: completed, pending, rejected"
      });
    }

    const assignment = await Assignment.findOne({
      _id: assignmentId,
      user: authUser.sub,
      active: true
    });

    if (!assignment) {
      return res.status(404).json({
        success: false,
        error: "Asignación no encontrada o no tienes permisos para modificarla"
      });
    }

    // Actualizar estado
    assignment.status = status;
    assignment.completionNotes = notes || "";
    assignment.completedAt = status === "completed" ? new Date() : null;

    // Si se marca como completado, incrementar métricas del usuario
    if (status === "completed") {
      await updateUserPerformanceMetrics(authUser.sub, assignment.sessionId);
    }

    await assignment.save();

    res.json({
      success: true,
      data: assignment,
      message: `Asignación marcada como ${status}`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const getAssignmentStats = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as { sub: string };
    const { period } = req.query;

    // Si no se especifica período, usar el mes actual
    const now = new Date();
    const startDate = period
      ? new Date(period as string)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = period
      ? new Date(new Date(period as string).getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Buscar métricas existentes
    let metrics = await AssignmentMetrics.findOne({
      userId: authUser.sub,
      "period.startDate": { $gte: startDate },
      "period.endDate": { $lte: endDate }
    });

    if (!metrics) {
      // Si no existen métricas, calcularlas
      metrics = await calculateUserMetrics(authUser.sub, startDate, endDate);
    }

    res.json({
      success: true,
      data: {
        metrics,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

// =====================================================
// GESTIÓN DE CHATS ASIGNADOS
// =====================================================

export const getMyChats = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as { sub: string };
    const { sessionId, type, page = 1, limit = 20 } = req.query;

    // Primero obtener las asignaciones activas del usuario
    const assignmentFilter: any = {
      user: authUser.sub,
      active: true,
      status: "active"
    };

    if (sessionId) assignmentFilter.sessionId = sessionId;

    const assignments = await Assignment.find(assignmentFilter).select("chatId");
    const allowedChatIds = assignments.map(a => a.chatId);

    if (allowedChatIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 }
      });
    }

    // Ahora obtener los chats permitidos
    const chatFilter: any = {
      chatId: { $in: allowedChatIds }
    };

    if (sessionId) chatFilter.sessionId = sessionId;
    if (type && type !== "all") {
      chatFilter.chatId = type === "group"
        ? { $regex: /@g\.us$/ }
        : { $regex: /@s\.whatsapp\.net$/ };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [chats, total] = await Promise.all([
      Chat.find(chatFilter)
        .sort({ lastMessageTime: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Chat.countDocuments(chatFilter)
    ]);

    res.json({
      success: true,
      data: chats,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

// =====================================================
// FUNCIONES AUXILIARES
// =====================================================

const updateUserPerformanceMetrics = async (userId: string, sessionId: string) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Buscar o crear métricas del período actual
    let metrics = await AssignmentMetrics.findOne({
      userId,
      sessionId,
      "period.startDate": startOfMonth,
      "period.endDate": endOfMonth
    });

    if (!metrics) {
      metrics = await calculateUserMetrics(userId, startOfMonth, endOfMonth);
    } else {
      // Recalcular métricas
      const newMetrics = await calculateUserMetrics(userId, startOfMonth, endOfMonth);
      Object.assign(metrics, newMetrics);
      await metrics.save();
    }

    // Actualizar métricas del usuario
    await updateUserOverallMetrics(userId);
  } catch (error) {
    console.error("Error actualizando métricas de rendimiento:", error);
  }
};

const calculateUserMetrics = async (userId: string, startDate: Date, endDate: Date) => {
  const assignments = await Assignment.find({
    user: userId,
    assignedAt: { $gte: startDate, $lte: endDate }
  });

  const completed = assignments.filter(a => a.status === "completed");
  const pending = assignments.filter(a => a.status === "pending");
  const rejected = assignments.filter(a => a.status === "rejected");

  // Calcular métricas de tiempo
  const completedWithTime = completed.filter(a => a.metrics.resolutionTime);
  const avgResolutionTime = completedWithTime.length > 0
    ? completedWithTime.reduce((sum, a) => sum + a.metrics.resolutionTime!, 0) / completedWithTime.length
    : null;

  // Calcular métricas por prioridad
  const byPriority = {
    high: assignments.filter(a => a.priority === "high"),
    medium: assignments.filter(a => a.priority === "medium"),
    low: assignments.filter(a => a.priority === "low")
  };

  const metrics = new AssignmentMetrics({
    userId,
    sessionId: "all", // Métricas globales por ahora
    period: {
      startDate,
      endDate
    },
    totalAssigned: assignments.length,
    totalCompleted: completed.length,
    totalPending: pending.length,
    totalRejected: rejected.length,
    averageResolutionTime: avgResolutionTime,
    completionRate: assignments.length > 0 ? (completed.length / assignments.length) * 100 : 0,
    messagesHandled: assignments.reduce((sum, a) => sum + (a.metrics.messagesExchanged || 0), 0),
    chatsPerDay: assignments.length / Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000))),
    byPriority: {
      high: {
        assigned: byPriority.high.length,
        completed: byPriority.high.filter(a => a.status === "completed").length,
        avgResolutionTime: byPriority.high.filter(a => a.metrics.resolutionTime).length > 0
          ? byPriority.high.filter(a => a.metrics.resolutionTime).reduce((sum, a) => sum + a.metrics.resolutionTime!, 0) / byPriority.high.filter(a => a.metrics.resolutionTime).length
          : null
      },
      medium: {
        assigned: byPriority.medium.length,
        completed: byPriority.medium.filter(a => a.status === "completed").length,
        avgResolutionTime: byPriority.medium.filter(a => a.metrics.resolutionTime).length > 0
          ? byPriority.medium.filter(a => a.metrics.resolutionTime).reduce((sum, a) => sum + a.metrics.resolutionTime!, 0) / byPriority.medium.filter(a => a.metrics.resolutionTime).length
          : null
      },
      low: {
        assigned: byPriority.low.length,
        completed: byPriority.low.filter(a => a.status === "completed").length,
        avgResolutionTime: byPriority.low.filter(a => a.metrics.resolutionTime).length > 0
          ? byPriority.low.filter(a => a.metrics.resolutionTime).reduce((sum, a) => sum + a.metrics.resolutionTime!, 0) / byPriority.low.filter(a => a.metrics.resolutionTime).length
          : null
      }
    },
    isCurrentPeriod: true,
    calculatedAt: new Date()
  });

  await metrics.save();
  return metrics;
};

const updateUserOverallMetrics = async (userId: string) => {
  try {
    const user = await User.findById(userId);
    if (!user) return;

    // Obtener todas las métricas del usuario
    const allMetrics = await AssignmentMetrics.find({ userId });

    if (allMetrics.length === 0) return;

    // Calcular métricas generales
    const totalCompleted = allMetrics.reduce((sum, m) => sum + m.totalCompleted, 0);
    const totalAssigned = allMetrics.reduce((sum, m) => sum + m.totalAssigned, 0);
    const avgResolutionTime = allMetrics.length > 0
      ? allMetrics.reduce((sum, m) => sum + (m.averageResolutionTime || 0), 0) / allMetrics.length
      : 0;

    // Actualizar usuario
    user.performance = {
      overallScore: totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0,
      lastEvaluation: new Date(),
      currentStreak: calculateCurrentStreak(allMetrics),
      totalChatsHandled: totalCompleted,
      averageRating: calculateAverageRating(allMetrics)
    };

    await user.save();
  } catch (error) {
    console.error("Error actualizando métricas generales del usuario:", error);
  }
};

const calculateCurrentStreak = (metrics: any[]): number => {
  // Por simplicidad, retornar días consecutivos con actividad
  return metrics.length > 0 ? Math.min(metrics.length * 7, 30) : 0;
};

const calculateAverageRating = (metrics: any[]): number => {
  // Calcular promedio de satisfacción promedio
  const ratings = metrics.map(m => m.averageSatisfaction).filter(r => r !== null);
  return ratings.length > 0 ? ratings.reduce((sum, r) => sum + r, 0) / ratings.length : 0;
};
