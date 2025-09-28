import mongoose from "mongoose";
import { env } from "../config/env";

export async function connectDB() {
  const uri = env.mongodbUri;
  try {
    await mongoose.connect(uri);
    console.log("✅ MongoDB conectado");
  } catch (error) {
    console.error("❌ Error conectando MongoDB:", error);
    throw error;
  }
}
