import mongoose from "mongoose";

const MediaSchema = new mongoose.Schema({
  // Identificador único del archivo
  fileId: { type: String, required: true, unique: true },
  
  // Relación con mensaje
  messageId: { type: String, required: true, index: true },
  sessionId: { type: String, required: true, index: true },
  chatId: { type: String, required: true, index: true },
  
  // Tipo de multimedia
  mediaType: { 
    type: String, 
    required: true,
    enum: ["image", "video", "audio", "document", "sticker", "voice", "profile-pic"]
  },
  
  // Datos del archivo
  filename: { type: String, required: true },
  originalFilename: { type: String, default: null },
  mimetype: { type: String, required: true },
  size: { type: Number, required: true }, // en bytes
  
  // Datos binarios del archivo (almacenado en MongoDB)
  data: { type: Buffer, required: true },
  
  // Metadata adicional
  width: { type: Number, default: null }, // Para imágenes/videos
  height: { type: Number, default: null }, // Para imágenes/videos
  duration: { type: Number, default: null }, // Para audios/videos (segundos)
  
  // Thumbnail/miniatura (para videos e imágenes grandes)
  thumbnail: { type: Buffer, default: null },
  thumbnailMimetype: { type: String, default: null },
  
  // Caption/descripción
  caption: { type: String, default: null },
  
  // Flags especiales
  isVoiceNote: { type: Boolean, default: false },
  isAnimated: { type: Boolean, default: false }, // Para stickers animados
  
  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Índices para búsquedas eficientes
// Nota: evitamos duplicar índices ya declarados a nivel de campo (fileId unique, messageId index)
MediaSchema.index({ sessionId: 1, chatId: 1, createdAt: -1 });
MediaSchema.index({ sessionId: 1, mediaType: 1, createdAt: -1 });

export type MediaDoc = mongoose.Document & {
  fileId: string;
  messageId: string;
  sessionId: string;
  chatId: string;
  mediaType: "image" | "video" | "audio" | "document" | "sticker" | "voice" | "profile-pic";
  filename: string;
  originalFilename?: string | null;
  mimetype: string;
  size: number;
  data: Buffer;
  width?: number | null;
  height?: number | null;
  duration?: number | null;
  thumbnail?: Buffer | null;
  thumbnailMimetype?: string | null;
  caption?: string | null;
  isVoiceNote?: boolean;
  isAnimated?: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const Media = mongoose.model<MediaDoc>("Media", MediaSchema);
