import { Request, Response, NextFunction } from "express";
import { logAction } from "../controllers/adminController";

export type DetailsBuilder = (req: Request, error: any) => Record<string, any>;

/**
 * withAudit: Wrapper para controladores que centraliza manejo de errores y auditoría
 * - Registra errores con logAction(userId, action, resource, details, success=false, errorMessage)
 * - Responde 500 por defecto (o deja que el handler responda si no lanza)
 */
export function withAudit(
  action: string,
  resource: string,
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void> | void,
  makeDetails?: DetailsBuilder
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error: any) {
      try {
        const user = (req as any).user;
        const details = makeDetails ? makeDetails(req, error) : { error: error?.message };
        await logAction(user?.sub, action, resource, details, false, error?.message || "Error");
      } catch {}
      // Si aún no se envió respuesta, devolver 500 por defecto
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: (error as Error).message || "Error" });
      }
    }
  };
}
