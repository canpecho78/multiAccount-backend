import mongoose, { Schema } from "mongoose";

const AuditLogSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  action: { type: String, required: true }, // create, update, delete, login, logout, etc.
  resource: { type: String, required: true }, // users, roles, sessions, messages, etc.
  resourceId: { type: String }, // ID del recurso afectado
  details: { type: Schema.Types.Mixed }, // Detalles adicionales de la acción
  ipAddress: { type: String },
  userAgent: { type: String },
  success: { type: Boolean, default: true },
  errorMessage: { type: String },
  timestamp: { type: Date, default: Date.now },
  sessionId: { type: String }, // ID de la sesión del usuario
});

// Índices para optimizar consultas
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, timestamp: -1 });
AuditLogSchema.index({ timestamp: -1 });

// TTL configurable para retención de auditoría (por defecto 90 días)
const AUDIT_TTL_DAYS = Number(process.env.AUDIT_LOG_TTL_DAYS || 90);
const AUDIT_TTL_SECONDS = Math.max(1, Math.floor(AUDIT_TTL_DAYS * 24 * 60 * 60));
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: AUDIT_TTL_SECONDS });

export type AuditLogDoc = mongoose.Document & {
  userId: mongoose.Types.ObjectId;
  action: string;
  resource: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: Date;
  sessionId?: string;
};

export const AuditLog = mongoose.model<AuditLogDoc>("AuditLog", AuditLogSchema);
