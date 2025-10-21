// Clean API exports for WhatsApp service modules
export { makeSocket, getStore } from './socketFactory';
export { getProfilePictureUsingSock } from './profile';
export { sendMessageUsingSock } from './sendMessage';
export { generateQrForSession } from './qr';
export { bindConnectionHandlers } from './events/connection';
export { bindMessageHandlers } from './events/messages';
export { bindContactHandlers } from './events/contacts';

// Re-export main service
export { whatsappService } from '../whatsappService';
