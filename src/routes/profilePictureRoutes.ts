import { Router } from "express";
import { verifyJWT } from "../middleware/auth";
import { whatsappService } from "../services/whatsappService";
import { Media } from "../models/Media";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Profile Pictures
 *     description: Gestión de fotos de perfil de WhatsApp
 */

/**
 * @swagger
 * /api/profile-picture/{sessionId}/{jid}:
 *   get:
 *     tags: [Profile Pictures]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener foto de perfil de un contacto
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la sesión de WhatsApp
 *       - in: path
 *         name: jid
 *         required: true
 *         schema:
 *           type: string
 *         description: JID del contacto "1234567890@s.whatsapp.net"
 *       - in: query
 *         name: refresh
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Forzar actualización de la foto (ignorar caché)
 *     responses:
 *       200:
 *         description: Foto de perfil obtenida exitosamente
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
 *                     jid:
 *                       type: string
 *                       example: "1234567890@s.whatsapp.net"
 *                     fileId:
 *                       type: string
 *                       example: "profile_1234567890_s_whatsapp_net_1640995200000"
 *                     url:
 *                       type: string
 *                       example: "/api/media/profile_1234567890_s_whatsapp_net_1640995200000"
 *                     lowRes:
 *                       type: string
 *                       example: "/api/media/profile_1234567890_s_whatsapp_net_1640995200000"
 *                     highRes:
 *                       type: string
 *                       example: "/api/media/profile_1234567890_s_whatsapp_net_1640995200000"
 *                     cached:
 *                       type: boolean
 *                       example: false
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: No se encontró foto de perfil o sesión no disponible
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "No se pudo obtener la foto de perfil"
 *       500:
 *         description: Error interno del servidor
 */
router.get("/:sessionId/:jid", verifyJWT, async (req, res) => {
  try {
    const { sessionId, jid } = req.params;
    const { refresh } = req.query;

    // Validar formato del JID
    if (!jid.includes("@")) {
      return res.status(400).json({
        success: false,
        message: "Formato de JID inválido. Use: número@s.whatsapp.net"
      });
    }

    // Si se solicita refresh, eliminar caché existente
    if (refresh === "true") {
      await Media.deleteMany({
        sessionId,
        chatId: jid,
        mediaType: "profile-pic"
      });
    }

    // Obtener foto de perfil usando el servicio existente
    const fileId = await whatsappService.getProfilePicture(sessionId, jid);

    if (!fileId) {
      return res.json({
        success: false,
        message: "No se pudo obtener la foto de perfil"
      });
    }

    // Obtener información del archivo
    const mediaInfo = await Media.findOne({ fileId });
    
    if (!mediaInfo) {
      return res.status(404).json({
        success: false,
        message: "Archivo de foto de perfil no encontrado"
      });
    }

    res.json({
      success: true,
      data: {
        jid,
        fileId,
        url: `/api/media/${fileId}`,
        lowRes: `/api/media/${fileId}`, // Actualmente solo tenemos una resolución
        highRes: `/api/media/${fileId}`,
        cached: mediaInfo.createdAt.getTime() > Date.now() - 24 * 60 * 60 * 1000,
        createdAt: mediaInfo.createdAt
      }
    });
  } catch (error) {
    console.error("Error getting profile picture:", error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * @swagger
 * /api/profile-pictures:
 *   post:
 *     tags: [Profile Pictures]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener fotos de perfil de múltiples contactos
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, contacts]
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: "session_001"
 *                 description: ID de la sesión de WhatsApp
 *               contacts:
 *                 type: array
 *                 description: Lista de JIDs de contactos
 *                 items:
 *                   type: string
 *                   example: "1234567890@s.whatsapp.net"
 *               refresh:
 *                 type: boolean
 *                 default: false
 *                 description: Forzar actualización de todas las fotos
 *     responses:
 *       200:
 *         description: Fotos de perfil obtenidas exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       jid:
 *                         type: string
 *                       fileId:
 *                         type: string
 *                       url:
 *                         type: string
 *                       lowRes:
 *                         type: string
 *                       highRes:
 *                         type: string
 *                       cached:
 *                         type: boolean
 *                       createdAt:
 *                         type: string
 *                       error:
 *                         type: string
 *                         description: Mensaje de error si no se pudo obtener esta foto
 *       400:
 *         description: Datos de entrada inválidos
 *       500:
 *         description: Error interno del servidor
 */
router.post("/", verifyJWT, async (req, res) => {
  try {
    const { sessionId, contacts, refresh = false } = req.body;

    // Validaciones
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "sessionId es requerido"
      });
    }

    if (!Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({
        success: false,
        message: "contacts debe ser un array no vacío de JIDs"
      });
    }

    // Validar formato de todos los JIDs
    const invalidJids = contacts.filter(jid => !jid.includes("@"));
    if (invalidJids.length > 0) {
      return res.status(400).json({
        success: false,
        message: `JIDs inválidos: ${invalidJids.join(", ")}. Use formato: número@s.whatsapp.net`
      });
    }

    // Si se solicita refresh, eliminar caché existente para todos los contactos
    if (refresh) {
      await Media.deleteMany({
        sessionId,
        chatId: { $in: contacts },
        mediaType: "profile-pic"
      });
    }

    // Obtener fotos de perfil de todos los contactos en paralelo
    const pictures = await Promise.allSettled(
      contacts.map(async (jid: string) => {
        try {
          const fileId = await whatsappService.getProfilePicture(sessionId, jid);
          
          if (!fileId) {
            return {
              jid,
              error: "No se p se encontró foto de perfil"
            };
          }

          // Obtener información del archivo
          const mediaInfo = await Media.findOne({ fileId });
          
          if (!mediaInfo) {
            return {
              jid,
              error: "Archivo de foto de perfil no encontrado"
            };
          }

          return {
            jid,
            fileId,
            url: `/api/media/${fileId}`,
            lowRes: `/api/media/${fileId}`,
            highRes: `/api/media/${fileId}`,
            cached: mediaInfo.createdAt.getTime() > Date.now() - 24 * 60 * 60 * 1000,
            createdAt: mediaInfo.createdAt
          };
        } catch (error) {
          return {
            jid,
            error: (error as Error).message
          };
        }
      })
    );

    // Procesar resultados (fulfilled y rejected)
    const results = pictures.map(result => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          jid: contacts[0], // Fallback, normalmente esto no debería pasar
          error: result.reason?.message || "Error desconocido"
        };
      }
    });

    const successful = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;

    res.json({
      success: true,
      data: results,
      meta: {
        total: contacts.length,
        successful,
        failed,
        sessionId
      }
    });
  } catch (error) {
    console.error("Error getting multiple profile pictures:", error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

/**
 * @swagger
 * /api/profile-picture/{sessionId}/{jid}/refresh:
 *   post:
 *     tags: [Profile Pictures]
 *     security: [{ bearerAuth: [] }]
 *     summary: Forzar actualización de foto de perfil de un contacto
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID de la sesión de WhatsApp
 *       - in: path
 *         name: jid
 *         required: true
 *         schema:
 *           type: string
 *         description: JID del contacto
 *     responses:
 *       200:
 *         description: Foto de perfil actualizada exitosamente
 *       404:
 *         description: Sesión no encontrada
 *       500:
 *         description: Error interno del servidor
 */
router.post("/:sessionId/:jid/refresh", verifyJWT, async (req, res) => {
  try {
    const { sessionId, jid } = req.params;

    // Eliminar caché existente
    await Media.deleteMany({
      sessionId,
      chatId: jid,
      mediaType: "profile-pic"
    });

    // Obtener nueva foto de perfil
    const fileId = await whatsappService.getProfilePicture(sessionId, jid);

    if (!fileId) {
      return res.json({
        success: false,
        message: "No se pudo obtener la foto de perfil actualizada"
      });
    }

    res.json({
      success: true,
      message: "Foto de perfil actualizada exitosamente",
      data: {
        jid,
        fileId,
        url: `/api/media/${fileId}`
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

export default router;
