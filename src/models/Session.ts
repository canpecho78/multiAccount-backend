import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  name: { type: String, default: "Unknown" },
  phone: { type: String, default: null },
  isConnected: { type: Boolean, default: false },
  lastActivity: { type: Date, default: Date.now },
  qrCode: { type: String, default: null },
  
  // Metadata de control y escalabilidad
  status: { 
    type: String, 
    enum: ["pending", "qr_ready", "connected", "disconnected", "error", "inactive"],
    default: "pending" 
  },
  connectionAttempts: { type: Number, default: 0 },
  lastConnectionAttempt: { type: Date, default: null },
  lastDisconnectReason: { type: String, default: null },
  
  // Métricas de uso
  messagesSent: { type: Number, default: 0 },
  messagesReceived: { type: Number, default: 0 },
  totalChats: { type: Number, default: 0 },
  
  // Control de recursos
  memoryUsage: { type: Number, default: 0 }, // en MB
  lastHealthCheck: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  
  // Metadata adicional
  userAgent: { type: String, default: null },
  platform: { type: String, default: null },
  version: { type: String, default: null },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Índices para mejorar consultas
SessionSchema.index({ isConnected: 1, isActive: 1 });
SessionSchema.index({ status: 1 });
SessionSchema.index({ lastActivity: 1 });

export type SessionDoc = mongoose.Document & {
  sessionId: string;
  name: string;
  phone: string | null;
  isConnected: boolean;
  lastActivity: Date;
  qrCode: string | null;
  
  // Metadata de control
  status: "pending" | "qr_ready" | "connected" | "disconnected" | "error" | "inactive";
  connectionAttempts: number;
  lastConnectionAttempt: Date | null;
  lastDisconnectReason: string | null;
  
  // Métricas
  messagesSent: number;
  messagesReceived: number;
  totalChats: number;
  
  // Control de recursos
  memoryUsage: number;
  lastHealthCheck: Date;
  isActive: boolean;
  
  // Metadata adicional
  userAgent: string | null;
  platform: string | null;
  version: string | null;
  
  createdAt: Date;
  updatedAt: Date;
};

export const Session = mongoose.model<SessionDoc>("Session", SessionSchema);
