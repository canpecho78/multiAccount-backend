import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models/User";
import { Role } from "../models/Role";

export interface JwtPayload {
  sub: string; // user id
  role: string; // role name
}

export function verifyJWT(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: "Token requerido" });

    const decoded = jwt.verify(token, env.jwtSecret) as JwtPayload;
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Token inválido" });
  }
}

export function requireRoles(...roles: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtPayload | undefined;
    if (!user) return res.status(401).json({ success: false, error: "No autenticado" });

    // allow if role matches
    if (roles.includes(user.role)) return next();

    // load user to check if role still active
    const dbUser = await User.findById(user.sub).populate("role");
    const roleName = (dbUser?.role as any)?.name;
    if (roleName && roles.includes(roleName)) return next();

    return res.status(403).json({ success: false, error: "No autorizado" });
  };
}
