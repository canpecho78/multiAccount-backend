import mongoose from "mongoose";

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  isConnected: { type: Boolean, default: false },
  lastActivity: { type: Date, default: Date.now },
  qrCode: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export type SessionDoc = mongoose.Document & {
  sessionId: string;
  name: string;
  phone: string;
  isConnected: boolean;
  lastActivity: Date;
  qrCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export const Session = mongoose.model<SessionDoc>("Session", SessionSchema);
