import { Router } from "express";
import { Media } from "../models/Media";
import { verifyJWT } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * /api/media/{fileId}:
 *   get:
 *     tags: [Media]
 *     summary: Obtener archivo multimedia
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archivo multimedia
 *       404:
 *         description: Archivo no encontrado
 */
router.get("/:fileId", verifyJWT, async (req, res) => {
  try {
    const { fileId } = req.params;

    const media = await Media.findOne({ fileId });

    if (!media) {
      return res.status(404).json({
        success: false,
        error: "Media file not found",
      });
    }

    // Establecer headers apropiados
    res.set({
      "Content-Type": media.mimetype,
      "Content-Length": media.size,
      "Content-Disposition": `inline; filename="${media.filename}"`,
      "Cache-Control": "public, max-age=31536000", // Cache por 1 año
    });

    // Enviar el buffer
    res.send(media.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * @swagger
 * /api/media/{fileId}/download:
 *   get:
 *     tags: [Media]
 *     summary: Descargar archivo multimedia
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archivo descargado
 */
router.get("/:fileId/download", verifyJWT, async (req, res) => {
  try {
    const { fileId } = req.params;

    const media = await Media.findOne({ fileId });

    if (!media) {
      return res.status(404).json({
        success: false,
        error: "Media file not found",
      });
    }

    // Forzar descarga
    res.set({
      "Content-Type": media.mimetype,
      "Content-Length": media.size,
      "Content-Disposition": `attachment; filename="${media.originalFilename || media.filename}"`,
    });

    res.send(media.data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * @swagger
 * /api/media/{fileId}/info:
 *   get:
 *     tags: [Media]
 *     summary: Obtener información del archivo sin descargarlo
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Información del archivo
 */
router.get("/:fileId/info", verifyJWT, async (req, res) => {
  try {
    const { fileId } = req.params;

    const media = await Media.findOne({ fileId }).select("-data -thumbnail");

    if (!media) {
      return res.status(404).json({
        success: false,
        error: "Media file not found",
      });
    }

    res.json({
      success: true,
      data: {
        fileId: media.fileId,
        messageId: media.messageId,
        sessionId: media.sessionId,
        chatId: media.chatId,
        mediaType: media.mediaType,
        filename: media.filename,
        originalFilename: media.originalFilename,
        mimetype: media.mimetype,
        size: media.size,
        width: media.width,
        height: media.height,
        duration: media.duration,
        caption: media.caption,
        isVoiceNote: media.isVoiceNote,
        isAnimated: media.isAnimated,
        createdAt: media.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * @swagger
 * /api/media/session/{sessionId}:
 *   get:
 *     tags: [Media]
 *     summary: Listar archivos multimedia de una sesión
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: mediaType
 *         schema:
 *           type: string
 *           enum: [image, video, audio, document, sticker, voice, profile-pic]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Lista de archivos
 */
router.get("/session/:sessionId", verifyJWT, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { mediaType, page = 1, limit = 20 } = req.query;

    const filter: any = { sessionId };
    if (mediaType) {
      filter.mediaType = mediaType;
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [media, total] = await Promise.all([
      Media.find(filter)
        .select("-data -thumbnail")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Media.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: media,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * @swagger
 * /api/media/{fileId}:
 *   delete:
 *     tags: [Media]
 *     summary: Eliminar archivo multimedia
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Archivo eliminado
 */
router.delete("/:fileId", verifyJWT, async (req, res) => {
  try {
    const { fileId } = req.params;

    const media = await Media.findOneAndDelete({ fileId });

    if (!media) {
      return res.status(404).json({
        success: false,
        error: "Media file not found",
      });
    }

    res.json({
      success: true,
      message: "Media file deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
