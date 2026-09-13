import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { RolloutService } from './rollout.service';
import { AppError } from '../../middleware/error.middleware';

export class RolloutController {
  static async createSchedule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;

      const schedule = await RolloutService.createRolloutSchedule(
        organizationId,
        projectId,
        userId,
        req.body,
      );

      res.status(201).json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  }

  static async getScheduleDetails(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const schedule = await RolloutService.getScheduleDetails(id);
      res.status(200).json({ success: true, data: schedule });
    } catch (error) {
      next(error);
    }
  }

  static async listSchedules(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const schedules = await RolloutService.listSchedules(projectId);
      res.status(200).json({ success: true, data: schedules });
    } catch (error) {
      next(error);
    }
  }

  static async advanceStep(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId, id } = req.params;
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;

      const updated = await RolloutService.advanceStep(organizationId, projectId, userId, id);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async controlRollout(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId, id } = req.params;
      const { action } = req.body;
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;

      if (!['PAUSE', 'RESUME', 'ABORT', 'FORCE_COMPLETE'].includes(action)) {
        throw new AppError('Action must be PAUSE, RESUME, ABORT, or FORCE_COMPLETE', 400);
      }

      const updated = await RolloutService.controlRollout(
        organizationId,
        projectId,
        userId,
        id,
        action,
      );

      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}
