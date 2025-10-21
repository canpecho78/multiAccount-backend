import { Session } from "../../models/Session";
import { sessionManager } from "../sessionManager";

export type QrOptions = {
  timeoutMs?: number;
  pollMs?: number;
  force?: boolean;
  retries?: number;
  retryDelayMs?: number;
};

export type QrResult = {
  status: "qr_ready" | "connected" | "pending" | "disconnected" | "error";
  qr?: string | null;
};

export async function generateQrForSession(
  sessionId: string,
  createSessionFn: (sessionId: string) => Promise<any>,
  opts?: QrOptions
): Promise<QrResult> {
  const timeoutMs = Math.max(3000, opts?.timeoutMs ?? 20000);
  const pollMs = Math.max(200, opts?.pollMs ?? 500);
  const retries = Math.max(0, opts?.retries ?? 1);
  const retryDelayMs = Math.max(0, opts?.retryDelayMs ?? 1500);

  // Pre-chequeo rápido: si ya hay QR o ya está conectada y no se forzó
  try {
    const existingDoc = await Session.findOne({ sessionId }).lean();
    if (existingDoc?.isConnected) {
      return { status: "connected" };
    }
    if (existingDoc?.qrCode && !opts?.force) {
      return { status: "qr_ready", qr: existingDoc.qrCode };
    }
    // Si la sesión está en estado problemático, forzar limpieza para nuevo QR
    if (existingDoc && ["inactive", "disconnected", "error"].includes(existingDoc.status as any)) {
      opts = { ...opts, force: true };
    }
  } catch {}

  let attempt = 0;
  while (true) {
    // Limpiar credenciales si se fuerza o si venimos de estado problemático
    if (opts?.force) {
      try { await sessionManager.clearAuth(sessionId); } catch {}
    }

    // Asegurar documento de sesión en DB y arrancar socket
    await sessionManager.createOrUpdateSession(sessionId, {
      status: "pending",
      isActive: true,
      isConnected: false,
      qrCode: null,
    } as any);

    // Crear socket (forzando QR fresco)
    await createSessionFn(sessionId);

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const doc = await Session.findOne({ sessionId }).lean();
      if (doc?.isConnected) {
        return { status: "connected" };
      }
      if (doc?.qrCode) {
        return { status: "qr_ready", qr: doc.qrCode };
      }
      if (doc?.status === "disconnected" || doc?.status === "error") {
        return { status: (doc.status as any) };
      }
      await new Promise((r) => setTimeout(r, pollMs));
    }

    // Timeout sin QR disponible -> ¿reintentar?
    if (attempt < retries) {
      attempt++;
      await new Promise((r) => setTimeout(r, retryDelayMs));
      // En reintento, forzamos nuevo QR
      opts = { ...opts, force: true };
      continue;
    }

    const latest = await Session.findOne({ sessionId }).lean();
    return {
      status: (latest?.status as any) || "pending",
      qr: latest?.qrCode || null,
    };
  }
}
