import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { User } from "../models/User";
import { Role, Permission } from "../models/Role";

export interface JwtPayload {
  sub: string; // user id
  role: string; // role name
}

/**
 * Middleware para verificar el token JWT
 */
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

/**
 * Middleware para verificar roles específicos (legacy)
 * @deprecated Usar checkPermission en su lugar para control granular
 */
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

/**
 * Middleware para verificar permisos específicos
 * @param requiredPermission - Permiso requerido para acceder al endpoint
 */
export function checkPermission(requiredPermission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as JwtPayload | undefined;
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: "No autenticado" 
        });
      }

      // Cargar usuario desde la base de datos
      const dbUser = await User.findById(user.sub).populate("role");
      
      if (!dbUser || !dbUser.active) {
        return res.status(403).json({ 
          success: false, 
          error: "Usuario no autorizado" 
        });
      }

      // Obtener el rol del usuario
      const userRole = dbUser.role as any;
      
      if (!userRole) {
        return res.status(403).json({ 
          success: false, 
          error: "Usuario sin rol asignado" 
        });
      }

      // Los administradores tienen todos los permisos
      if (userRole.name === "administrator") {
        return next();
      }

      // Verificar si el rol está activo
      if (!userRole.active) {
        return res.status(403).json({ 
          success: false, 
          error: "Rol inactivo" 
        });
      }

      // Verificar si el usuario tiene el permiso requerido
      const permissions = userRole.permissions || [];
      
      if (permissions.includes(requiredPermission)) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: "No tienes permiso para realizar esta acción",
        requiredPermission
      });
      
    } catch (error) {
      console.error("Error en checkPermission:", error);
      return res.status(500).json({
        success: false,
        error: "Error al verificar permisos"
      });
    }
  };
}

/**
 * Middleware para verificar múltiples permisos (requiere al menos uno)
 * @param requiredPermissions - Lista de permisos, el usuario debe tener al menos uno
 */
export function checkAnyPermission(...requiredPermissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as JwtPayload | undefined;
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: "No autenticado" 
        });
      }

      const dbUser = await User.findById(user.sub).populate("role");
      
      if (!dbUser || !dbUser.active) {
        return res.status(403).json({ 
          success: false, 
          error: "Usuario no autorizado" 
        });
      }

      const userRole = dbUser.role as any;
      
      if (!userRole) {
        return res.status(403).json({ 
          success: false, 
          error: "Usuario sin rol asignado" 
        });
      }

      // Los administradores tienen todos los permisos
      if (userRole.name === "administrator") {
        return next();
      }

      if (!userRole.active) {
        return res.status(403).json({ 
          success: false, 
          error: "Rol inactivo" 
        });
      }

      const permissions = userRole.permissions || [];
      
      // Verificar si tiene al menos uno de los permisos requeridos
      const hasPermission = requiredPermissions.some(p => permissions.includes(p));
      
      if (hasPermission) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: "No tienes permiso para realizar esta acción",
        requiredPermissions
      });
      
    } catch (error) {
      console.error("Error en checkAnyPermission:", error);
      return res.status(500).json({
        success: false,
        error: "Error al verificar permisos"
      });
    }
  };
}

/**
 * Middleware para verificar múltiples permisos (requiere todos)
 * @param requiredPermissions - Lista de permisos, el usuario debe tener todos
 */
export function checkAllPermissions(...requiredPermissions: Permission[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = (req as any).user as JwtPayload | undefined;
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          error: "No autenticado" 
        });
      }

      const dbUser = await User.findById(user.sub).populate("role");
      
      if (!dbUser || !dbUser.active) {
        return res.status(403).json({ 
          success: false, 
          error: "Usuario no autorizado" 
        });
      }

      const userRole = dbUser.role as any;
      
      if (!userRole) {
        return res.status(403).json({ 
          success: false, 
          error: "Usuario sin rol asignado" 
        });
      }

      // Los administradores tienen todos los permisos
      if (userRole.name === "administrator") {
        return next();
      }

      if (!userRole.active) {
        return res.status(403).json({ 
          success: false, 
          error: "Rol inactivo" 
        });
      }

      const permissions = userRole.permissions || [];
      
      // Verificar si tiene todos los permisos requeridos
      const hasAllPermissions = requiredPermissions.every(p => permissions.includes(p));
      
      if (hasAllPermissions) {
        return next();
      }

      return res.status(403).json({
        success: false,
        error: "No tienes todos los permisos necesarios para realizar esta acción",
        requiredPermissions
      });
      
    } catch (error) {
      console.error("Error en checkAllPermissions:", error);
      return res.status(500).json({
        success: false,
        error: "Error al verificar permisos"
      });
    }
  };
}
