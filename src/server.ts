import http from "http";
import { Server as IOServer } from "socket.io";
import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { registerSocketHandlers } from "./sockets";
import { whatsappService } from "./services/whatsappService";
import { cleanupService } from "./services/cleanupService";

async function bootstrap() {
  await connectDB();

  const server = http.createServer(app);
  const io = new IOServer(server, { cors: { origin: "*" } });
  whatsappService.setSocket(io);
  registerSocketHandlers(io);

  server.listen(env.port, async () => {
    console.log(`✅ Backend corriendo en http://localhost:${env.port}`);
    
    // Inicializar sesiones existentes
    setTimeout(() => whatsappService.initializeExistingSessions(), 2000);
    
    // Iniciar servicio de limpieza automática
    setTimeout(() => cleanupService.start(), 5001);
  });

  // Manejo de cierre graceful
  process.on("SIGINT", () => {
    console.log("\n🛑 Cerrando servidor...");
    cleanupService.stop();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    console.log("\n🛑 Cerrando servidor...");
    cleanupService.stop();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error("❌ Error al iniciar el servidor:", err);
  process.exit(1);
});
