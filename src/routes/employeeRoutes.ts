import { Router } from "express";
import { verifyJWT, requireRoles } from "../middleware/auth";
import {
  getMyAssignments,
  updateAssignmentStatus,
  getMyChats,
  getAssignmentStats
} from "../controllers/employeeController";

const router = Router();

// Todas las rutas de empleado requieren autenticación y rol de empleado
router.use(verifyJWT);
router.use(requireRoles("empleado"));

/**
 * @swagger
 * tags:
 *   - name: Employee
 *     description: Funciones para empleados (solo empleados)
 */

// =====================================================
// GESTIÓN DE ASIGNACIONES PERSONALES
// =====================================================

/**
 * @swagger
 * /api/employee/assignments:
 *   get:
 *     tags: [Employee]
 *     security: [{ bearerAuth: [] }]
 *     summary: Ver mis asignaciones activas
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, completed, pending, rejected] }
 *     responses:
 *       200:
 *         description: Lista de mis asignaciones
 */
router.get("/assignments", getMyAssignments);

/**
 * @swagger
 * /api/employee/assignments/{assignmentId}/status:
 *   put:
 *     tags: [Employee]
 *     security: [{ bearerAuth: [] }]
 *     summary: Actualizar estado de mi asignación
 *     parameters:
 *       - in: path
 *         name: assignmentId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [completed, pending, rejected]
 *               notes: { type: string }
 *     responses:
 *       200:
 *         description: Estado actualizado
 */
router.put("/assignments/:assignmentId/status", updateAssignmentStatus);

/**
 * @swagger
 * /api/employee/assignments/stats:
 *   get:
 *     tags: [Employee]
 *     security: [{ bearerAuth: [] }]
 *     summary: Ver mis estadísticas de rendimiento
 *     parameters:
 *       - in: query
 *         name: period
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Estadísticas personales
 */
router.get("/assignments/stats", getAssignmentStats);

// =====================================================
// GESTIÓN DE CHATS ASIGNADOS
// =====================================================

/**
 * @swagger
 * /api/employee/chats:
 *   get:
 *     tags: [Employee]
 *     security: [{ bearerAuth: [] }]
 *     summary: Ver chats asignados a mí
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [individual, group, all] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Lista de chats asignados
 */
router.get("/chats", getMyChats);

/**
 * @swagger
 * /api/employee/sessions/{sessionId}/chats/{chatId}/messages:
 *   get:
 *     tags: [Employee]
 *     security: [{ bearerAuth: [] }]
 *     summary: Ver mensajes de un chat asignado
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: chatId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Mensajes del chat asignado
 */
router.get("/sessions/:sessionId/chats/:chatId/messages", getMyChats);

export default router;
