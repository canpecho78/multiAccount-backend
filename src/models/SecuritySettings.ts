import mongoose, { Schema, Model } from "mongoose";

const SecuritySettingsSchema = new Schema({
  // Configuraciones de autenticación
  maxLoginAttempts: { type: Number, default: 5 }, // Máximo intentos de login fallidos
  lockoutDuration: { type: Number, default: 30 }, // Duración del bloqueo en minutos
  sessionTimeout: { type: Number, default: 60 }, // Timeout de sesión en minutos
  passwordMinLength: { type: Number, default: 8 }, // Longitud mínima de contraseña
  requireSpecialChars: { type: Boolean, default: true }, // Requerir caracteres especiales
  requireNumbers: { type: Boolean, default: true }, // Requerir números
  requireUppercase: { type: Boolean, default: true }, // Requerir mayúsculas
  passwordExpiryDays: { type: Number, default: 90 }, // Días para expirar contraseña

  // Configuraciones de 2FA
  enable2FA: { type: Boolean, default: false }, // Habilitar 2FA globalmente
  require2FAForAdmins: { type: Boolean, default: true }, // Requerir 2FA para administradores

  // Configuraciones de auditoría
  auditAllActions: { type: Boolean, default: true }, // Auditar todas las acciones
  auditDataChanges: { type: Boolean, default: true }, // Auditar cambios de datos
  auditLoginAttempts: { type: Boolean, default: true }, // Auditar intentos de login
  logRetentionDays: { type: Number, default: 365 }, // Días de retención de logs

  // Configuraciones de seguridad adicionales
  allowedIPs: [{ type: String }], // IPs permitidas (vacío = todas)
  blockedIPs: [{ type: String }], // IPs bloqueadas
  maxSessionsPerUser: { type: Number, default: 5 }, // Máximo sesiones por usuario

  // Configuraciones de rate limiting
  rateLimitWindowMs: { type: Number, default: 15 * 60 * 1000 }, // Ventana de rate limit (15 minutos)
  rateLimitMaxRequests: { type: Number, default: 100 }, // Máximo requests por ventana

  // Metadatos
  updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  updatedAt: { type: Date, default: Date.now },
  version: { type: Number, default: 1 }
});

// Índice único para que solo haya una configuración global
SecuritySettingsSchema.index({ version: 1 }, { unique: true, partialFilterExpression: { version: { $gte: 0 } } });

export type SecuritySettingsDoc = mongoose.Document & {
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  passwordMinLength: number;
  requireSpecialChars: boolean;
  requireNumbers: boolean;
  requireUppercase: boolean;
  passwordExpiryDays: number;
  enable2FA: boolean;
  require2FAForAdmins: boolean;
  auditAllActions: boolean;
  auditDataChanges: boolean;
  auditLoginAttempts: boolean;
  logRetentionDays: number;
  allowedIPs: string[];
  blockedIPs: string[];
  maxSessionsPerUser: number;
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  updatedBy?: mongoose.Types.ObjectId;
  updatedAt: Date;
  version: number;
};

export type SecuritySettingsModel = Model<SecuritySettingsDoc> & {
  getSettings(): Promise<SecuritySettingsDoc>;
};

// Crear configuración por defecto si no existe
SecuritySettingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne({ version: { $gte: 0 } }).sort({ version: -1 });

  if (!settings) {
    // Crear configuración por defecto
    settings = await this.create({
      maxLoginAttempts: 5,
      lockoutDuration: 30,
      sessionTimeout: 60,
      passwordMinLength: 8,
      requireSpecialChars: true,
      requireNumbers: true,
      requireUppercase: true,
      passwordExpiryDays: 90,
      enable2FA: false,
      require2FAForAdmins: true,
      auditAllActions: true,
      auditDataChanges: true,
      auditLoginAttempts: true,
      logRetentionDays: 365,
      allowedIPs: [],
      blockedIPs: [],
      maxSessionsPerUser: 5,
      rateLimitWindowMs: 15 * 60 * 1000,
      rateLimitMaxRequests: 100,
      version: 1
    });
  }

  return settings;
};

export const SecuritySettings = mongoose.model<SecuritySettingsDoc, SecuritySettingsModel>("SecuritySettings", SecuritySettingsSchema);
