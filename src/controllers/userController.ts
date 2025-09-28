import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { User } from "../models/User";
import { Role } from "../models/Role";

export const listUsers = async (req: Request, res: Response) => {
  const page = Math.max(1, Number(req.query.page || 1));
  const limit = Math.max(1, Math.min(100, Number(req.query.limit || 20)));
  const filter: any = {};
  if (req.query.active !== undefined) filter.active = req.query.active === "true";

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .populate("role")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  res.json({
    success: true,
    data: users.map((u) => ({ id: u.id, name: u.name, email: u.email, role: (u.role as any)?.name, active: u.active })),
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
};

export const getUser = async (req: Request, res: Response) => {
  const user = await User.findById(req.params.id).populate("role");
  if (!user) return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: (user.role as any)?.name, active: user.active } });
};

export const createUser = async (req: Request, res: Response) => {
  const { name, email, password, roleName } = req.body as { name: string; email: string; password: string; roleName: string };
  if (!name || !email || !password || !roleName) return res.status(400).json({ success: false, error: "name, email, password, roleName requeridos" });
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ success: false, error: "Email ya registrado" });
  const role = await Role.findOne({ name: roleName, active: true });
  if (!role) return res.status(400).json({ success: false, error: "Rol inválido" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash, role: role._id, active: true });
  res.status(201).json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: role.name, active: user.active } });
};

export const updateUser = async (req: Request, res: Response) => {
  const { name, email, password, roleName, active } = req.body as { name?: string; email?: string; password?: string; roleName?: string; active?: boolean };
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (email !== undefined) updates.email = email;
  if (password !== undefined) updates.passwordHash = await bcrypt.hash(password, 10);
  if (active !== undefined) updates.active = active;
  if (roleName !== undefined) {
    const role = await Role.findOne({ name: roleName });
    if (!role) return res.status(400).json({ success: false, error: "Rol inválido" });
    updates.role = role._id;
  }
  updates.updatedAt = new Date();

  const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true }).populate("role");
  if (!user) return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: (user.role as any)?.name, active: user.active } });
};

export const deleteUser = async (req: Request, res: Response) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  res.json({ success: true });
};

export const changeUserRole = async (req: Request, res: Response) => {
  const { roleName } = req.body as { roleName: string };
  if (!roleName) return res.status(400).json({ success: false, error: "roleName requerido" });
  const role = await Role.findOne({ name: roleName, active: true });
  if (!role) return res.status(400).json({ success: false, error: "Rol inválido" });
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { role: role._id, updatedAt: new Date() } }, { new: true }).populate("role");
  if (!user) return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: (user.role as any)?.name, active: user.active } });
};

export const activateUser = async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { active: true, updatedAt: new Date() } }, { new: true }).populate("role");
  if (!user) return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: (user.role as any)?.name, active: user.active } });
};

export const deactivateUser = async (req: Request, res: Response) => {
  const user = await User.findByIdAndUpdate(req.params.id, { $set: { active: false, updatedAt: new Date() } }, { new: true }).populate("role");
  if (!user) return res.status(404).json({ success: false, error: "Usuario no encontrado" });
  res.json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: (user.role as any)?.name, active: user.active } });
};
