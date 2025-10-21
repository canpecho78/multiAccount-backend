import { Router } from "express";
import { getMessagesByChat, sendMessage } from "../controllers/messageController";
import { verifyJWT } from "../middleware/auth";
import multer from "multer";
import { whatsappService } from "../services/whatsappService";
import { auditAction, logAction } from "../controllers/adminController";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

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
router.post(
  "/:sessionId/messages",
  verifyJWT,
  auditAction("send", "messages"),
  sendMessage
);

/**
 * @swagger
 * /api/sessions/{sessionId}/messages/send-media:
 *   post:
 *     tags: [Messages]
 *     security: [{ bearerAuth: [] }]
 *     summary: Enviar mensaje con medio (imagen, video, audio, documento, sticker)
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: formData
 *         name: media
 *         type: file
 *         required: false
 *       - in: formData
 *         name: to
 *         type: string
 *         required: true
 *       - in: formData
 *         name: text
 *         type: string
 *         required: true
 *       - in: formData
 *         name: caption
 *         type: string
 *       - in: formData
 *         name: mediaType
 *         type: string
 *         enum: [image, video, audio, document, sticker, voice]
 *     responses:
 *       200:
 *         description: Envío exitoso
 */
router.post(
  "/:sessionId/messages/send-media",
  verifyJWT,
  auditAction("send", "messages"),
  upload.single("media"),
  async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { to, text, caption, mediaType } = req.body as any;
      const file = (req as any).file as { buffer?: Buffer; originalname?: string; mimetype?: string } | undefined;
      const fileBuffer = file?.buffer;
      const filename = file?.originalname;
      const mimetype = file?.mimetype;

      if (!to || !text) {
        return res.status(400).json({ success: false, error: "to y text son requeridos" });
      }

      await whatsappService.sendMessage(sessionId, to, text, {
        fileBuffer,
        caption,
        mediaType,
        filename,
        mimetype,
      });

      return res.json({ success: true });
    } catch (error: any) {
      const msg = (error as Error).message || "Error";
      // Auditoría de error
      try {
        const user = (req as any).user;
        await logAction(
          user?.sub,
          "send",
          "messages",
          { sessionId: req.params.sessionId, to: (req.body as any)?.to, mediaType: (req.body as any)?.mediaType, error: msg },
          false,
          msg
        );
      } catch {}
      if (msg.includes('Solo se permite enviar mensajes a contactos individuales')) {
        return res.status(400).json({ success: false, error: msg });
      }
      return res.status(500).json({ success: false, error: msg });
    }
  }
);

export default router;
