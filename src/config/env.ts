import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT || "5000", 10),
  mongodbUri: process.env.MONGODB_URI || "mongodb://localhost:27017/whatsapp-multi-session",
  nodeEnv: process.env.NODE_ENV || "development",
  authStorage: (process.env.AUTH_STORAGE || "file").toLowerCase() as "file" | "mongo",
  authBasePath: process.env.AUTH_BASE_PATH || "auth_info",
  jwtSecret: process.env.JWT_SECRET || "change-me-in-prod",
};
