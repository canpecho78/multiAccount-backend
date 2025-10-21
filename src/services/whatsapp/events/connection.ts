import { ConnectionState, DisconnectReason } from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode";
import { Server as IOServer } from "socket.io";
import { sessionManager } from "../../sessionManager";

export const bindConnectionHandlers = (
  sock: any,
  sessionId: string,
  io: IOServer | undefined,
  opts: {
    onConnected?: (sessionId: string) => Promise<void>;
    onDisconnected?: (sessionId: string, reason: string) => Promise<void>;
    updateSessionState?: (sessionId: string, isConnected: boolean, lastSeen: Date) => void;
  }
) => {
  sock.ev.on("connection.update", async (update: Partial<ConnectionState> & { qr?: string }) => {
    const { connection, lastDisconnect, qr } = update as any;

    if (qr) {
      try {
        // Generar QR fresco cada vez
        const qrImage = await qrcode.toDataURL(qr);
        await sessionManager.updateQRCode(sessionId, qrImage);
        io?.emit("qr", { sessionId, qr: qrImage });
        console.log(`QR generado para sesión ${sessionId}`);
      } catch (err) {
        console.error("Error generando QR", err);
        await sessionManager.recordConnectionAttempt(sessionId, false, "QR generation failed");
      }
    }

    if (connection === "open") {
      opts.updateSessionState?.(sessionId, true, new Date());

      const phone = sock.user?.id?.split(":")[0] || null;
      const name = sock.user?.name || "Unknown";

      await sessionManager.updateConnectionStatus(sessionId, true, "connected", {
        phone: phone || undefined,
        name,
        platform: "whatsapp",
      });

      io?.emit("connected", { sessionId, status: true });

      if (opts.onConnected) {
        await opts.onConnected(sessionId);
      }

      await sessionManager.updateChatCount(sessionId);
    } else if (connection === "close") {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
      const reason = (lastDisconnect?.error as any)?.message || "Connection closed";

      opts.updateSessionState?.(sessionId, false, new Date());

      await sessionManager.updateConnectionStatus(sessionId, false, "disconnected");
      await sessionManager.recordConnectionAttempt(sessionId, false, reason);

      io?.emit("connected", { sessionId, status: false });

      if (opts.onDisconnected) {
        await opts.onDisconnected(sessionId, reason);
      }
    }
  });
};
