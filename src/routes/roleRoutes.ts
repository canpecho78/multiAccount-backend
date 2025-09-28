import { Router } from "express";
import { createRole, deleteRole, getRole, listRoles, updateRole } from "../controllers/roleController";
import { verifyJWT, requireRoles } from "../middleware/auth";

const router = Router();

// Only administrator can manage roles
router.use(verifyJWT, requireRoles("administrator"));

/**
 * @swagger
 * tags:
 *   - name: Roles
 *     description: Gestión de roles (solo administrador)
 */

/**
 * @swagger
 * /api/roles:
 *   get:
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     summary: Listar roles
 *     responses:
 *       200:
 *         description: Lista de roles
 */
router.get("/", listRoles);

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     summary: Obtener rol por id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rol
 */
router.get("/:id", getRole);

/**
 * @swagger
 * /api/roles:
 *   post:
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     summary: Crear rol
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               active:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Rol creado
 */
router.post("/", createRole);

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     summary: Actualizar rol
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: false
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
router.put("/:id", updateRole);

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     tags: [Roles]
 *     security: [{ bearerAuth: [] }]
 *     summary: Eliminar rol
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Eliminado
 */
router.delete("/:id", deleteRole);

export default router;
