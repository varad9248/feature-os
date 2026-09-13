import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { ExperimentService } from './experiment.service';
import { AppError } from '../../middleware/error.middleware';
import { ExperimentStatus } from './experiment.types';

export class ExperimentController {
  static async listExperiments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const experiments = await ExperimentService.listExperiments(projectId);
      res.status(200).json({ success: true, data: experiments });
    } catch (error) {
      next(error);
    }
  }

  static async getExperiment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { experimentId } = req.params;
      const experiment = await ExperimentService.getExperiment(experimentId);
      res.status(200).json({ success: true, data: experiment });
    } catch (error) {
      next(error);
    }
  }

  static async createExperiment(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;
      const { flagId, name, hypothesis, primaryMetric, variants } = req.body;

      if (!flagId || !name || !hypothesis || !primaryMetric || !variants) {
        throw new AppError('flagId, name, hypothesis, primaryMetric, and variants are required', 400);
      }

      const experiment = await ExperimentService.createExperiment(
        organizationId,
        projectId,
        { flagId, name, hypothesis, primaryMetric, variants },
        userId,
      );

      res.status(201).json({ success: true, data: experiment });
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { experimentId } = req.params;
      const { status } = req.body as { status: ExperimentStatus };

      if (!['DRAFT', 'RUNNING', 'PAUSED', 'CONCLUDED'].includes(status)) {
        throw new AppError('Invalid experiment status', 400);
      }

      const experiment = await ExperimentService.updateStatus(experimentId, status);
      res.status(200).json({ success: true, data: experiment });
    } catch (error) {
      next(error);
    }
  }

  static async recordTelemetry(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { experimentId } = req.params;
      const { variantKey, converted } = req.body;

      if (!variantKey) {
        throw new AppError('variantKey is required', 400);
      }

      await ExperimentService.recordTelemetry(experimentId, variantKey, !!converted);
      res.status(200).json({ success: true, message: 'Telemetry sample recorded' });
    } catch (error) {
      next(error);
    }
  }

  static async promoteWinner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { experimentId } = req.params;
      const { variantKey } = req.body;
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;

      if (!variantKey) {
        throw new AppError('variantKey is required to promote winner', 400);
      }

      const result = await ExperimentService.promoteWinner(
        organizationId,
        experimentId,
        variantKey,
        userId,
      );

      res.status(200).json({
        success: true,
        message: `Variant '${variantKey}' successfully promoted to 100% rollout in ${result.broadcastLatencyMs}ms!`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
