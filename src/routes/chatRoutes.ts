import { Router } from "express";
import { getChatsBySession } from "../controllers/chatController";
import { verifyJWT } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Chats
 *     description: Chats de WhatsApp
 */

/**
 * @swagger
 * /api/sessions/{sessionId}/chats:
 *   get:
 *     tags: [Chats]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener chats de una sesión
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *       - in: query
 *         name: type
 *         required: false
 *         schema:
 *           type: string
 *           enum: [group, individual, all]
 *     responses:
 *       200:
 *         description: Lista de chats
 */
router.get("/:sessionId/chats", verifyJWT, getChatsBySession);

export default router;
