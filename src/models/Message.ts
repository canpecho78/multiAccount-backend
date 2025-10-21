
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true },
  chatId: { type: String, required: true },
  sessionId: { type: String, required: true },
  contactId: { type: mongoose.Schema.Types.ObjectId, ref: "Contact", default: null },
  from: { type: String, required: true },
  to: { type: String, required: true },
  body: { type: String, required: true },
  fromMe: { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now },
  messageType: { type: String, default: "conversation" },
  status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
  createdAt: { type: Date, default: Date.now },
  
  // ===== CAMPOS MULTIMEDIA =====
  // URL relativa donde se guardó el archivo multimedia
  mediaUrl: { type: String, default: null },
  
  // Tipo de multimedia (imageMessage, audioMessage, videoMessage, etc.)
  mediaType: { type: String, default: null },
  
  // Nombre del archivo guardado
  mediaFilename: { type: String, default: null },
  
  // MIME type del archivo (image/jpeg, audio/ogg, video/mp4, etc.)
  mediaMimetype: { type: String, default: null },
  
  // Tamaño del archivo en bytes
  mediaSize: { type: Number, default: null },
  
  // Duración para audios/videos (en segundos)
  mediaDuration: { type: Number, default: null },
  
  // Para stickers y algunos documentos
  mediaCaption: { type: String, default: null },
  
  // Nombre original del documento (si aplica)
  documentName: { type: String, default: null },
  
  // Thumbnail/miniatura (base64 o URL)
  mediaThumbnail: { type: String, default: null },
  
  // Si es nota de voz (Push To Talk)
  isVoiceNote: { type: Boolean, default: false },
});

// Índices para búsquedas eficientes
MessageSchema.index({ messageId: 1 }, { unique: true });
MessageSchema.index({ sessionId: 1, chatId: 1, timestamp: -1 });
MessageSchema.index({ sessionId: 1, contactId: 1, timestamp: -1 });
MessageSchema.index({ sessionId: 1, timestamp: -1 });

export type MessageDoc = mongoose.Document & {
  messageId: string;
  chatId: string;
  sessionId: string;
  contactId?: mongoose.Types.ObjectId | null;
  from: string;
  to: string;
  body: string;
  fromMe: boolean;
  timestamp: Date;
  messageType: string;
  status: "sent" | "delivered" | "read";
  createdAt: Date;
  
  // Campos multimedia
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaFilename?: string | null;
  mediaMimetype?: string | null;
  mediaSize?: number | null;
  mediaDuration?: number | null;
  mediaCaption?: string | null;
  documentName?: string | null;
  mediaThumbnail?: string | null;
  isVoiceNote?: boolean;
};

export const Message = mongoose.model<MessageDoc>("Message", MessageSchema);