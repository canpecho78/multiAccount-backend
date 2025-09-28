import http from "http";
import { Server as IOServer } from "socket.io";
import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { registerSocketHandlers } from "./sockets";
import { whatsappService } from "./services/whatsappService";

async function bootstrap() {
  await connectDB();

  const server = http.createServer(app);
  const io = new IOServer(server, { cors: { origin: "*" } });
  whatsappService.setSocket(io);
  registerSocketHandlers(io);

  server.listen(env.port, async () => {
    console.log(`✅ Backend corriendo en http://localhost:${env.port}`);
    setTimeout(() => whatsappService.initializeExistingSessions(), 2000);
  });

  // Limpieza periódica de sesiones en memoria
  setInterval(() => {
    const all = whatsappService.getAllSessions();
    const now = Date.now();
    for (const [sessionId, data] of Object.entries(all)) {
      const diff = now - data.lastSeen.getTime();
      if (diff > 5 * 60 * 1000 && !data.isConnected) {
        console.log(`🧹 Limpiando sesión inactiva: ${sessionId}`);
        // Mantener en memoria si se desea reconexión; aquí solo logueamos
      }
    }
  }, 5 * 60 * 1000);
}

bootstrap().catch((err) => {
  console.error("❌ Error al iniciar el servidor:", err);
  process.exit(1);
});
