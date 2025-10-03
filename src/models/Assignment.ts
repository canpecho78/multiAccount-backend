import mongoose, { Schema } from "mongoose";

const AssignmentSchema = new Schema({
  sessionId: { type: String, required: true, index: true },
  chatId: { type: String, required: true, index: true },
  user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  active: { type: Boolean, default: true },
  assignedAt: { type: Date, default: Date.now },
  unassignedAt: { type: Date, default: null },
});

AssignmentSchema.index({ sessionId: 1, chatId: 1, user: 1, active: 1 }, { unique: true, partialFilterExpression: { active: true } });

export type AssignmentDoc = mongoose.Document & {
  sessionId: string;
  chatId: string;
  user: mongoose.Types.ObjectId;
  active: boolean;
  assignedAt: Date;
  unassignedAt: Date | null;
};

export const Assignment = mongoose.model<AssignmentDoc>("Assignment", AssignmentSchema);
