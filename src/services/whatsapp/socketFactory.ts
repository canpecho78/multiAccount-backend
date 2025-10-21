import P from "pino";
import { default as makeWASocket, WASocket } from "@whiskeysockets/baileys";

// Resolve Baileys makeInMemoryStore across different version layouts
let store: any = null;
const resolveMakeInMemoryStore = () => {
  const candidates = [
    () => require("@whiskeysockets/baileys").makeInMemoryStore,
    () => require("@whiskeysockets/baileys/lib/Store").makeInMemoryStore,
    () => require("@whiskeysockets/baileys/lib/Store/Store").makeInMemoryStore,
    () => require("@whiskeysockets/baileys/lib/Store/index").makeInMemoryStore,
    () => require("@whiskeysockets/baileys/lib/Utils/store").makeInMemoryStore,
  ];
  for (const get of candidates) {
    try {
      const fn = get();
      if (typeof fn === "function") return fn;
    } catch (_) {
      // try next
    }
  }
  return null;
};

const makeInMemoryStore = resolveMakeInMemoryStore();
if (makeInMemoryStore) {
  store = makeInMemoryStore({ logger: P({ level: "silent" }) });
}

export const bindStore = (sock: WASocket) => {
  if (store) {
    store.bind(sock.ev);
  }
};

export const makeSocket = (auth: any): WASocket => {
  const sock = makeWASocket({
    auth,
    printQRInTerminal: false,
    logger: P({ level: "silent" }),
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 0,
    keepAliveIntervalMs: 10000,
    emitOwnEvents: true,
    syncFullHistory: false,
    // Forzar nuevo pairing
    shouldIgnoreJid: () => false,
  });
  bindStore(sock);
  return sock;
};

export const getStore = (): any | null => store;
