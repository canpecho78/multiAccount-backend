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
});

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
};

export const Chat = mongoose.model<ChatDoc>("Chat", ChatSchema);
