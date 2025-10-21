import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: Schema.Types.ObjectId, ref: "Role", required: true },

  // Información empresarial
  department: { type: String, default: "" },
  position: { type: String, default: "" },
  supervisor: { type: Schema.Types.ObjectId, ref: "User", default: null },

  // Información de contacto
  phone: { type: String, default: "" },
  whatsappNumber: { type: String, default: "" },

  // Información laboral
  hireDate: { type: Date, default: null },
  terminationDate: { type: Date, default: null },

  // Estado del empleado
  employeeStatus: {
    type: String,
    enum: ["active", "inactive", "on_leave", "terminated"],
    default: "active"
  },

  // Configuración personal
  timezone: { type: String, default: "America/Argentina/Buenos_Aires" },
  language: { type: String, default: "es" },

  // Métricas de rendimiento (calculadas automáticamente)
  performance: {
    overallScore: { type: Number, default: 0, min: 0, max: 100 },
    lastEvaluation: { type: Date, default: null },
    currentStreak: { type: Number, default: 0 }, // días consecutivos activos
    totalChatsHandled: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 }
  },

  // Configuración de notificaciones
  notifications: {
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    sms: { type: Boolean, default: false },
    newAssignments: { type: Boolean, default: true },
    reminders: { type: Boolean, default: true },
    reports: { type: Boolean, default: false }
  },

  // Límites y restricciones
  limits: {
    maxConcurrentChats: { type: Number, default: 10 },
    maxDailyChats: { type: Number, default: 50 },
    workHours: {
      start: { type: String, default: "09:00" },
      end: { type: String, default: "18:00" },
      timezone: { type: String, default: "America/Argentina/Buenos_Aires" }
    }
  },

  // Estado del sistema
  active: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },
  loginCount: { type: Number, default: 0 },

  // Campos para reseteo de contraseña
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpiry: { type: Date, default: null },

  // Campos para 2FA (opcional)
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: null },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Índices para búsquedas eficientes
UserSchema.index({ role: 1, active: 1 });
UserSchema.index({ supervisor: 1, employeeStatus: 1 });
UserSchema.index({ department: 1, position: 1 });
UserSchema.index({ "performance.overallScore": -1 });
UserSchema.index({ lastLogin: -1 });

// Índice compuesto para empleados activos por supervisor
UserSchema.index({ supervisor: 1, employeeStatus: 1, active: 1 });

export type UserDoc = mongoose.Document & {
  name: string;
  email: string;
  passwordHash: string;
  role: mongoose.Types.ObjectId;

  // Información empresarial
  department?: string;
  position?: string;
  supervisor?: mongoose.Types.ObjectId | null;

  // Información de contacto
  phone?: string;
  whatsappNumber?: string;

  // Información laboral
  hireDate?: Date | null;
  terminationDate?: Date | null;
  employeeStatus: "active" | "inactive" | "on_leave" | "terminated";

  // Configuración personal
  timezone: string;
  language: string;

  // Métricas de rendimiento
  performance: {
    overallScore: number;
    lastEvaluation: Date | null;
    currentStreak: number;
    totalChatsHandled: number;
    averageRating: number;
  };

  // Configuración de notificaciones
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    newAssignments: boolean;
    reminders: boolean;
    reports: boolean;
  };

  // Límites y restricciones
  limits: {
    maxConcurrentChats: number;
    maxDailyChats: number;
    workHours: {
      start: string;
      end: string;
      timezone: string;
    };
  };

  // Estado del sistema
  active: boolean;
  lastLogin: Date | null;
  loginCount: number;

  // Campos para reseteo de contraseña
  resetPasswordToken?: string | null;
  resetPasswordExpiry?: Date | null;

  // Campos para 2FA
  twoFactorEnabled: boolean;
  twoFactorSecret?: string | null;

  createdAt: Date;
  updatedAt: Date;
};

export const User = mongoose.model<UserDoc>("User", UserSchema);
