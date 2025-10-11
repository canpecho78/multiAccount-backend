import { Router } from "express";
import { createSession, disconnectSession, getSessions, deleteSession } from "../controllers/sessionController";
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
router.post("/", verifyJWT, createSession);

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
router.post("/:sessionId/disconnect", verifyJWT, disconnectSession);

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
router.delete("/:sessionId", verifyJWT, deleteSession);

export default router;
