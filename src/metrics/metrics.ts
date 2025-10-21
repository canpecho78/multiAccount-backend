import { Counter, Registry, collectDefaultMetrics } from "prom-client";

// Create a dedicated registry for this service
export const metricsRegister = new Registry();

// Default Node.js/process metrics
collectDefaultMetrics({ register: metricsRegister });

// Custom counters
export const metricsCounters = {
  skippedMessagesNonContact: new Counter({
    name: "wa_skipped_messages_non_contact_total",
    help: "Total de mensajes omitidos por no ser de contacto individual",
    labelNames: ["custom"],
  }),
  skippedChatsNonContact: new Counter({
    name: "wa_skipped_chats_non_contact_total",
    help: "Total de chats omitidos por no ser de contacto individual",
    labelNames: ["custom"],
  }),
  skippedPresenceNonContact: new Counter({
    name: "wa_skipped_presence_non_contact_total",
    help: "Total de eventos de presencia omitidos por no ser de contacto individual",
    labelNames: ["custom"],
  }),
  mediaDownloadTotal: new Counter({
    name: "media_download_total",
    help: "Total de descargas de archivos multimedia servidos por la API",
    labelNames: ["custom"],
  }),
};

// Register custom counters
metricsRegister.registerMetric(metricsCounters.skippedMessagesNonContact);
metricsRegister.registerMetric(metricsCounters.skippedChatsNonContact);
metricsRegister.registerMetric(metricsCounters.skippedPresenceNonContact);
metricsRegister.registerMetric(metricsCounters.mediaDownloadTotal);
