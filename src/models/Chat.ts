import mongoose from "mongoose";

const ChatSchema = new mongoose.Schema({
  chatId: { type: String, required: true },
  sessionId: { type: String, required: true },
  name: { type: String, default: "Desconocido" },
  phone: { type: String, required: true },
  lastMessage: { type: String, default: "" },
  lastMessageTime: { type: Date, default: Date.now },
  unreadCount: { type: Number, default: 0 },
  isArchived: { type: Boolean, default: false },
  isPinned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
  // ===== CAMPOS MULTIMEDIA =====
  // URL de la foto de perfil (relativa al servidor)
  profilePicUrl: { type: String, default: null },
  
  // Timestamp de última actualización de la foto
  profilePicUpdatedAt: { type: Date, default: null },
  
  // Estado/biografía del contacto
  status: { type: String, default: null },
  
  // Si es un grupo
  isGroup: { type: Boolean, default: false },
  
  // Para grupos: descripción
  groupDescription: { type: String, default: null },
  
  // Última vez que el contacto estuvo en línea
  lastSeen: { type: Date, default: null },

  // Referencia al contacto normalizado
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", default: null },
});

// Índice único compuesto para evitar duplicados
ChatSchema.index({ chatId: 1, sessionId: 1 }, { unique: true });

// Índice para búsquedas por sesión
ChatSchema.index({ sessionId: 1, lastMessageTime: -1 });
ChatSchema.index({ sessionId: 1, contactId: 1 });

// Índice adicional para chats anclados
ChatSchema.index({ sessionId: 1, isPinned: -1, lastMessageTime: -1 });

export type ChatDoc = mongoose.Document & {
  chatId: string;
  sessionId: string;
  name: string;
  phone: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  isArchived: boolean;
  isPinned: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Campos multimedia
  profilePicUrl?: string | null;
  profilePicUpdatedAt?: Date | null;
  status?: string | null;
  isGroup?: boolean;
  groupDescription?: string | null;
  lastSeen?: Date | null;

  // Relaciones
  contactId?: mongoose.Types.ObjectId | null;
};

export const Chat = mongoose.model<ChatDoc>("Chat", ChatSchema);