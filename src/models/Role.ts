import mongoose, { Schema } from "mongoose";

const RoleSchema = new Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String, default: "" },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export type RoleDoc = mongoose.Document & {
  name: string;
  description?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export const Role = mongoose.model<RoleDoc>("Role", RoleSchema);
