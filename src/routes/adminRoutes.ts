import { Router } from "express";
import {
  getDashboard,
  getSystemHealth,
  getWhatsAppMetrics,
  getEmployeeMetrics,
  getAssignmentStats,
  getAuditLogs,
  getAuditStats,
  getSecuritySettings,
  updateSecuritySettings
} from "../controllers/adminController";
import {
  listUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
  activateUser,
  deactivateUser
} from "../controllers/userController";
import {
  listRoles,
  getRole,
  createRole,
  updateRole,
  deleteRole
} from "../controllers/roleController";
import { verifyJWT, requireRoles } from "../middleware/auth";

const router = Router();

// Todas las rutas de admin requieren autenticación y rol de administrador
router.use(verifyJWT);
router.use(requireRoles("administrator"));

/**
 * @swagger
 * tags:
 *   - name: Admin
 *     description: Funciones administrativas (solo administrador)
 */

// =====================================================
// DASHBOARD Y MÉTRICAS
// =====================================================

/**
 * @swagger
 * /api/admin/dashboard:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Dashboard administrativo completo
 *     responses:
 *       200:
 *         description: Datos del dashboard
 */
router.get("/dashboard", getDashboard);

/**
 * @swagger
 * /api/admin/system/health:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Estado de salud del sistema
 *     responses:
 *       200:
 *         description: Métricas de salud del sistema
 */
router.get("/system/health", getSystemHealth);

/**
 * @swagger
 * /api/admin/system/whatsapp-metrics:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Métricas internas de WhatsApp (contadores y flags)
 *     responses:
 *       200:
 *         description: Métricas de WhatsApp
 */
router.get("/system/whatsapp-metrics", getWhatsAppMetrics);

/**
 * @swagger
 * /api/admin/employee-metrics:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Métricas de rendimiento de empleados
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: sessionId
 *         schema: { type: string }
 *       - in: query
 *         name: period
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Métricas de empleados
 */
router.get("/employee-metrics", getEmployeeMetrics);

/**
 * @swagger
 * /api/admin/assignment-stats:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Estadísticas de asignaciones
 *     parameters:
 *       - in: query
 *         name: sessionId
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: priority
 *         schema: { type: string }
 *       - in: query
 *         name: dateRange
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Estadísticas de asignaciones
 */
router.get("/assignment-stats", getAssignmentStats);

// =====================================================
// GESTIÓN DE USUARIOS
// =====================================================

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Listar usuarios (admin)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: active
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Lista de usuarios
 */
router.get("/users", listUsers);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener usuario por id (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuario
 */
router.get("/users/:id", getUser);

/**
 * @swagger
 * /api/admin/users:
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Crear usuario (admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password, roleName]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               roleName: { type: string }
 *     responses:
 *       201:
 *         description: Usuario creado
 */
router.post("/users", createUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   put:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Actualizar usuario (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               roleName: { type: string }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Usuario actualizado
 */
router.put("/users/:id", updateUser);

/**
 * @swagger
 * /api/admin/users/{id}:
 *   delete:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Eliminar usuario (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete("/users/:id", deleteUser);

/**
 * @swagger
 * /api/admin/users/{id}/role:
 *   patch:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Cambiar rol de usuario (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [roleName]
 *             properties:
 *               roleName: { type: string }
 *     responses:
 *       200:
 *         description: Rol actualizado
 */
router.patch("/users/:id/role", changeUserRole);

/**
 * @swagger
 * /api/admin/users/{id}/activate:
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Activar usuario (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Activado
 */
router.post("/users/:id/activate", activateUser);

/**
 * @swagger
 * /api/admin/users/{id}/deactivate:
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Desactivar usuario (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Desactivado
 */
router.post("/users/:id/deactivate", deactivateUser);

// =====================================================
// GESTIÓN DE ROLES
// =====================================================

/**
 * @swagger
 * /api/admin/roles:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Listar roles (admin)
 *     responses:
 *       200:
 *         description: Lista de roles
 */
router.get("/roles", listRoles);

/**
 * @swagger
 * /api/admin/roles/{id}:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener rol por id (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Rol
 */
router.get("/roles/:id", getRole);

/**
 * @swagger
 * /api/admin/roles:
 *   post:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Crear rol (admin)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               active: { type: boolean }
 *     responses:
 *       201:
 *         description: Rol creado
 */
router.post("/roles", createRole);

/**
 * @swagger
 * /api/admin/roles/{id}:
 *   put:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Actualizar rol (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               description: { type: string }
 *               active: { type: boolean }
 *     responses:
 *       200:
 *         description: Rol actualizado
 */
router.put("/roles/:id", updateRole);

/**
 * @swagger
 * /api/admin/roles/{id}:
 *   delete:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Eliminar rol (admin)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete("/roles/:id", deleteRole);

// =====================================================
// AUDITORÍA - AUDIT LOGS
// =====================================================

/**
 * @swagger
 * /api/admin/audit-logs:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener logs de auditoría
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: userId
 *         schema: { type: string }
 *       - in: query
 *         name: action
 *         schema: { type: string }
 *       - in: query
 *         name: resource
 *         schema: { type: string }
 *       - in: query
 *         name: success
 *         schema: { type: boolean }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *     responses:
 *       200:
 *         description: Lista de logs de auditoría
 */
router.get("/audit-logs", getAuditLogs);

/**
 * @swagger
 * /api/admin/audit-stats:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Estadísticas de auditoría
 *     responses:
 *       200:
 *         description: Estadísticas de logs
 */
router.get("/audit-stats", getAuditStats);

// =====================================================
// CONFIGURACIÓN DE SEGURIDAD
// =====================================================

/**
 * @swagger
 * /api/admin/security-settings:
 *   get:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener configuración de seguridad
 *     responses:
 *       200:
 *         description: Configuración actual
 */
router.get("/security-settings", getSecuritySettings);

/**
 * @swagger
 * /api/admin/security-settings:
 *   put:
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     summary: Actualizar configuración de seguridad
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxLoginAttempts: { type: integer, minimum: 1 }
 *               lockoutDuration: { type: integer, minimum: 1 }
 *               sessionTimeout: { type: integer, minimum: 1 }
 *               passwordMinLength: { type: integer, minimum: 6 }
 *               requireSpecialChars: { type: boolean }
 *               requireNumbers: { type: boolean }
 *               requireUppercase: { type: boolean }
 *               passwordExpiryDays: { type: integer, minimum: 1 }
 *               enable2FA: { type: boolean }
 *               require2FAForAdmins: { type: boolean }
 *               auditAllActions: { type: boolean }
 *               logRetentionDays: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Configuración actualizada
 */
router.put("/security-settings", updateSecuritySettings);

export default router;
