/**
 * Interfaces para la gestión de audio y notas de voz de WhatsApp
 */

import { WAMessage } from '@whiskeysockets/baileys';

export interface AudioMessage {
  url?: string;
  buffer?: Buffer;
  mimetype?: string;
  duration?: number;
  size?: number;
  isVoiceNote?: boolean; // PTT (Push to Talk)
  filename?: string;
}

export interface AudioResponse {
  success: boolean;
  data?: AudioData;
  error?: string;
}

export interface AudioData {
  fileId: string;
  filename: string;
  mimetype: string;
  duration: number;
  size: number;
  isVoiceNote: boolean;
  createdAt: Date;
  chatId: string;
  caption?: string;
}

export interface AudioBase64Response {
  success: boolean;
  data?: {
    base64: string;
    mimetype: string;
    duration?: number;
    isVoiceNote: boolean;
    filename: string;
    size: number;
  };
  error?: string;
}

export interface AudioInfoResponse {
  success: boolean;
  data?: AudioFileInfo;
  error?: string;
}

export interface AudioFileInfo {
  fileId: string;
  messageId: string;
  sessionId: string;
  chatId: string;
  mediaType: 'audio' | 'voice';
  filename: string;
  originalFilename?: string;
  mimetype: string;
  size: number;
  duration?: number;
  caption?: string;
  isVoiceNote: boolean;
  isAnimated?: boolean;
  createdAt: Date;
  audioInfo: {
    duration?: number;
    isVoiceNote: boolean;
    sampleRate?: number;
    channels?: number;
  };
}

export interface SendAudioRequest {
  sessionId: string;
  to: string;
  mediaFileId: string;
  caption?: string;
}

export interface SendAudioResponse {
  success: boolean;
  message: string;
  data?: {
    sessionId: string;
    to: string;
    mediaFileId: string;
    caption: string;
    audioInfo: {
      duration?: number;
      isVoiceNote: boolean;
      filename: string;
    };
  };
  error?: string;
}

export interface AudioListResponse {
  success: boolean;
  data: AudioListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    sessionId: string;
    audioType: string;
  };
  error?: string;
}

export interface AudioListItem {
  fileId: string;
  filename: string;
  mimetype: string;
  duration?: number;
  size: number;
  isVoiceNote: boolean;
  createdAt: Date;
  chatId: string;
  caption?: string;
}

export interface AudioProcessingOptions {
  // Configuración para ffmpeg si es necesario
  codec?: 'opus' | 'mp3' | 'aac';
  sampleRate?: number;
  channels?: number;
  bitrate?: number;
  
  // Para conversión a notas de voz
  optimizeForVoice?: boolean;
  
  // Metadata adicional
  title?: string;
  artist?: string;
}

export interface StreamDownloadOptions {
  chunkSize?: number;
  timeout?: number;
  headers?: Record<string, string>;
}

// Tipos para manejo de streams
export interface AudioStreamOptions {
  start?: number;
  end?: number;
  'cache-control'?: string;
  'accept-ranges'?: string;
}

// Convenciones de audio para WhatsApp
export const AUDIO_FORMATS = {
  VOICE_NOTE: {
    mimetype: 'audio/ogg; codecs=opus',
    codec: 'opus',
    sampleRate: 48000,
    channels: 1,
    extension: 'ogg',
    optimizedForVoice: true,
  },
  AUDIO_FILE: {
    mimetype: 'audio/mp4',
    codec: 'aac',
    sampleRate: 48000,
    channels: 1,
    extension: 'mp4',
    optimizedForVoice: false,
  },
  LEGACY_AUDIO: {
    mimetype: 'audio/mpeg',
    codec: 'mp3',
    sampleRate: 44100,
    channels: 2,
    extension: 'mp3',
    optimizedForVoice: false,
  },
} as const;

export type AudioFormat = typeof AUDIO_FORMATS[keyof typeof AUDIO_FORMATS];

// Métodos de utilidad para el servicio WhatsApp
export interface IWhatsAppAudioService {
  /**
   * Descargar audio como stream desde mensaje
   */
  downloadAudioAsStream(
    message: WAMessage,
    sessionId: string,
    options?: StreamDownloadOptions
  ): Promise<NodeJS.ReadableStream>;

  /**
   * Descargar audio como buffer desde mensaje
   */
  downloadAudioAsBuffer(
    message: WAMessage,
    sessionId: string,
    options?: StreamDownloadOptions
  ): Promise<Buffer>;

  /**
   * Enviar audio desde archivo local/ruta
   */
  sendAudioFromPath(
    sessionId: string,
    to: string,
    audioPath: string,
    options?: AudioProcessingOptions
  ): Promise<void>;

  /**
   * Enviar nota de voz desde archivo
   */
  sendVoiceNoteFromPath(
    sessionId: string,
    t0: string,
    audioPath: string,
    options?: AudioProcessingOptions
  ): Promise<void>;

  /**
   * Convertir audio a formato optimizado para WhatsApp
   */
  optimizeAudioForWhatsApp(
    inputBuffer: Buffer,
    targetFormat: AudioFormat,
    options?: AudioProcessingOptions
  ): Promise<Buffer>;
}
