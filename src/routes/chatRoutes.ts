import { Router } from "express";
import { getChatsBySession, togglePinChat, toggleArchiveChat, markChatAsRead } from "../controllers/chatController";
import { verifyJWT } from "../middleware/auth";
import { auditAction } from "../controllers/adminController";

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

/**
 * @swagger
 * /api/sessions/{sessionId}/chats/{chatId}/pin:
 *   patch:
 *     tags: [Chats]
 *     security: [{ bearerAuth: [] }]
 *     summary: Anclar o desanclar un chat
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isPinned:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Chat actualizado
 */
router.patch("/:sessionId/chats/:chatId/pin", verifyJWT, auditAction("pin", "chats"), togglePinChat);

/**
 * @swagger
 * /api/sessions/{sessionId}/chats/{chatId}/archive:
 *   patch:
 *     tags: [Chats]
 *     security: [{ bearerAuth: [] }]
 *     summary: Archivar o desarchivar un chat
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isArchived:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Chat actualizado
 */
router.patch("/:sessionId/chats/:chatId/archive", verifyJWT, auditAction("archive", "chats"), toggleArchiveChat);

/**
 * @swagger
 * /api/sessions/{sessionId}/chats/{chatId}/read:
 *   patch:
 *     tags: [Chats]
 *     security: [{ bearerAuth: [] }]
 *     summary: Marcar chat como leído (resetear contador de no leídos)
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
 *     responses:
 *       200:
 *         description: Chat marcado como leído
 */
router.patch("/:sessionId/chats/:chatId/read", verifyJWT, auditAction("read", "chats"), markChatAsRead);

export default router;
