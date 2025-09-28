import { Router } from "express";
import { assignChat, listAssignments, listUserAssignedChats, unassignChat, listMyAssignedChats } from "../controllers/assignmentController";
import { verifyJWT, requireRoles } from "../middleware/auth";

const router = Router({ mergeParams: true });

/**
 * @swagger
 * tags:
 *   - name: Assignments
 *     description: Asignación de chats a usuarios
 */

/**
 * @swagger
 * /api/sessions/{sessionId}/assignments:
 *   post:
 *     tags: [Assignments]
 *     security: [{ bearerAuth: [] }]
 *     summary: Asignar chat a usuario (admin, supervisor)
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [chatId, userId]
 *             properties:
 *               chatId: { type: string }
 *               userId: { type: string }
 *     responses:
 *       201:
 *         description: Asignación creada/activada
 */
router.post("/:sessionId/assignments", verifyJWT, requireRoles("administrator", "supervisor"), assignChat);

/**
 * @swagger
 * /api/sessions/{sessionId}/assignments/{assignmentId}:
 *   delete:
 *     tags: [Assignments]
 *     security: [{ bearerAuth: [] }]
 *     summary: Desasignar chat de usuario (admin, supervisor)
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Desasignado
 */
router.delete("/:sessionId/assignments/:assignmentId", verifyJWT, requireRoles("administrator", "supervisor"), unassignChat);

/**
 * @swagger
 * /api/sessions/{sessionId}/assignments:
 *   get:
 *     tags: [Assignments]
 *     security: [{ bearerAuth: [] }]
 *     summary: Listar asignaciones
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: chatId
 *         schema: { type: string }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Lista de asignaciones
 */
router.get("/:sessionId/assignments", verifyJWT, listAssignments);

/**
 * @swagger
 * /api/sessions/{sessionId}/assignments/user/{userId}:
 *   get:
 *     tags: [Assignments]
 *     security: [{ bearerAuth: [] }]
 *     summary: Listar asignaciones activas de un usuario
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de asignaciones del usuario
 */
router.get("/:sessionId/assignments/user/:userId", verifyJWT, listUserAssignedChats);

/**
 * @swagger
 * /api/sessions/{sessionId}/assignments/me:
 *   get:
 *     tags: [Assignments]
 *     security: [{ bearerAuth: [] }]
 *     summary: Listar mis chats asignados (usuario autenticado)
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de mis asignaciones
 */
router.get("/:sessionId/assignments/me", verifyJWT, listMyAssignedChats);

export default router;
