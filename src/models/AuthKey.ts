import mongoose, { Schema } from "mongoose";

const AuthKeySchema = new Schema({
  sessionId: { type: String, required: true, index: true },
  type: { type: String, required: true },
  id: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now },
});

AuthKeySchema.index({ sessionId: 1, type: 1, id: 1 }, { unique: true });

export type AuthKeyDoc = mongoose.Document & {
  sessionId: string;
  type: string;
  id: string;
  value: any;
  updatedAt: Date;
};

export const AuthKey = mongoose.model<AuthKeyDoc>("AuthKey", AuthKeySchema);
