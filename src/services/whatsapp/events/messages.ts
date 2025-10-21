import { Server as IOServer } from "socket.io";

export const bindMessageHandlers = (
  sock: any,
  sessionId: string,
  io: IOServer | undefined,
  opts: {
    onMessage: (msg: any) => Promise<void>;
  }
) => {
  sock.ev.on("messages.upsert", async (m: any) => {
    if (m.type !== "notify") return;
    for (const msg of m.messages) {
      try {
        await opts.onMessage(msg);
      } catch (e) {
        console.error(`Error processing message in session ${sessionId}:`, e);
      }
    }
  });
};
