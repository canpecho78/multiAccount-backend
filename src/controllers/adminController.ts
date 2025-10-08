import { Request, Response } from "express";
import { AuditLog } from "../models/AuditLog";
import { SecuritySettings } from "../models/SecuritySettings";

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
      AuditLog.create({
        userId: authUser?.sub,
        action,
        resource,
        resourceId: req.params.id,
        details: {
          method: req.method,
          url: req.originalUrl,
          body: req.body,
          responseStatus: res.statusCode
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

export const cleanupOldLogs = async (req: Request, res: Response) => {
  try {
    const settings = await SecuritySettings.getSettings();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - settings.logRetentionDays);

    const result = await AuditLog.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    // Registrar la limpieza
    const authUser = (req as any).user;
    await AuditLog.create({
      userId: authUser?.sub,
      action: "cleanup",
      resource: "audit-logs",
      details: {
        deletedCount: result.deletedCount,
        cutoffDate: cutoffDate.toISOString(),
        retentionDays: settings.logRetentionDays
      },
      success: true,
      timestamp: new Date()
    });

    res.json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        cutoffDate: cutoffDate.toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
};
