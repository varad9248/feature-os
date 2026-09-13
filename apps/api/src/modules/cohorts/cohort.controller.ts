import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { CohortService } from './cohort.service';
import { AppError } from '../../middleware/error.middleware';

export class CohortController {
  /**
   * Run unsupervised ML clustering on user telemetry and discover anomalous cohorts
   */
  static async discoverCohorts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const { flagKey, environmentKey = 'development', sampleSize = 250 } = req.body;
      const organizationId = req.user.organizationId;

      if (!flagKey) {
        throw new AppError('flagKey is required in request body', 400);
      }

      const result = await CohortService.discoverCohorts(
        organizationId,
        projectId,
        flagKey,
        environmentKey,
        Number(sampleSize),
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Apply an AI Synthesized Targeting Rule directly to a Feature Flag Environment
   */
  static async applyCohortRule(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;

      const { flagKey, environmentId, cohortId, rule, createSuggestionOnly } = req.body;

      if (!flagKey || !environmentId || !rule) {
        throw new AppError('flagKey, environmentId, and rule are required', 400);
      }

      const result = await CohortService.applyCohortRule(organizationId, projectId, userId, {
        flagKey,
        environmentId,
        cohortId: cohortId || 'ai_discovered_cohort',
        rule,
        createSuggestionOnly: Boolean(createSuggestionOnly),
      });

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List saved cohorts for the current organization
   */
  static async listCohorts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user.organizationId;
      const cohorts = await CohortService.listCohorts(organizationId);
      res.status(200).json({ success: true, data: cohorts });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List pending or active AI suggestions
   */
  static async listSuggestions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user.organizationId;
      const flagId = req.query.flagId as string | undefined;
      const suggestions = await CohortService.listSuggestions(organizationId, flagId);
      res.status(200).json({ success: true, data: suggestions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resolve an AI Suggestion (APPROVED or REJECTED)
   */
  static async resolveSuggestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;

      if (status !== 'APPROVED' && status !== 'REJECTED') {
        throw new AppError('Status must be either APPROVED or REJECTED', 400);
      }

      const updated = await CohortService.resolveSuggestion(id, organizationId, userId, status);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}
