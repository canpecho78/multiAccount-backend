import { connectDB } from "../config/db";
import { Role } from "../models/Role";
import { User } from "../models/User";
import bcrypt from "bcryptjs";
import { env } from "../config/env";

async function main() {
  await connectDB();

  // Create roles
  const roleNames = ["administrator", "guest", "supervisor", "empleado"] as const;
  const rolesMap: Record<string, any> = {};

  for (const name of roleNames) {
    const role = await Role.findOneAndUpdate(
      { name },
      { name, active: true, updatedAt: new Date() },
      { upsert: true, new: true }
    );
    rolesMap[name] = role;
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
