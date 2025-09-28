import mongoose, { Schema } from "mongoose";

const AuthStateSchema = new Schema({
  sessionId: { type: String, required: true, unique: true },
  creds: { type: Schema.Types.Mixed, required: true },
  updatedAt: { type: Date, default: Date.now },
});

export type AuthStateDoc = mongoose.Document & {
  sessionId: string;
  creds: any;
  updatedAt: Date;
};

export const AuthState = mongoose.model<AuthStateDoc>("AuthState", AuthStateSchema);
