import { Router } from "express";
import {
  createUser,
  deleteUser,
  getUser,
  listUsers,
  updateUser,
  changeUserRole,
  activateUser,
  deactivateUser,
  getCurrentUser,
  getCurrentUserPermissions,
  checkCurrentUserPermission
} from "../controllers/userController";
import { verifyJWT, requireRoles, checkPermission } from "../middleware/auth";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Gestión de usuarios
 */

// Rutas públicas (solo requieren autenticación)
/**
 * @swagger
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener información del usuario actual
 *     responses:
 *       200:
 *         description: Información del usuario
 */
router.get("/me", verifyJWT, getCurrentUser);

/**
 * @swagger
 * /api/users/me/permissions:
 *   get:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener permisos del usuario actual
 *     responses:
 *       200:
 *         description: Permisos del usuario
 */
router.get("/me/permissions", verifyJWT, getCurrentUserPermissions);

/**
 * @swagger
 * /api/users/me/check-permission:
 *   post:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Verificar si el usuario tiene un permiso específico
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [permission]
 *             properties:
 *               permission: { type: string }
 *     responses:
 *       200:
 *         description: Resultado de la verificación
 */
router.post("/me/check-permission", verifyJWT, checkCurrentUserPermission);

// Rutas administrativas (requieren permiso users.view o users.manage_roles)
/**
 * @swagger
 * /api/users:
 *   get:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Listar usuarios
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
router.get("/", verifyJWT, checkPermission('users.view'), listUsers);

/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener usuario por id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Usuario
 */
router.get("/:id", verifyJWT, checkPermission('users.view'), getUser);

/**
 * @swagger
 * /api/users:
 *   post:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Crear usuario
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
router.post("/", verifyJWT, checkPermission('users.create'), createUser);

/**
 * @swagger
 * /api/users/{id}:
 *   put:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Actualizar usuario
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
router.put("/:id", verifyJWT, checkPermission('users.edit'), updateUser);

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Eliminar usuario
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete("/:id", verifyJWT, checkPermission('users.delete'), deleteUser);

/**
 * @swagger
 * /api/users/{id}/role:
 *   patch:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Cambiar rol de usuario
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
router.patch("/:id/role", verifyJWT, checkPermission('users.manage_roles'), changeUserRole);

/**
 * @swagger
 * /api/users/{id}/activate:
 *   post:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Activar usuario
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Activado
 */
router.post("/:id/activate", verifyJWT, checkPermission('users.edit'), activateUser);

/**
 * @swagger
 * /api/users/{id}/deactivate:
 *   post:
 *     tags: [Users]
 *     security: [{ bearerAuth: [] }]
 *     summary: Desactivar usuario
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Desactivado
 */
router.post("/:id/deactivate", verifyJWT, checkPermission('users.edit'), deactivateUser);

export default router;
