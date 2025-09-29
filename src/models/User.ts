import mongoose, { Schema } from "mongoose";

const UserSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: Schema.Types.ObjectId, ref: "Role", required: true },
  active: { type: Boolean, default: true },
  
  // Campos para reseteo de contraseña
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpiry: { type: Date, default: null },
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export type UserDoc = mongoose.Document & {
  name: string;
  email: string;
  passwordHash: string;
  role: mongoose.Types.ObjectId;
  active: boolean;
  
  // Campos para reseteo de contraseña
  resetPasswordToken?: string;
  resetPasswordExpiry?: Date;
  
  createdAt: Date;
  updatedAt: Date;
};

export const User = mongoose.model<UserDoc>("User", UserSchema);
