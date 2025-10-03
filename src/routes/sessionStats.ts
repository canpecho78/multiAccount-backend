import { Router } from "express";
import { sessionManager } from "../services/sessionManager";

const router = Router();

/**
 * GET /api/sessions/stats
 * Obtener estadísticas generales del sistema
 */
router.get("/stats", async (req, res) => {
  try {
    const stats = await sessionManager.getStatistics();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sessions/active
 * Obtener todas las sesiones activas
 */
router.get("/active", async (req, res) => {
  try {
    const sessions = await sessionManager.getActiveSessions();
    res.json({
      success: true,
      data: sessions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sessions/connected
 * Obtener sesiones conectadas
 */
router.get("/connected", async (req, res) => {
  try {
    const sessions = await sessionManager.getConnectedSessions();
    res.json({
      success: true,
      data: sessions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sessions/:sessionId/details
 * Obtener detalles de una sesión específica
 */
router.get("/:sessionId/details", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await sessionManager.getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: "Session not found",
      });
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/sessions/problematic
 * Obtener sesiones con problemas (muchos intentos fallidos)
 */
router.get("/problematic", async (req, res) => {
  try {
    const minAttempts = parseInt(req.query.minAttempts as string) || 5;
    const sessions = await sessionManager.getProblematicSessions(minAttempts);
    
    res.json({
      success: true,
      data: sessions,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sessions/:sessionId/reset-attempts
 * Resetear intentos de conexión de una sesión
 */
router.post("/:sessionId/reset-attempts", async (req, res) => {
  try {
    const { sessionId } = req.params;
    await sessionManager.resetConnectionAttempts(sessionId);
    
    res.json({
      success: true,
      message: "Connection attempts reset successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sessions/:sessionId/health-check
 * Actualizar health check de una sesión
 */
router.post("/:sessionId/health-check", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { memoryMB } = req.body;
    
    await sessionManager.updateHealthCheck(sessionId, memoryMB || 0);
    
    res.json({
      success: true,
      message: "Health check updated",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/sessions/:sessionId/cleanup
 * Eliminar completamente una sesión (incluyendo datos)
 */
router.delete("/:sessionId/cleanup", async (req, res) => {
  try {
    const { sessionId } = req.params;
    await sessionManager.deleteSession(sessionId);
    
    res.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/sessions/cleanup-inactive
 * Limpiar sesiones inactivas (más de X días)
 */
router.post("/cleanup-inactive", async (req, res) => {
  try {
    const { daysInactive } = req.body;
    const deletedCount = await sessionManager.cleanupInactiveSessions(
      daysInactive || 30
    );
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} inactive sessions`,
      deletedCount,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
