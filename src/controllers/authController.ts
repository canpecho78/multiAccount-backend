import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { env } from "../config/env";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return res.status(400).json({ success: false, error: "email y password requeridos" });

    const user = await User.findOne({ email }).populate("role");
    if (!user || !user.active) return res.status(401).json({ success: false, error: "Credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ success: false, error: "Credenciales inválidas" });

    const roleName = (user.role as any)?.name || "guest";
    const token = jwt.sign({ sub: user.id, role: roleName }, env.jwtSecret, { expiresIn: "12h" });

    res.json({ success: true, data: { token, user: { id: user.id, name: user.name, email: user.email, role: roleName } } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, roleName = "guest" } = req.body as { name: string; email: string; password: string; roleName?: string };
    if (!name || !email || !password) return res.status(400).json({ success: false, error: "name, email y password requeridos" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ success: false, error: "Email ya registrado" });

    const role = await Role.findOne({ name: roleName });
    if (!role || !role.active) return res.status(400).json({ success: false, error: "Rol inválido" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, passwordHash, role: role._id, active: true });

    res.status(201).json({ success: true, data: { id: user.id, name: user.name, email: user.email, role: role.name } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};
