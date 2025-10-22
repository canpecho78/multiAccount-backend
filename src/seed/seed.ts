import { connectDB } from "../config/db";
import { Role } from "../models/Role";
import { User } from "../models/User";
import bcrypt from "bcryptjs";
import { env } from "../config/env";

async function main() {
  await connectDB();

  console.log("🌱 Iniciando seed de roles del sistema...");

  // Definir roles del sistema con sus permisos
  const systemRoles = [
    {
      name: "administrator",
      displayName: "Administrator",
      description: "Full system access with all permissions",
      permissions: [
        'users.view', 'users.create', 'users.edit', 'users.delete', 'users.manage_roles',
        'contacts.view', 'contacts.sync', 'contacts.export',
        'chats.view', 'chats.send', 'chats.assign', 'chats.view_all',
        'sessions.view', 'sessions.create', 'sessions.delete', 'sessions.manage',
        'analytics.view', 'analytics.export',
        'settings.view', 'settings.edit'
      ],
      isSystem: true,
      active: true
    },
    {
      name: "supervisor",
      displayName: "Supervisor",
      description: "Can manage users, view all chats, and assign conversations",
      permissions: [
        'users.view',
        'contacts.view', 'contacts.sync',
        'chats.view', 'chats.send', 'chats.assign', 'chats.view_all',
        'sessions.view',
        'analytics.view',
        'settings.view'
      ],
      isSystem: true,
      active: true
    },
    {
      name: "empleado",
      displayName: "Employee",
      description: "Can view and respond to assigned chats",
      permissions: [
        'contacts.view',
        'chats.view', 'chats.send',
        'sessions.view'
      ],
      isSystem: true,
      active: true
    },
    {
      name: "guest",
      displayName: "Guest",
      description: "Read-only access to basic features",
      permissions: [
        'contacts.view',
        'chats.view',
        'sessions.view'
      ],
      isSystem: true,
      active: true
    }
  ];

  // Crear/actualizar roles del sistema
  const rolesMap: Record<string, any> = {};

  for (const roleData of systemRoles) {
    const role = await Role.findOneAndUpdate(
      { name: roleData.name, isSystem: true },
      { ...roleData, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    rolesMap[roleData.name] = role;
    console.log(`✅ Rol del sistema creado/actualizado: ${roleData.displayName}`);
  }

  // Create admin user
  const adminName = process.env.ADMIN_NAME || "Admin";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await User.findOneAndUpdate(
    { email: adminEmail },
    { name: adminName, email: adminEmail, passwordHash, role: rolesMap["administrator"]._id, active: true, updatedAt: new Date() },
    { upsert: true, new: true }
  );

  console.log("✅ Seed completado: roles y usuario administrador creados/actualizados");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error en seed:", err);
  process.exit(1);
});
