import { Router } from "express";
import { createSession, disconnectSession, getSessions, regenerateQR } from "../controllers/sessionController";
import { verifyJWT, requireRoles } from "../middleware/auth";

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
router.post("/", verifyJWT, requireRoles("administrator","supervisor"), createSession);

/**
 * @swagger
 * /api/sessions/{sessionId}:
 *   delete:
 *     tags: [Sessions]
 *     security: [{ bearerAuth: [] }]
 *     summary: Desconectar una sesión
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Sesión desconectada
 */
router.delete("/:sessionId", verifyJWT, requireRoles("administrator"), disconnectSession);

/**
 * @swagger
 * /api/sessions/{sessionId}/regenerate-qr:
 *   post:
 *     tags: [Sessions]
 *     security: [{ bearerAuth: [] }]
 *     summary: Regenerar código QR para una sesión
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: QR regenerado exitosamente
 *       400:
 *         description: sessionId requerido
 *       500:
 *         description: Error interno del servidor
 */
router.post("/:sessionId/regenerate-qr", verifyJWT, requireRoles("administrator", "supervisor"), regenerateQR);

export default router;
