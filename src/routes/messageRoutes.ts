import { Router } from "express";
import { getMessagesByChat, sendMessage } from "../controllers/messageController";
import { verifyJWT } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Messages
 *     description: Mensajes de WhatsApp
 */

/**
 * @swagger
 * /api/sessions/{sessionId}/chats/{chatId}/messages:
 *   get:
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener mensajes de un chat
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: chatId
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
 *           maximum: 200
 *     responses:
 *       200:
 *         description: Lista de mensajes
 */
router.get("/:sessionId/chats/:chatId/messages", verifyJWT, getMessagesByChat);

/**
 * @swagger
 * /api/sessions/{sessionId}/messages:
 *   post:
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     summary: Enviar mensaje desde una sesión
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               to:
 *                 type: string
 *               text:
 *                 type: string
 *     responses:
 *       200:
 *         description: Envío exitoso
 */
router.post("/:sessionId/messages", verifyJWT, sendMessage);

export default router;
