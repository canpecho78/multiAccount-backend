import { Router } from "express";
import { verifyJWT } from "../middleware/auth";
import { whatsappService } from "../services/whatsappService";
import { Media } from "../models/Media";
import { Message } from "../models/Message";
import { PassThrough } from "stream";
import { audioConversionService } from "../services/audioConversionService";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Audio
 *     description: Gestión de audios y notas de voz de WhatsApp
 */

/**
 * @swagger
 * /api/audio/{fileId}:
 *   get:
 *     tags: [Audio]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener archivo de audio como stream
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del archivo de audio en MongoDB
 *     responses:
 *       200:
 *         description: Stream de audio
 *         content:
 *           audio/ogg:
 *             schema:
 *               type: string
 *               format: binary
 *           audio/mp4:
 *             schema:
 *               type: string
 *               format: binary
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Audio no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/:fileId", verifyJWT, async (req, res) => {
  try {
    const { fileId } = req.params;

    const media = await Media.findOne({ 
      fileId,
      mediaType: { $in: ['audio', 'voice'] }
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        error: "Audio not found",
      });
    }

    // Establecer headers apropiados para audio
    res.set({
      "Content-Type": media.mimetype,
      "Content-Length": media.size,
      "Content-Disposition": `inline; filename="${media.filename}"`,
      "Cache-Control": "public, max-age=31536000", // Cache por 1 año
      "Accept-Ranges": "bytes",
    });

    // Crear stream desde el buffer
    const stream = new PassThrough();
    stream.end(media.data);
    
    stream.pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * @swagger
 * /api/audio/{fileId}/base64:
 *   get:
 *     tags: [Audio]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener audio como base64 (para frontend web)
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del archivo de audio en MongoDB
 *     responses:
 *       200:
 *         description: Audio en formato base64
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     base64:
 *                       type: string
 *                       example: "data:audio/ogg;base64,T2dnUwACAAAAAAAA..."
 *                     mimetype:
 *                       type: string
 *                       example: "audio/ogg; codecs=opus"
 *                     duration:
 *                       type: number
 *                       example: 10.5
 *                     isVoiceNote:
 *                       type: boolean
 *                       example: true
 *                     filename:
 *                       type: string
 *                       example: "audio_1234567890.ogg"
 *                     size:
 *                       type: number
 *                       example: 45632
 *       404:
 *         description: Audio no encontrado
 *       500:
 *         description: Error interno del servidor
 */
router.get("/:fileId/base64", verifyJWT, async (req, res) => {
  try {
    const { fileId } = req.params;

    const media = await Media.findOne({ 
      fileId,
      mediaType: { $in: ['audio', 'voice'] }
    });

    if (!media) {
      return res.status(404).json({
        success: false,
        error: "Audio not found",
      });
    }

    const base64 = media.data.toString('base64');
    const dataUrl = `data:${media.mimetype};base64,${base64}`;

    res.json({
      success: true,
      data: {
        base64: dataUrl,
        mimetype: media.mimetype,
        duration: media.duration,
        isVoiceNote: media.isVoiceNote,
        filename: media.filename,
        size: media.size,
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
 * /api/audio/{fileId}/info:
 *   get:
 *     tags: [Audio]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener información del audio sin descargarlo
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del archivo de audio en MongoDB
 *     responses:
 *       200:
 *         description: Información del archivo de audio
 *       404:
 *         description: Audio no encontrado
 */
router.get("/:fileId/info", verifyJWT, async (req, res) => {
  try {
    const { fileId } = req.params;

    const media = await Media.findOne({ 
      fileId,
      mediaType: { $in: ['audio', 'voice'] }
    }).select("-data");

    if (!media) {
      return res.status(404).json({
        success: false,
        error: "Audio not found",
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
        duration: media.duration,
        caption: media.caption,
        isVoiceNote: media.isVoiceNote,
        isAnimated: media.isAnimated,
        createdAt: media.createdAt,
        // Información adicional específica de audio
        audioInfo: {
          duration: media.duration,
          isVoiceNote: media.isVoiceNote,
          sampleRate: media.mimetype?.includes('opus') ? 48000 : null,
          channels: media.mimetype?.includes('opus') ? 1 : null,
        },
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
 * /api/audio/send:
 *   post:
 *     tags: [Audio]
 *     security: [{ bearerAuth: [] }]
 *     summary: Enviar audio existente desde MongoDB
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, to, mediaFileId]
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: "session_001"
 *                 description: ID de la sesión de WhatsApp
 *               to:
 *                 type: string
 *                 example: "1234567890@s.whatsapp.net"
 *                 description: JID del destinatario
 *               mediaFileId:
 *                 type: string
 *                 example: "audio_1234567890_1640995200000"
 *                 description: ID del archivo de audio en MongoDB
 *               caption:
 *                 type: string
 *                 example: "Aquí tienes el audio"
 *                 description: Texto acompañante del audio
 *     responses:
 *       200:
 *         description: Audio enviado exitosamente
 *       404:
 *         description: Sesión no encontrada o archivo no encontrado
 */
router.post("/send", verifyJWT, async (req, res) => {
  try {
    const { sessionId, to, mediaFileId, caption } = req.body;

    // Validaciones
    if (!sessionId || !to || !mediaFileId) {
      return res.status(400).json({
        success: false,
        message: "sessionId, to y mediaFileId son requeridos"
      });
    }

    // Verificar que el archivo sea de audio
    const mediaDoc = await Media.findOne({ 
      fileId: mediaFileId,
      mediaType: { $in: ['audio', 'voice'] }
    });

    if (!mediaDoc) {
      return res.status(404).json({
        success: false,
        message: "Archivo de audio no encontrado"
      });
    }

    // Enviar usando el servicio WhatsApp existente
    await whatsappService.sendMessage(sessionId, to, caption || "", {
      mediaFileId,
      caption
    });

    res.json({
      success: true,
      message: "Audio enviado exitosamente",
      data: {
        sessionId,
        to,
        mediaFileId,
        caption: caption || "",
        audioInfo: {
          duration: mediaDoc.duration,
          isVoiceNote: mediaDoc.isVoiceNote,
          filename: mediaDoc.filename
        }
      }
    });
  } catch (error) {
    console.error("Error sending audio:", error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * @swagger
 * /api/audio/session/{sessionId}/by-type:
 *   get:
 *     tags: [Audio]
 *     security: [{ bearerAuth: [] }]
 *     summary: Listar audios de una sesión por tipo
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la sesión de WhatsApp
 *       - in: query
 *         name: audioType
 *         schema:
 *           type: string
 *           enum: [audio, voice]
 *         description: Tipo de audio (audio normal o nota de voz)
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
 *         description: Lista de archivos de audio
 */
router.get("/session/:sessionId/by-type", verifyJWT, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { audioType, page = 1, limit = 20 } = req.query;

    const filter: any = { 
      sessionId,
      mediaType: { $in: ['audio', 'voice'] }
    };

    if (audioType === 'voice') {
      filter.mediaType = 'voice';
    } else if (audioType === 'audio') {
      filter.mediaType = 'audio';
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [audioFiles, total] = await Promise.all([
      Media.find(filter)
        .select("-data")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Media.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: audioFiles.map(audio => ({
        fileId: audio.fileId,
        filename: audio.filename,
        mimetype: audio.mimetype,
        duration: audio.duration,
        size: audio.size,
        isVoiceNote: audio.isVoiceNote,
        createdAt: audio.createdAt,
        chatId: audio.chatId,
        caption: audio.caption,
      })),
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
        sessionId,
        audioType: audioType || 'all',
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
 * /api/audio/{fileId}/mp3:
 *   get:
 *     tags: [Audio]
 *     security: [{ bearerAuth: [] }]
 *     summary: Convertir y obtener audio como MP3
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del archivo de audio en MongoDB
 *     responses:
 *       200:
 *         description: Stream de audio MP3
 *         content:
 *           audio/mpeg:
 *             schema:
 *               type: string
 *               format: binary
 *       404:
 *         description: Audio no encontrado
 *       500:
 *         description: Error de conversión
 */
router.get("/:fileId/mp3", verifyJWT, async (req, res) => {
  try {
    const { fileId } = req.params;

    const media = await Media.findOne({ fileId });

    if (!media) {
      return res.status(404).json({
        success: false,
        error: "Audio not found",
      });
    }

    // Si ya es MP3, servir directamente
    if (media.mimetype === 'audio/mpeg' || media.mimetype?.includes('mp3')) {
      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": media.size,
        "Content-Disposition": `inline; filename="${media.filename.replace(/\.(ogg|opus)$/, '.mp3')}"`,
        "Cache-Control": "public, max-age=31536000",
      });

      const stream = new PassThrough();
      stream.end(media.data);
      stream.pipe(res);
      return;
    }

    // Si no es MP3, convertir
    console.log(`🔄 Converting ${media.mimetype} to MP3 for fileId: ${fileId}`);
    
    const conversionResult = await audioConversionService.convertToMP3(
      media.data,
      'ogg', // Asumiendo que es OGG de WhatsApp
      {
        quality: media.isVoiceNote ? 'high' : 'medium',
        bitrate: media.isVoiceNote ? '192k' : '128k',
        sampleRate: media.isVoiceNote ? 48000 : 44100,
        channels: media.isVoiceNote ? 1 : 2,
      }
    );

    if (!conversionResult.success || !conversionResult.buffer) {
      return res.status(500).json({
        success: false,
        error: conversionResult.error || "MP3 conversion failed",
      });
    }

    console.log(`✅ MP3 conversion completed: ${conversionResult.buffer.length} bytes`);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": conversionResult.buffer.length,
      "Content-Disposition": `inline; filename="${media.filename.replace(/\.(ogg|opus)$/, '.mp3')}"`,
      "Cache-Control": "public, max-age=31536000",
    });

    const stream = new PassThrough();
    stream.end(conversionResult.buffer);
    stream.pipe(res);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

/**
 * @swagger
 * /api/audio/{fileId}/convert:
 *   post:
 *     tags: [Audio]
 *     security: [{ bearerAuth: [] }]
 *     summary: Convertir audio y guardar nueva versión MP3
 *     parameters:
 *       - in: path
 *         name: fileId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID del archivo de audio en MongoDB
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               force:
 *                 type: boolean
 *                 default: false
 *                 description: Forzar conversión incluso si ya es MP3
 *               quality:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *               bitrate:
 *                 type: string
 *                 default: "128k"
 *     responses:
 *       200:
 *         description: Audio convertido exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     originalFileId:
 *                       type: string
 *                     mp3FileId:
 *                       type: string
 *                     mp3Size:
 *                       type: number
 *                     conversionTimeMs:
 *                       type: number
 */
router.post("/:fileId/convert", verifyJWT, async (req, res) => {
  try {
    const { fileId } = req.params;
    const { force = false, quality = 'medium', bitrate = '128k' } = req.body;

    const originalMedia = await Media.findOne({ fileId });

    if (!originalMedia) {
      return res.status(404).json({
        success: false,
        error: "Audio not found",
      });
    }

    // Si ya es MP3 && no se fuerza conversión, retornar info
    if (originalMedia.mimetype === 'audio/mpeg' &&!force) {
      return res.json({
        success: true,
        message: "Audio is already in MP3 format",
        data: {
          originalFileId: fileId,
          mp3FileId: fileId,
          mp3Size: originalMedia.size,
          conversionTimeMs: 0,
        },
      });
    }

    const startTime = Date.now();
    console.log(`🔄 Converting ${originalMedia.filename} to MP3...`);

    const conversionResult = await audioConversionService.convertToMP3(
      originalMedia.data,
      'ogg',
      {
        quality,
        bitrate,
        sampleRate: originalMedia.isVoiceNote ? 48000 : 44100,
        channels: originalMedia.isVoiceNote ? 1 : 2,
      }
    );

    const conversionTime = Date.now() - startTime;

    if (!conversionResult.success || !conversionResult.buffer) {
      return res.status(500).json({
        success: false,
        error: conversionResult.error || "MP3 conversion failed",
      });
    }

    // Crear nuevo documento para el MP3
    const mp3FileId = `${originalMedia.mediaType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const mp3Filename = `${mp3FileId}.mp3`;

    await Media.create({
      fileId: mp3FileId,
      messageId: `${originalMedia.messageId}_mp3`,
      sessionId: originalMedia.sessionId,
      chatId: originalMedia.chatId,
      mediaType: originalMedia.mediaType,
      filename: mp3Filename,
      originalFilename: originalMedia.originalFilename,
      mimetype: 'audio/mpeg',
      size: conversionResult.buffer.length,
      data: conversionResult.buffer,
      duration: originalMedia.duration,
      caption: originalMedia.caption,
      isVoiceNote: originalMedia.isVoiceNote,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log(`✅ MP3 conversion completed: ${mp3FileId} (${conversionResult.buffer.length} bytes in ${conversionTime}ms)`);

    res.json({
      success: true,
      message: "Audio converted to MP3 successfully",
      data: {
        originalFileId: fileId,
        mp3FileId: mp3FileId,
        mp3Size: conversionResult.buffer.length,
        originalSize: originalMedia.size,
        conversionTimeMs: conversionTime,
        quality: quality,
        bitrate: bitrate,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message,
    });
  }
});

export default router;
