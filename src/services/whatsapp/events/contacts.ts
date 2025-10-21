import { Contact } from "../../../models/Contact";
import { Chat } from "../../../models/Chat";

export const bindContactHandlers = (sock: any, sessionId: string) => {
  // Guardar contactos (solo individuales, no grupos)
  sock.ev.on("contacts.upsert", async (contacts: any[]) => {
    try {
      for (const contact of contacts) {
        const jid: string | undefined = contact?.id;
        if (!jid || typeof jid !== "string") continue;
        const isGroup = jid.endsWith("@g.us");
        if (isGroup) continue;

        const name = contact.name || contact.notify || jid.split("@")[0] || "Desconocido";
        // Upsert Contact
        const contactDoc = await Contact.findOneAndUpdate(
          { jid, sessionId },
          {
            name,
            notify: contact.notify || null,
            verifiedName: contact.verifiedName || null,
            imgUrl: contact.imgUrl || null,
            status: contact.status || null,
            isGroup: false,
            updatedAt: new Date(),
          },
          { upsert: true, new: true }
        );

        await Chat.findOneAndUpdate(
          { chatId: jid, sessionId },
          {
            name,
            phone: jid,
            isGroup: false,
            updatedAt: new Date(),
            contactId: contactDoc?._id || null,
          },
          { upsert: true, new: true }
        );
      }
      console.log("Contactos actualizados para sesión:", sessionId);
    } catch (e) {
      console.warn("No se pudieron actualizar contactos:", e);
    }
  });
};
