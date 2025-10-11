import mongoose, { Schema } from "mongoose";

const AssignmentSchema = new Schema({
  sessionId: { type: String, required: true, index: true },
  chatId: { type: String, required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

  // Estado de la asignación
  status: {
    type: String,
    enum: ["active", "completed", "pending", "rejected"],
    default: "active",
    index: true
  },

  // Prioridad del chat
  priority: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "medium",
    index: true
  },

  // Notas y comentarios
  notes: { type: String, default: "" },
  completionNotes: { type: String, default: "" },

  // Timestamps importantes
  assignedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
  unassignedAt: { type: Date, default: null },

  // Metadata del chat asignado
  metadata: {
    chatName: { type: String, default: "" },
    messageCount: { type: Number, default: 0 },
    lastActivity: { type: Date, default: null },
    isGroup: { type: Boolean, default: false },
    participantCount: { type: Number, default: 0 }
  },

  // Métricas de rendimiento
  metrics: {
    timeToFirstResponse: { type: Number, default: null }, // minutos
    totalResponseTime: { type: Number, default: null },   // minutos totales
    messagesExchanged: { type: Number, default: 0 },
    resolutionTime: { type: Number, default: null },      // minutos hasta resolución
    satisfaction: { type: Number, default: null, min: 1, max: 5 }
  },

  // Flags adicionales
  active: { type: Boolean, default: true },
  escalated: { type: Boolean, default: false },
  requiresAttention: { type: Boolean, default: false },
  autoAssigned: { type: Boolean, default: false }
});

// Índices compuestos para búsquedas eficientes
AssignmentSchema.index({ sessionId: 1, user: 1, status: 1 });
AssignmentSchema.index({ assignedBy: 1, status: 1, assignedAt: -1 });
AssignmentSchema.index({ status: 1, priority: 1, assignedAt: 1 });
AssignmentSchema.index({ active: 1, assignedAt: -1 });

// Índice único compuesto para evitar duplicados activos
AssignmentSchema.index(
  { sessionId: 1, chatId: 1, user: 1, active: 1 },
  {
    unique: true,
    partialFilterExpression: { active: true }
  }
);

export type AssignmentDoc = mongoose.Document & {
  sessionId: string;
  chatId: string;
  user: mongoose.Types.ObjectId;
  assignedBy: mongoose.Types.ObjectId;
  status: "active" | "completed" | "pending" | "rejected";
  priority: "low" | "medium" | "high";
  notes: string;
  completionNotes: string;
  assignedAt: Date;
  completedAt: Date | null;
  unassignedAt: Date | null;
  metadata: {
    chatName: string;
    messageCount: number;
    lastActivity: Date | null;
    isGroup: boolean;
    participantCount: number;
  };
  metrics: {
    timeToFirstResponse: number | null;
    totalResponseTime: number | null;
    messagesExchanged: number;
    resolutionTime: number | null;
    satisfaction: number | null;
  };
  active: boolean;
  escalated: boolean;
  requiresAttention: boolean;
  autoAssigned: boolean;
};

export const Assignment = mongoose.model<AssignmentDoc>("Assignment", AssignmentSchema);
