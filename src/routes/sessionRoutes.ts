import { Router } from "express";
import { createSession, disconnectSession, getSessions, deleteSession } from "../controllers/sessionController";
import { whatsappService } from "../services/whatsappService";
import { Session } from "../models/Session";
import { verifyJWT, requireRoles } from "../middleware/auth";
import { auditAction } from "../controllers/adminController";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Sessions
 *     description: Sesiones de WhatsApp
 */

/**
 * @swagger
 * /api/sessions:
 *   get:
 *     tags: [Sessions]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener todas las sesiones
 *     responses:
 *       200:
 *         description: Lista de sesiones
 */
router.get("/", verifyJWT, getSessions);

/**
 * @swagger
 * /api/sessions:
 *   post:
 *     tags: [Sessions]
 *     security: [{ bearerAuth: [] }]
 *     summary: Crear/iniciar una sesión de WhatsApp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesión iniciada
 */
router.post("/", verifyJWT, auditAction("create", "sessions"), createSession);

/**
 * @swagger
 * /api/sessions/{sessionId}/disconnect:
 *   post:
 *     tags: [Sessions]
 *     security: [{ bearerAuth: [] }]
 *     summary: Desconectar y deshabilitar una sesión (sin borrar datos)
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sesión desconectada y deshabilitada
 */
router.post("/:sessionId/disconnect", verifyJWT, auditAction("disconnect", "sessions"), disconnectSession);

/**
 * @swagger
 * /api/sessions/{sessionId}:
 *   delete:
 *     tags: [Sessions]
 *     security: [{ bearerAuth: [] }]
 *     summary: Eliminar una sesión completamente
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sesión eliminada
 */
router.delete("/:sessionId", verifyJWT, auditAction("delete", "sessions"), deleteSession);

/**
 * @swagger
 * /api/sessions/generate-qr:
 *   post:
 *     tags: [Sessions]
 *     security: [{ bearerAuth: [] }]
 *     summary: Generar un QR fresco para una sesión (crea la sesión si no existe)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: "mi-sesion-1"
 *               timeoutMs:
 *                 type: number
 *                 example: 30000
 *               force:
 *                 type: boolean
 *                 example: false
 *               retries:
 *                 type: number
 *                 example: 1
 *               retryDelayMs:
 *                 type: number
 *                 example: 1500
 *     responses:
 *       200:
 *         description: Estado y/o QR generado
 */
router.post("/generate-qr", verifyJWT, auditAction("generate-qr", "sessions"), async (req, res) => {
  try {
    const { sessionId, timeoutMs, force, retries, retryDelayMs } = req.body as {
      sessionId?: string;
      timeoutMs?: number;
      force?: boolean;
      retries?: number;
      retryDelayMs?: number;
    };
    if (!sessionId) {
      return res.status(400).json({ success: false, error: "sessionId requerido" });
    }

    // Asegurar documento y no duplicar
    await Session.findOneAndUpdate(
      { sessionId },
      { sessionId, isActive: true, updatedAt: new Date() },
      { upsert: true, new: true }
    );

    const result = await whatsappService.generateQrForSession(sessionId, { timeoutMs, force, retries, retryDelayMs });
    return res.json({ success: true, ...result, sessionId });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
