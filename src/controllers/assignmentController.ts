import { Request, Response } from "express";
import { Assignment } from "../models/Assignment";
import { User } from "../models/User";

// Assign a chat to a user
export const assignChat = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { chatId, userId } = req.body as { chatId: string; userId: string };
  if (!chatId || !userId) return res.status(400).json({ success: false, error: "chatId y userId requeridos" });

  const user = await User.findById(userId).populate("role");
  if (!user || !user.active) return res.status(400).json({ success: false, error: "Usuario inválido" });

  const doc = await Assignment.findOneAndUpdate(
    { sessionId, chatId, user: userId, active: true },
    { sessionId, chatId, user: userId, active: true, assignedAt: new Date(), unassignedAt: null },
    { upsert: true, new: true }
  );

  res.status(201).json({ success: true, data: doc });
};

// Unassign a chat from a user
export const unassignChat = async (req: Request, res: Response) => {
  const { sessionId, assignmentId } = req.params as { sessionId: string; assignmentId: string };

  const doc = await Assignment.findOneAndUpdate(
    { _id: assignmentId, sessionId, active: true },
    { active: false, unassignedAt: new Date() },
    { new: true }
  );
  if (!doc) return res.status(404).json({ success: false, error: "Asignación no encontrada" });
  res.json({ success: true, data: doc });
};

// List assignments by session and optional chatId or userId
export const listAssignments = async (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const { chatId, userId, active } = req.query as { chatId?: string; userId?: string; active?: string };
  const filter: any = { sessionId };
  if (chatId) filter.chatId = chatId;
  if (userId) filter.user = userId;
  if (active !== undefined) filter.active = active === "true";

  const docs = await Assignment.find(filter).populate("user").sort({ assignedAt: -1 });
  res.json({ success: true, data: docs });
};

// List chats assigned to a specific user for a session
export const listUserAssignedChats = async (req: Request, res: Response) => {
  const { sessionId, userId } = req.params as { sessionId: string; userId: string };
  const docs = await Assignment.find({ sessionId, user: userId, active: true }).sort({ assignedAt: -1 });
  res.json({ success: true, data: docs });
};

// List chats assigned to the authenticated user (me)
export const listMyAssignedChats = async (req: Request, res: Response) => {
  const { sessionId } = req.params as { sessionId: string };
  const authUser = (req as any).user as { sub: string } | undefined;
  if (!authUser) return res.status(401).json({ success: false, error: "No autenticado" });
  const docs = await Assignment.find({ sessionId, user: authUser.sub, active: true }).sort({ assignedAt: -1 });
  res.json({ success: true, data: docs });
};
