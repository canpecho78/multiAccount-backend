import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { Role } from "../models/Role";
import { env } from "../config/env";
import crypto from "crypto";
import { emailService } from "../services/emailService";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body as { email: string; password: string };
    if (!email || !password) return res.status(400).json({ success: false, error: "email y password requeridos" });

    const user = await User.findOne({ email }).populate("role");
    if (!user || !user.active) return res.status(401).json({ success: false, error: "Credenciales inválidas" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ success: false, error: "Credenciales inválidas" });

    const roleName = (user.role as any)?.name || "guest";
    const token = jwt.sign({ sub: user.id, role: roleName, name: user.name, email: user.email }, env.jwtSecret, { expiresIn: "12h" });

    res.json({ success: true, data: { token}});
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

/**
 * Solicitar reseteo de contraseña (genera token)
 */
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email: string };
    if (!email) return res.status(400).json({ success: false, error: "Email requerido" });

    const user = await User.findOne({ email });
    if (!user) {
      // Por seguridad, no revelar si el email existe o no
      return res.json({ success: true, message: "Si el email existe, recibirás instrucciones para resetear tu contraseña" });
    }

    // Generar token de reseteo (válido por 1 hora)
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = await bcrypt.hash(resetToken, 10);
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpiry = resetTokenExpiry;
    await user.save();

    // Enviar email con el token
    const emailSent = await emailService.sendPasswordResetEmail(
      user.email,
      resetToken,
      user.name
    );

    if (emailSent) {
      console.log(`✅ Email de reseteo enviado a ${email}`);
    } else {
      console.log(`⚠️ No se pudo enviar email a ${email} (SMTP no configurado)`);
      // En desarrollo, mostrar el token en consola
      if (env.nodeEnv === "development") {
        console.log(`🔑 Token de reseteo para ${email}: ${resetToken}`);
      }
    }

    res.json({ 
      success: true, 
      message: "Si el email existe, recibirás instrucciones para resetear tu contraseña",
      // SOLO PARA DESARROLLO - Remover en producción
      ...(env.nodeEnv === "development" && !emailSent && { resetToken })
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

/**
 * Resetear contraseña con token
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body as { token: string; newPassword: string };
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: "Token y nueva contraseña requeridos" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "La contraseña debe tener al menos 6 caracteres" });
    }

    // Buscar usuario con token válido
    const users = await User.find({ 
      resetPasswordToken: { $exists: true, $ne: null },
      resetPasswordExpiry: { $gt: new Date() }
    });

    let user = null;
    for (const u of users) {
      const isValid = await bcrypt.compare(token, u.resetPasswordToken!);
      if (isValid) {
        user = u;
        break;
      }
    }

    if (!user) {
      return res.status(400).json({ success: false, error: "Token inválido o expirado" });
    }

    // Actualizar contraseña
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    // Enviar email de confirmación
    await emailService.sendPasswordChangedEmail(user.email, user.name);

    res.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

/**
 * Admin resetea contraseña de usuario a una por defecto
 */
export const adminResetPassword = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { defaultPassword = "TempPassword123!" } = req.body as { defaultPassword?: string };

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }

    // Resetear a contraseña por defecto
    user.passwordHash = await bcrypt.hash(defaultPassword, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    // Enviar email con contraseña temporal
    await emailService.sendTemporaryPasswordEmail(
      user.email,
      defaultPassword,
      user.name
    );

    res.json({ 
      success: true, 
      message: "Contraseña reseteada correctamente",
      data: { 
        userId: user.id,
        email: user.email,
        defaultPassword // Devolver la contraseña temporal
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

/**
 * Usuario cambia su propia contraseña
 */
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.sub; // Del JWT
    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "Contraseña actual y nueva contraseña requeridas" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "La nueva contraseña debe tener al menos 6 caracteres" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "Usuario no encontrado" });
    }

    // Verificar contraseña actual
    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: "Contraseña actual incorrecta" });
    }

    // Actualizar contraseña
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Enviar email de confirmación
    await emailService.sendPasswordChangedEmail(user.email, user.name);

    res.json({ success: true, message: "Contraseña actualizada correctamente" });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};
