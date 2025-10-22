import { Request, Response } from "express";
import { Role, PERMISSIONS, Permission } from "../models/Role";
import { User } from "../models/User";
import { logAction } from "./adminController";

/**
 * Listar todos los roles
 */
export const listRoles = async (req: Request, res: Response) => {
  try {
    const roles = await Role.find({}).sort({ name: 1 });
    res.json({ success: true, data: roles });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

/**
 * Obtener un rol por ID
 */
export const getRole = async (req: Request, res: Response) => {
  try {
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, error: "Rol no encontrado" });
    }
    res.json({ success: true, data: role });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

/**
 * Crear un nuevo rol
 */
export const createRole = async (req: Request, res: Response) => {
  try {
    console.log('📥 [CREATE ROLE] Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      name,
      displayName,
      description = "",
      permissions = [],
      active = true,
      isSystem = false
    } = req.body as {
      name: string;
      displayName: string;
      description?: string;
      permissions?: string[];
      active?: boolean;
      isSystem?: boolean;
    };

    console.log('🔍 [CREATE ROLE] Parsed data:', { name, displayName, description, permissions, active, isSystem });

    // Validaciones
    if (!name) {
      console.log('❌ [CREATE ROLE] Error: name es requerido');
      return res.status(400).json({ success: false, error: "name es requerido" });
    }
    if (!displayName) {
      console.log('❌ [CREATE ROLE] Error: displayName es requerido');
      return res.status(400).json({ success: false, error: "displayName es requerido" });
    }

    // No permitir crear roles del sistema manualmente
    if (isSystem) {
      console.log('❌ [CREATE ROLE] Error: Intento de crear rol del sistema');
      return res.status(400).json({
        success: false,
        error: "No se pueden crear roles del sistema manualmente"
      });
    }

    // Verificar que el nombre no exista
    const normalizedName = name.toLowerCase().trim();
    console.log('🔍 [CREATE ROLE] Checking if role exists:', normalizedName);
    const exists = await Role.findOne({ name: normalizedName });
    if (exists) {
      console.log('❌ [CREATE ROLE] Error: El rol ya existe:', exists._id);
      return res.status(409).json({ success: false, error: "El rol ya existe" });
    }

    // Validar permisos
    console.log('🔍 [CREATE ROLE] Validating permissions:', permissions);
    const invalidPermissions = permissions.filter(
      (p) => !PERMISSIONS.includes(p as Permission)
    );
    if (invalidPermissions.length > 0) {
      console.log('❌ [CREATE ROLE] Error: Permisos inválidos:', invalidPermissions);
      return res.status(400).json({
        success: false,
        error: `Permisos inválidos: ${invalidPermissions.join(", ")}`
      });
    }

    // Crear rol
    const roleData = {
      name: normalizedName,
      displayName,
      description,
      permissions,
      isSystem: false,
      active
    };
    console.log('💾 [CREATE ROLE] Creating role with data:', roleData);
    
    const role = await Role.create(roleData);
    console.log('✅ [CREATE ROLE] Role created successfully:', role._id, role.name);

    // Log de acción
    try {
      const user = (req as any).user;
      await logAction(
        user?.sub,
        "create",
        "roles",
        { roleId: role._id, name: role.name },
        true
      );
    } catch (logError) {
      console.log('⚠️ [CREATE ROLE] Error logging action:', logError);
    }

    console.log('📤 [CREATE ROLE] Sending response:', { success: true, data: role });
    res.status(201).json({ success: true, data: role });
  } catch (error) {
    console.error('💥 [CREATE ROLE] Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

/**
 * Actualizar un rol existente
 */
export const updateRole = async (req: Request, res: Response) => {
  try {
    console.log('📥 [UPDATE ROLE] Request params:', req.params);
    console.log('📥 [UPDATE ROLE] Request body:', JSON.stringify(req.body, null, 2));
    
    const {
      displayName,
      description,
      permissions,
      active
    } = req.body as {
      displayName?: string;
      description?: string;
      permissions?: string[];
      active?: boolean;
    };

    console.log('🔍 [UPDATE ROLE] Parsed data:', { displayName, description, permissions, active });

    // Buscar el rol
    console.log('🔍 [UPDATE ROLE] Finding role by ID:', req.params.id);
    const role = await Role.findById(req.params.id);
    if (!role) {
      console.log('❌ [UPDATE ROLE] Error: Rol no encontrado');
      return res.status(404).json({ success: false, error: "Rol no encontrado" });
    }
    console.log('✅ [UPDATE ROLE] Role found:', role.name, 'isSystem:', role.isSystem);

    // No permitir editar roles del sistema
    if (role.isSystem) {
      console.log('❌ [UPDATE ROLE] Error: Intento de editar rol del sistema');
      return res.status(403).json({
        success: false,
        error: "No se pueden editar roles del sistema"
      });
    }

    // Validar permisos si se proporcionan
    if (permissions) {
      console.log('🔍 [UPDATE ROLE] Validating permissions:', permissions);
      const invalidPermissions = permissions.filter(
        (p) => !PERMISSIONS.includes(p as Permission)
      );
      if (invalidPermissions.length > 0) {
        console.log('❌ [UPDATE ROLE] Error: Permisos inválidos:', invalidPermissions);
        return res.status(400).json({
          success: false,
          error: `Permisos inválidos: ${invalidPermissions.join(", ")}`
        });
      }
    }

    // Actualizar solo los campos proporcionados
    const updateData: any = { updatedAt: new Date() };
    if (displayName !== undefined) updateData.displayName = displayName;
    if (description !== undefined) updateData.description = description;
    if (permissions !== undefined) updateData.permissions = permissions;
    if (active !== undefined) updateData.active = active;

    console.log('💾 [UPDATE ROLE] Update data:', updateData);
    console.log('💾 [UPDATE ROLE] Updating role in database...');
    
    const updatedRole = await Role.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true }
    );

    console.log('✅ [UPDATE ROLE] Role updated successfully:', updatedRole?._id, updatedRole?.name);
    console.log('📊 [UPDATE ROLE] Updated role data:', JSON.stringify(updatedRole, null, 2));

    // Log de acción
    try {
      const user = (req as any).user;
      await logAction(
        user?.sub,
        "update",
        "roles",
        { roleId: updatedRole?._id, changes: updateData },
        true
      );
    } catch (logError) {
      console.log('⚠️ [UPDATE ROLE] Error logging action:', logError);
    }

    console.log('📤 [UPDATE ROLE] Sending response');
    res.json({ success: true, data: updatedRole });
  } catch (error) {
    console.error('💥 [UPDATE ROLE] Error:', error);
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

/**
 * Eliminar un rol
 */
export const deleteRole = async (req: Request, res: Response) => {
  try {
    // Buscar el rol
    const role = await Role.findById(req.params.id);
    if (!role) {
      return res.status(404).json({ success: false, error: "Rol no encontrado" });
    }

    // No permitir eliminar roles del sistema
    if (role.isSystem) {
      return res.status(403).json({
        success: false,
        error: "No se pueden eliminar roles del sistema"
      });
    }

    // Verificar que no haya usuarios asignados a este rol
    const usersWithRole = await User.countDocuments({ role: role._id });
    if (usersWithRole > 0) {
      return res.status(409).json({
        success: false,
        error: `No se puede eliminar el rol. Hay ${usersWithRole} usuario(s) asignado(s) a este rol`
      });
    }

    // Eliminar el rol
    await Role.findByIdAndDelete(req.params.id);

    // Log de acción
    try {
      const user = (req as any).user;
      await logAction(
        user?.sub,
        "delete",
        "roles",
        { roleId: role._id, name: role.name },
        true
      );
    } catch {}

    res.json({ success: true, message: "Rol eliminado exitosamente" });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};

/**
 * Obtener todos los permisos disponibles
 */
export const getAvailablePermissions = async (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: PERMISSIONS });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
};
