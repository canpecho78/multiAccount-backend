import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || "5001", 10),
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/whatsapp-multi-session",
  nodeEnv: process.env.NODE_ENV || "development",
  authStorage: (process.env.AUTH_STORAGE || "mongo").toLowerCase() as "file" | "mongo",
  authBasePath: process.env.AUTH_BASE_PATH || "auth_info",
  jwtSecret: process.env.JWT_SECRET || "change-me-in-prod",
  // Feature flags / behavior
  allowGroups: String(process.env.ALLOW_GROUPS || "false").toLowerCase() === "true",
  
  // SMTP Configuration
  smtpHost: process.env.SMTP_HOST || "",
  smtpPort: parseInt(process.env.SMTP_PORT || "587", 10),
  smtpSecure: process.env.SMTP_SECURE === "true", // true para puerto 465
  smtpUser: process.env.SMTP_USER || "",
  smtpPass: process.env.SMTP_PASS || "",
  smtpFromEmail: process.env.SMTP_FROM_EMAIL || "noreply@example.com",
  smtpFromName: process.env.SMTP_FROM_NAME || "WhatsApp Multi-Sesiones",
  
  // Frontend URL (para enlaces en emails)
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
};
