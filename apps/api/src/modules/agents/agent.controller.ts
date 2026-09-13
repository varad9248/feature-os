import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';
import { AgentService } from './agent.service';
import { AppError } from '../../middleware/error.middleware';

export class AgentController {
  /**
   * Run the 5-agent LangGraph analysis on a feature flag
   */
  static async evaluateFlag(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const { flagKey, environmentKey = 'development' } = req.body;
      const organizationId = req.user.organizationId;

      if (!flagKey) {
        throw new AppError('flagKey is required', 400);
      }

      const result = await AgentService.evaluateFlag(
        organizationId,
        projectId,
        flagKey,
        environmentKey,
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get active status of the 5 specialized agents
   */
  static async getRuntimeStatus(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const status = await AgentService.getRuntimeStatus();
      res.status(200).json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List pending or active suggestions in the AI Inbox
   */
  static async listInbox(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const organizationId = req.user.organizationId;
      const status = req.query.status as string | undefined;
      const suggestions = await AgentService.listInboxSuggestions(organizationId, status);
      res.status(200).json({ success: true, data: suggestions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * HITL Approval: Execute the suggestion
   */
  static async approveSuggestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { projectId, id } = req.params;
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;

      const result = await AgentService.approveAndExecuteSuggestion(
        organizationId,
        projectId,
        userId,
        id,
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * HITL Rejection: Dismiss the suggestion
   */
  static async rejectSuggestion(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const organizationId = req.user.organizationId;
      const userId = req.user.userId;

      const result = await AgentService.rejectSuggestion(
        organizationId,
        userId,
        id,
        reason,
      );

      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}
