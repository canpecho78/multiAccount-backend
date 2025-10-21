import { Router } from "express";
import { verifyJWT } from "../middleware/auth";
import { Contact } from "../models/Contact";

const router = Router();

/**
 * GET /api/contacts/:sessionId
 * Listar contactos por sesión. Query optional: onlyIndividuals=true para excluir grupos
 */
router.get("/:sessionId", verifyJWT, async (req, res) => {
  try {
    const { sessionId } = req.params as { sessionId: string };
    const onlyIndividuals = String(req.query.onlyIndividuals || "true").toLowerCase() === "true";

    const filter: any = { sessionId };
    if (onlyIndividuals) filter.isGroup = false;

    const contacts = await Contact.find(filter).sort({ name: 1 });
    res.json({ success: true, data: contacts });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/contacts/:sessionId/:jid
 * Obtener un contacto específico
 */
router.get("/:sessionId/:jid", verifyJWT, async (req, res) => {
  try {
    const { sessionId, jid } = req.params as { sessionId: string; jid: string };
    const doc = await Contact.findOne({ sessionId, jid });
    if (!doc) return res.status(404).json({ success: false, error: "Contacto no encontrado" });
    res.json({ success: true, data: doc });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
