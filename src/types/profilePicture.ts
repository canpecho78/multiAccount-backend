/**
 * Interfaces para la gestión de fotos de perfil de WhatsApp
 */

export interface ProfilePictureResponse {
  success: boolean;
  data?: ProfilePictureData;
  message?: string;
  error?: string;
}

export interface ProfilePictureData {
  jid: string;
  fileId: string;
  url: string;
  lowRes: string;
  highRes: string;
  cached: boolean;
  createdAt: Date;
}

export interface MultipleProfilePicturesRequest {
  sessionId: string;
  contacts: string[];
  refresh?: boolean;
}

export interface MultipleProfilePicturesResponse {
  success: boolean;
  data: ProfilePictureData[];
  meta: {
    total: number;
    successful: number;
    failed: number;
    sessionId: string;
  };
  error?: string;
}

export interface ProfilePictureItem {
  jid: string;
  fileId?: string;
  url?: string;
  lowRes?: string;
  highRes?: string;
  cached?: boolean;
  createdAt?: Date;
  error?: string;
}

export interface RefreshProfilePictureResponse {
  success: boolean;
  message: string;
  data?: {
    jid: string;
    fileId: string;
    url: string;
  };
  error?: string;
}
