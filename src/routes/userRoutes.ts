import { Router } from "express";
import { createUser, deleteUser, getUser, listUsers, updateUser, changeUserRole, activateUser, deactivateUser } from "../controllers/userController";
import { verifyJWT, requireRoles } from "../middleware/auth";

const router = Router();

// For now, only administrator can manage users
router.use(verifyJWT, requireRoles("administrator"));

/**
 * @swagger
 * tags:
 *   - name: Users
 *     description: Gestión de usuarios (solo administrador)
 */

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
router.get("/", listUsers);

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
router.get("/:id", getUser);

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
router.post("/", createUser);

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
router.put("/:id", updateUser);

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
router.delete("/:id", deleteUser);

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
router.patch("/:id/role", changeUserRole);

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
router.post("/:id/activate", activateUser);

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
router.post("/:id/deactivate", deactivateUser);

export default router;
