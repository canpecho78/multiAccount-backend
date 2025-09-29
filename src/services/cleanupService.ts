import { sessionManager } from "./sessionManager";
import { whatsappService } from "./whatsappService";

/**
 * CleanupService - Servicio para limpieza automática y mantenimiento de sesiones
 * Ejecuta tareas periódicas de limpieza y optimización
 */
export class CleanupService {
  private cleanupInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Iniciar servicio de limpieza automática
   */
  start() {
    console.log("🧹 Iniciando servicio de limpieza automática...");

    // Limpieza de sesiones inactivas cada 6 horas
    this.cleanupInterval = setInterval(
      async () => {
        await this.cleanupInactiveSessions();
      },
      6 * 60 * 60 * 1000
    ); // 6 horas

    // Health check cada 5 minutos
    this.healthCheckInterval = setInterval(
      async () => {
        await this.performHealthCheck();
      },
      5 * 60 * 1000
    ); // 5 minutos

    console.log("✅ Servicio de limpieza iniciado correctamente");
  }

  /**
   * Detener servicio de limpieza
   */
  stop() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    console.log("🛑 Servicio de limpieza detenido");
  }

  /**
   * Limpiar sesiones inactivas
   */
  private async cleanupInactiveSessions() {
    try {
      console.log("🧹 Ejecutando limpieza de sesiones inactivas...");

      // Limpiar sesiones con más de 30 días de inactividad
      const deletedCount = await sessionManager.cleanupInactiveSessions(30);

      if (deletedCount > 0) {
        console.log(`✅ Limpiadas ${deletedCount} sesiones inactivas`);
      } else {
        console.log("✅ No hay sesiones inactivas para limpiar");
      }
    } catch (error) {
      console.error("❌ Error en limpieza de sesiones:", error);
    }
  }

  /**
   * Realizar health check de sesiones activas
   */
  private async performHealthCheck() {
    try {
      const sessions = whatsappService.getAllSessions();
      const now = Date.now();

      for (const [sessionId, data] of Object.entries(sessions)) {
        // Calcular uso de memoria (aproximado)
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB
        const memoryPerSession = memoryUsage / Object.keys(sessions).length;

        // Actualizar health check en la base de datos
        await sessionManager.updateHealthCheck(sessionId, memoryPerSession);

        // Verificar sesiones que llevan mucho tiempo desconectadas
        const timeSinceLastSeen = now - data.lastSeen.getTime();
        const fiveMinutes = 5 * 60 * 1000;

        if (!data.isConnected && timeSinceLastSeen > fiveMinutes) {
          console.log(
            `⚠️ Sesión ${sessionId} desconectada por más de 5 minutos`
          );
          // Aquí podrías implementar lógica adicional, como notificaciones
        }
      }
    } catch (error) {
      console.error("❌ Error en health check:", error);
    }
  }

  /**
   * Ejecutar limpieza manual inmediata
   */
  async runManualCleanup(daysInactive: number = 30): Promise<number> {
    console.log(`🧹 Ejecutando limpieza manual (${daysInactive} días)...`);
    const deletedCount = await sessionManager.cleanupInactiveSessions(
      daysInactive
    );
    console.log(`✅ Limpiadas ${deletedCount} sesiones`);
    return deletedCount;
  }

  /**
   * Obtener reporte de salud del sistema
   */
  async getHealthReport(): Promise<{
    totalSessions: number;
    activeSessions: number;
    connectedSessions: number;
    problematicSessions: number;
    memoryUsage: {
      total: number;
      perSession: number;
    };
    uptime: number;
  }> {
    const stats = await sessionManager.getStatistics();
    const problematicSessions = await sessionManager.getProblematicSessions(3);
    const sessions = whatsappService.getAllSessions();

    const memoryUsage = process.memoryUsage();
    const totalMemoryMB = memoryUsage.heapUsed / 1024 / 1024;
    const sessionCount = Object.keys(sessions).length || 1;

    return {
      totalSessions: stats.total,
      activeSessions: stats.active,
      connectedSessions: stats.connected,
      problematicSessions: problematicSessions.length,
      memoryUsage: {
        total: Math.round(totalMemoryMB * 100) / 100,
        perSession: Math.round((totalMemoryMB / sessionCount) * 100) / 100,
      },
      uptime: process.uptime(),
    };
  }

  /**
   * Resetear sesiones problemáticas
   */
  async resetProblematicSessions(minAttempts: number = 5): Promise<number> {
    const problematic = await sessionManager.getProblematicSessions(
      minAttempts
    );
    let resetCount = 0;

    for (const session of problematic) {
      await sessionManager.resetConnectionAttempts(session.sessionId);
      resetCount++;
      console.log(
        `🔄 Reseteados intentos de conexión para: ${session.sessionId}`
      );
    }

    return resetCount;
  }
}

export const cleanupService = new CleanupService();
