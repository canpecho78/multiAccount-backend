import { Media } from "../../models/Media";
import { Message } from "../../models/Message";
import { Chat } from "../../models/Chat";
import { sessionManager } from "../sessionManager";

export type SendMediaOptions = {
  mediaFileId?: string;
  caption?: string;
  mediaType?: 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'voice';
  fileBuffer?: Buffer;
  filename?: string;
  mimetype?: string;
};

export async function sendMessageUsingSock(
  sessionId: string,
  sock: any,
  to: string,
  text: string,
  options?: SendMediaOptions
) {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  if (options?.mediaFileId) {
    const mediaDoc = await Media.findOne({ fileId: options.mediaFileId });
    if (!mediaDoc) throw new Error(`Media file not found: ${options.mediaFileId}`);

    const buffer = mediaDoc.data;
    const mediaOptions: any = {};

    switch (mediaDoc.mediaType) {
      case "image":
        mediaOptions.image = buffer;
        mediaOptions.caption = options.caption || text;
        break;
      case "video":
        mediaOptions.video = buffer;
        mediaOptions.caption = options.caption || text;
        break;
      case "audio":
      case "voice":
        mediaOptions.audio = buffer;
        mediaOptions.mimetype = mediaDoc.mimetype;
        mediaOptions.ptt = mediaDoc.isVoiceNote;
        break;
      case "document":
        mediaOptions.document = buffer;
        mediaOptions.fileName = mediaDoc.originalFilename || mediaDoc.filename;
        mediaOptions.mimetype = mediaDoc.mimetype;
        break;
      case "sticker":
        mediaOptions.sticker = buffer;
        break;
    }

    await sock.sendMessage(to, mediaOptions);
  } else if (options?.fileBuffer && options.mediaType) {
    const mediaOptions: any = { caption: options.caption || text };
    switch (options.mediaType) {
      case 'image':
        mediaOptions.image = options.fileBuffer;
        break;
      case 'video':
        mediaOptions.video = options.fileBuffer;
        break;
      case 'audio':
      case 'voice':
        mediaOptions.audio = options.fileBuffer;
        mediaOptions.mimetype = options.mimetype || 'audio/mp4';
        if (options.mediaType === 'voice') mediaOptions.ptt = true;
        break;
      case 'document':
        mediaOptions.document = options.fileBuffer;
        mediaOptions.fileName = options.filename || 'document';
        mediaOptions.mimetype = options.mimetype || 'application/octet-stream';
        break;
      case 'sticker':
        mediaOptions.sticker = options.fileBuffer;
        break;
    }

    await sock.sendMessage(to, mediaOptions);

    const mediaId = options.mediaFileId || `media_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    await Media.create({
      fileId: mediaId,
      messageId,
      sessionId,
      chatId: to,
      mediaType: options.mediaType === 'voice' ? 'audio' : (options.mediaType || 'document'),
      filename: options.filename || 'unknown',
      originalFilename: options.filename || null,
      mimetype: options.mimetype || 'application/octet-stream',
      size: options.fileBuffer.length,
      data: options.fileBuffer,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await sock.sendMessage(to, { text });
  }

  await Message.create({
    messageId,
    chatId: to,
    sessionId,
    from: sessionId,
    to,
    body: text,
    fromMe: true,
    timestamp: new Date(),
    status: "sent",
    mediaUrl: options?.mediaFileId || null,
  });

  await sessionManager.incrementMessageCount(sessionId, "sent");

  await Chat.findOneAndUpdate(
    { chatId: to, sessionId },
    { lastMessage: text, lastMessageTime: new Date(), updatedAt: new Date() },
    { upsert: true }
  );

  return { messageId };
}
