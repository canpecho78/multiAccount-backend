import mongoose, { Schema } from "mongoose";

const AssignmentMetricsSchema = new Schema({
  // Identificación
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  sessionId: { type: String, required: true, index: true },

  // Período de las métricas
  period: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },

  // Métricas generales
  totalAssigned: { type: Number, default: 0 },
  totalCompleted: { type: Number, default: 0 },
  totalPending: { type: Number, default: 0 },
  totalRejected: { type: Number, default: 0 },

  // Métricas de tiempo
  averageResolutionTime: { type: Number, default: null }, // minutos
  averageFirstResponseTime: { type: Number, default: null }, // minutos
  totalActiveTime: { type: Number, default: 0 }, // minutos trabajados

  // Métricas de calidad
  averageSatisfaction: { type: Number, default: null, min: 1, max: 5 },
  completionRate: { type: Number, default: 0 }, // porcentaje

  // Métricas de productividad
  messagesHandled: { type: Number, default: 0 },
  chatsPerDay: { type: Number, default: 0 },
  efficiencyScore: { type: Number, default: 0 }, // 0-100

  // Métricas por prioridad
  byPriority: {
    high: {
      assigned: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      avgResolutionTime: { type: Number, default: null }
    },
    medium: {
      assigned: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      avgResolutionTime: { type: Number, default: null }
    },
    low: {
      assigned: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      avgResolutionTime: { type: Number, default: null }
    }
  },

  // Métricas históricas (para tendencias)
  previousPeriod: {
    totalAssigned: { type: Number, default: 0 },
    totalCompleted: { type: Number, default: 0 },
    averageResolutionTime: { type: Number, default: null }
  },

  // Flags y estado
  isCurrentPeriod: { type: Boolean, default: false },
  calculatedAt: { type: Date, default: Date.now }
});

// Índices para búsquedas eficientes
AssignmentMetricsSchema.index({ userId: 1, sessionId: 1, "period.startDate": -1 });
AssignmentMetricsSchema.index({ sessionId: 1, isCurrentPeriod: 1 });
AssignmentMetricsSchema.index({ completionRate: -1, efficiencyScore: -1 });

// Índice único para evitar duplicados por período
AssignmentMetricsSchema.index(
  {
    userId: 1,
    sessionId: 1,
    "period.startDate": 1,
    "period.endDate": 1
  },
  { unique: true }
);

export type AssignmentMetricsDoc = mongoose.Document & {
  userId: mongoose.Types.ObjectId;
  sessionId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalAssigned: number;
  totalCompleted: number;
  totalPending: number;
  totalRejected: number;
  averageResolutionTime: number | null;
  averageFirstResponseTime: number | null;
  totalActiveTime: number;
  averageSatisfaction: number | null;
  completionRate: number;
  messagesHandled: number;
  chatsPerDay: number;
  efficiencyScore: number;
  byPriority: {
    high: {
      assigned: number;
      completed: number;
      avgResolutionTime: number | null;
    };
    medium: {
      assigned: number;
      completed: number;
      avgResolutionTime: number | null;
    };
    low: {
      assigned: number;
      completed: number;
      avgResolutionTime: number | null;
    };
  };
  previousPeriod: {
    totalAssigned: number;
    totalCompleted: number;
    averageResolutionTime: number | null;
  };
  isCurrentPeriod: boolean;
  calculatedAt: Date;
};

export const AssignmentMetrics = mongoose.model<AssignmentMetricsDoc>("AssignmentMetrics", AssignmentMetricsSchema);
