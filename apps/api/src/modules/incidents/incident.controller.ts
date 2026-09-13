import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AppError } from '../../middleware/error.middleware';

export class IncidentController {
  static async listBreakers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const breakers = await CircuitBreakerService.listBreakers(projectId);
      res.status(200).json({ success: true, data: breakers });
    } catch (error) {
      next(error);
    }
  }

  static async tripBreaker(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId, flagKey } = req.params;
      const { reason } = req.body;
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;

      const result = await CircuitBreakerService.tripBreaker(
        organizationId,
        projectId,
        userId,
        flagKey,
        reason,
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async resetBreaker(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId, flagKey } = req.params;
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;

      const result = await CircuitBreakerService.resetBreaker(
        organizationId,
        projectId,
        userId,
        flagKey,
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async attemptHalfOpen(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId, flagKey } = req.params;
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;

      const result = await CircuitBreakerService.attemptHalfOpen(
        organizationId,
        projectId,
        userId,
        flagKey,
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async simulateChaos(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;

      const result = await CircuitBreakerService.simulateChaos(
        organizationId,
        projectId,
        userId,
        req.body,
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async listIncidents(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user.organizationId;
      const incidents = await CircuitBreakerService.listIncidents(organizationId);
      res.status(200).json({ success: true, data: incidents });
    } catch (error) {
      next(error);
    }
  }
}
