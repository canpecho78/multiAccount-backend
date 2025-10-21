import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema({
  jid: { type: String, required: true }, // e.g. 12345@s.whatsapp.net
  sessionId: { type: String, required: true },
  name: { type: String, default: "Desconocido" },
  notify: { type: String, default: null },
  verifiedName: { type: String, default: null },
  imgUrl: { type: String, default: null },
  status: { type: String, default: null },
  isGroup: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Unicidad por sesión + jid
ContactSchema.index({ jid: 1, sessionId: 1 }, { unique: true });
ContactSchema.index({ sessionId: 1, name: 1 });

export type ContactDoc = mongoose.Document & {
  jid: string;
  sessionId: string;
  name: string;
  notify?: string | null;
  verifiedName?: string | null;
  imgUrl?: string | null;
  status?: string | null;
  isGroup: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const Contact = mongoose.model<ContactDoc>("Contact", ContactSchema);
