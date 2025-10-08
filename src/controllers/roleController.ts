import { Request, Response } from "express";
import { Role } from "../models/Role";

export const listRoles = async (_req: Request, res: Response) => {
    const roles = await Role.find({}).sort({ name: 1 });
    res.json({ success: true, data: roles });
};

export const getRole = async (req: Request, res: Response) => {
    const role = await Role.findById(req.params.id);
    if (!role) return res.status(404).json({ success: false, error: "Rol no encontrado" });
    res.json({ success: true, data: role });
};

export const createRole = async (req: Request, res: Response) => {
    const { name, description = "", active = true } = req.body as { name: string; description?: string; active?: boolean };
    if (!name) return res.status(400).json({ success: false, error: "name requerido" });
    const exists = await Role.findOne({ name });
    if (exists) return res.status(409).json({ success: false, error: "Rol ya existe" });
    const role = await Role.create({ name, description, active });
    res.status(201).json({ success: true, data: role });
};

export const updateRole = async (req: Request, res: Response) => {
    const { name, description, active } = req.body as { name?: string; description?: string; active?: boolean };
    const role = await Role.findByIdAndUpdate(
        req.params.id,
        { $set: { ...(name !== undefined && { name }), ...(description !== undefined && { description }), ...(active !== undefined && { active }), updatedAt: new Date() } },
        { new: true }
    );
    if (!role) return res.status(404).json({ success: false, error: "Rol no encontrado" });
    res.json({ success: true, data: role });
};

export const deleteRole = async (req: Request, res: Response) => {
    const role = await Role.findByIdAndDelete(req.params.id);
    if (!role) return res.status(404).json({ success: false, error: "Rol no encontrado" });
    res.json({ success: true });
};
