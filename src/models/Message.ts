import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
  messageId: { type: String, required: true },
  chatId: { type: String, required: true },
  sessionId: { type: String, required: true },
  from: { type: String, required: true },
  to: { type: String, required: true },
  body: { type: String, required: true },
  fromMe: { type: Boolean, required: true },
  timestamp: { type: Date, default: Date.now },
  messageType: { type: String, default: "conversation" },
  status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" },
  createdAt: { type: Date, default: Date.now },
});

export type MessageDoc = mongoose.Document & {
  messageId: string;
  chatId: string;
  sessionId: string;
  from: string;
  to: string;
  body: string;
  fromMe: boolean;
  timestamp: Date;
  messageType: string;
  status: "sent" | "delivered" | "read";
  createdAt: Date;
};

export const Message = mongoose.model<MessageDoc>("Message", MessageSchema);
