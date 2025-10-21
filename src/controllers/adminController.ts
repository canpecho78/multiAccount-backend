import { Request, Response } from "express";
import { Assignment } from "../models/Assignment";
import { AssignmentMetrics } from "../models/AssignmentMetrics";
import { User } from "../models/User";
import { Session } from "../models/Session";
import { Chat } from "../models/Chat";
import { Message } from "../models/Message";
import { AuditLog } from "../models/AuditLog";
import { SecuritySettings } from "../models/SecuritySettings";
import { whatsappService } from "../services/whatsappService";
import { env } from "../config/env";

// =====================================================
// AUDITORÍA - AUDIT LOGS
// =====================================================

export const getAuditLogs = async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.max(1, Math.min(100, Number(req.query.limit || 50)));

    // Filtros opcionales
    const filter: any = {};
    if (req.query.userId) filter.userId = req.query.userId;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.resource) filter.resource = req.query.resource;
    if (req.query.success !== undefined) filter.success = req.query.success === "true";

    // Filtro de fechas
    if (req.query.startDate || req.query.endDate) {
      filter.timestamp = {};
      if (req.query.startDate) filter.timestamp.$gte = new Date(req.query.startDate as string);
      if (req.query.endDate) filter.timestamp.$lte = new Date(req.query.endDate as string);
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .populate("userId", "name email")
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      success: true,
      data: logs,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const getAuditStats = async (req: Request, res: Response) => {
  try {
    // Estadísticas generales
    const totalLogs = await AuditLog.countDocuments();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayLogs = await AuditLog.countDocuments({ timestamp: { $gte: today } });

    // Estadísticas por acción
    const actionStats = await AuditLog.aggregate([
      {
        $group: {
          _id: "$action",
          count: { $sum: 1 },
          successCount: { $sum: { $cond: ["$success", 1, 0] } },
          errorCount: { $sum: { $cond: ["$success", 0, 1] } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Estadísticas por usuario
    const userStats = await AuditLog.aggregate([
      {
        $group: {
          _id: "$userId",
          actionCount: { $sum: 1 },
          lastActivity: { $max: "$timestamp" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user"
      },
      {
        $project: {
          name: "$user.name",
          email: "$user.email",
          actionCount: 1,
          lastActivity: 1
        }
      },
      { $sort: { actionCount: -1 } },
      { $limit: 10 }
    ]);

    // Logs de errores recientes
    const recentErrors = await AuditLog.find({ success: false })
      .populate("userId", "name email")
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        general: {
          totalLogs,
          todayLogs,
          actionStats,
          userStats,
          recentErrors
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
// CONFIGURACIÓN DE SEGURIDAD
// =====================================================

export const getSecuritySettings = async (req: Request, res: Response) => {
  try {
    const settings = await SecuritySettings.getSettings();
    res.json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const updateSecuritySettings = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const updates = req.body;

    // Obtener configuración actual
    const currentSettings = await SecuritySettings.getSettings();

    // Crear nueva versión
    const newSettings = await SecuritySettings.create({
      ...currentSettings.toObject(),
      ...updates,
      updatedBy: authUser?.sub,
      updatedAt: new Date(),
      version: currentSettings.version + 1
    });

    // Registrar en auditoría
    await AuditLog.create({
      userId: authUser?.sub,
      action: "update",
      resource: "security-settings",
      details: {
        changes: updates,
        oldVersion: currentSettings.version,
        newVersion: newSettings.version
      },
      success: true,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: newSettings,
      message: "Configuración de seguridad actualizada"
    });
  } catch (error) {
    // Registrar error en auditoría
    const authUser = (req as any).user;
    await AuditLog.create({
      userId: authUser?.sub,
      action: "update",
      resource: "security-settings",
      details: { error: (error as Error).message },
      success: false,
      errorMessage: (error as Error).message,
      timestamp: new Date()
    });

    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

// =====================================================
// FUNCIONES AUXILIARES PARA AUDITORÍA
// =====================================================

// Middleware para registrar acciones automáticamente
export const auditAction = (action: string, resource: string) => {
  return async (req: Request, res: Response, next: any) => {
    const originalSend = res.json;
    const authUser = (req as any).user;

    res.json = function(data: any) {
      // Registrar acción exitosa
      let safeBody: any = data;
      try {
        if (Buffer.isBuffer(data)) {
          safeBody = "[omitted: buffer]";
        } else if (typeof data === "string" && data.length > 1000) {
          safeBody = "[omitted: long string]";
        } else if (typeof data === "object" && data !== null) {
          const str = JSON.stringify(data);
          safeBody = str.length > 2000 ? "[omitted: large object]" : data;
        }
      } catch {
        safeBody = "[omitted: unserializable]";
      }
      AuditLog.create({
        userId: authUser?.sub,
        action,
        resource,
        resourceId: req.params.id,
        details: {
          method: req.method,
          url: req.originalUrl,
          body: req.body,
          responseStatus: res.statusCode,
          responseBody: safeBody
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        success: res.statusCode < 400,
        timestamp: new Date()
      }).catch(console.error);

      return originalSend.call(this, data);
    };

    next();
  };
};

// Función para registrar acciones manualmente
export const logAction = async (
  userId: string,
  action: string,
  resource: string,
  details: any = {},
  success: boolean = true,
  errorMessage?: string
) => {
  try {
    await AuditLog.create({
      userId,
      action,
      resource,
      details,
      success,
      errorMessage,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("Error registrando auditoría:", error);
  }
};

// =====================================================
// LIMPIEZA DE LOGS ANTIGUOS
// =====================================================

// =====================================================
// DASHBOARD ADMINISTRATIVO
// =====================================================

export const getDashboard = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;

    // Estadísticas generales del sistema
    const [
      totalSessions,
      activeSessions,
      totalUsers,
      activeUsers,
      totalChats,
      totalMessages,
      totalAssignments,
      activeAssignments,
      completedAssignments,
      pendingAssignments
    ] = await Promise.all([
      Session.countDocuments(),
      Session.countDocuments({ isActive: true }),
      User.countDocuments(),
      User.countDocuments({ active: true }),
      Chat.countDocuments(),
      Message.countDocuments(),
      Assignment.countDocuments(),
      Assignment.countDocuments({ active: true }),
      Assignment.countDocuments({ status: "completed" }),
      Assignment.countDocuments({ status: "pending" })
    ]);

    // Sesiones problemáticas (con muchos errores)
    const problematicSessions = await Session.find({
      connectionAttempts: { $gte: 5 },
      lastError: { $exists: true }
    })
      .sort({ connectionAttempts: -1 })
      .limit(5)
      .select("sessionId name connectionAttempts lastError");

    // Empleados más activos (por chats completados)
    const topEmployees = await Assignment.aggregate([
      {
        $match: {
          status: "completed",
          completedAt: { $exists: true }
        }
      },
      {
        $group: {
          _id: "$user",
          completedCount: { $sum: 1 },
          avgResolutionTime: { $avg: "$metrics.resolutionTime" }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user"
        }
      },
      {
        $unwind: "$user"
      },
      {
        $project: {
          name: "$user.name",
          email: "$user.email",
          completedCount: 1,
          avgResolutionTime: 1,
          overallScore: "$user.performance.overallScore"
        }
      },
      { $sort: { completedCount: -1 } },
      { $limit: 10 }
    ]);

    // Actividad reciente (últimas 24 horas)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivity = await AuditLog.find({
      timestamp: { $gte: oneDayAgo }
    })
      .populate("userId", "name email")
      .sort({ timestamp: -1 })
      .limit(10);

    // Métricas de rendimiento del sistema
    const systemHealth = await getSystemHealth();

    // Estadísticas por rol
    const roleStats = await User.aggregate([
      {
        $lookup: {
          from: "roles",
          localField: "role",
          foreignField: "_id",
          as: "role"
        }
      },
      {
        $unwind: "$role"
      },
      {
        $group: {
          _id: "$role.name",
          count: { $sum: 1 },
          activeCount: {
            $sum: { $cond: ["$active", 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalSessions,
          activeSessions,
          totalUsers,
          activeUsers,
          totalChats,
          totalMessages,
          totalAssignments,
          activeAssignments,
          completedAssignments,
          pendingAssignments
        },
        systemHealth,
        problematicSessions,
        topEmployees,
        recentActivity,
        roleStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};

export const getSystemHealth = async () => {
  try {
    // Verificar estado de sesiones
    const sessionHealth = await Session.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          connected: { $sum: { $cond: ["$isConnected", 1, 0] } },
          withErrors: { $sum: { $cond: ["$lastError", 1, 0] } },
          avgResponseTime: { $avg: "$responseTime" }
        }
      }
    ]);

    // Verificar estado de usuarios
    const userHealth = await User.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: { $sum: { $cond: ["$active", 1, 0] } },
          withRecentActivity: {
            $sum: {
              $cond: [
                { $gte: ["$lastLogin", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    // Calcular métricas generales
    const health = sessionHealth[0] || { total: 0, connected: 0, withErrors: 0 };
    const userStats = userHealth[0] || { total: 0, active: 0, withRecentActivity: 0 };

    let overallStatus = "excellent";
    if (health.withErrors > health.total * 0.3 || userStats.active < userStats.total * 0.7) {
      overallStatus = "warning";
    }
    if (health.connected < health.total * 0.5 || userStats.withRecentActivity < userStats.total * 0.5) {
      overallStatus = "critical";
    }

    return {
      status: overallStatus,
      sessions: {
        total: health.total,
        connected: health.connected,
        errorRate: health.total > 0 ? (health.withErrors / health.total) * 100 : 0,
        avgResponseTime: health.avgResponseTime || 0
      },
      users: {
        total: userStats.total,
        active: userStats.active,
        activeRate: userStats.total > 0 ? (userStats.active / userStats.total) * 100 : 0,
        recentActivityRate: userStats.total > 0 ? (userStats.withRecentActivity / userStats.total) * 100 : 0
      }
    };
  } catch (error) {
    return {
      status: "unknown",
      error: (error as Error).message
    };
  }
};

export const getWhatsAppMetrics = async (req: Request, res: Response) => {
  try {
    const metrics = whatsappService.getMetrics();
    res.json({
      success: true,
      data: {
        allowGroups: env.allowGroups,
        metrics,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const getEmployeeMetrics = async (req: Request, res: Response) => {
  try {
    const { userId, sessionId, period } = req.query;

    // Si no se especifica período, usar el mes actual
    const now = new Date();
    const startDate = period
      ? new Date(period as string)
      : new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = period
      ? new Date(new Date(period as string).getTime() + 30 * 24 * 60 * 60 * 1000)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const filter: any = {
      "period.startDate": { $gte: startDate },
      "period.endDate": { $lte: endDate }
    };

    if (userId) filter.userId = userId;
    if (sessionId) filter.sessionId = sessionId;

    const metrics = await AssignmentMetrics.find(filter)
      .populate("userId", "name email department position")
      .sort({ "completionRate": -1 });

    res.json({
      success: true,
      data: {
        metrics,
        period: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        summary: {
          totalEmployees: metrics.length,
          avgCompletionRate: metrics.length > 0
            ? metrics.reduce((sum, m) => sum + m.completionRate, 0) / metrics.length
            : 0,
          avgResolutionTime: metrics.length > 0
            ? metrics.reduce((sum, m) => sum + (m.averageResolutionTime || 0), 0) / metrics.length
            : 0
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

export const getAssignmentStats = async (req: Request, res: Response) => {
  try {
    const { sessionId, status, priority, dateRange } = req.query;

    // Filtro base
    const filter: any = {};
    if (sessionId) filter.sessionId = sessionId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    // Filtro de fechas
    if (dateRange) {
      const [startDate, endDate] = (dateRange as string).split(",");
      filter.assignedAt = {};
      if (startDate) filter.assignedAt.$gte = new Date(startDate);
      if (endDate) filter.assignedAt.$lte = new Date(endDate);
    }

    // Estadísticas generales
    const stats = await Assignment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          byStatus: {
            $push: "$status"
          },
          byPriority: {
            $push: "$priority"
          },
          avgResolutionTime: { $avg: "$metrics.resolutionTime" },
          totalMessages: { $sum: "$metrics.messagesExchanged" }
        }
      }
    ]);

    // Estadísticas por estado
    const statusBreakdown = await Assignment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          avgTime: { $avg: "$metrics.resolutionTime" }
        }
      }
    ]);

    // Estadísticas por prioridad
    const priorityBreakdown = await Assignment.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats[0] || {},
        statusBreakdown,
        priorityBreakdown
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};
