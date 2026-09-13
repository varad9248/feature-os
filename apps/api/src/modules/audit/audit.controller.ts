import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AuditService } from './audit.service';
import { AppError } from '../../middleware/error.middleware';

export class AuditController {
  static async listLogs(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user.organizationId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const actionFilter = req.query.action as string | undefined;

      const result = await AuditService.listAuditLogs(organizationId, limit, offset, actionFilter);
      res.status(200).json({ success: true, data: result.logs, total: result.total });
    } catch (error) {
      next(error);
    }
  }

  static async verifyChain(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user.organizationId;
      const verification = await AuditService.verifyChain(organizationId);
      res.status(200).json({
        success: true,
        message: verification.isValid
          ? 'Audit log chain cryptographically verified. Zero tampering detected.'
          : 'Cryptographic tampering detected in audit trail!',
        data: verification,
      });
    } catch (error) {
      next(error);
    }
  }

  static async searchMemory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = (req.query.q as string) || 'outage';
      const flagKey = req.query.flagKey as string | undefined;
      const topK = parseInt(req.query.topK as string) || 5;

      const result = await AuditService.searchIncidentMemory(query, flagKey, topK);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async recordLog(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;
      const { action, entityType, entityId, afterState, beforeState } = req.body;

      if (!action || !entityType || !entityId) {
        throw new AppError('action, entityType, and entityId are required', 400);
      }

      const log = await AuditService.recordLog(
        organizationId,
        action,
        entityType,
        entityId,
        afterState || {},
        userId,
        beforeState,
      );

      res.status(201).json({ success: true, data: log });
    } catch (error) {
      next(error);
    }
  }
}
