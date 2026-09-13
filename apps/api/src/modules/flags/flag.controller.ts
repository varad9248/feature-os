import { Request, Response, NextFunction } from 'express';
import { FlagService } from './flag.service';
import { AppError } from '../../middleware/error.middleware';

export class FlagController {
  // ----------------------------------------------------
  // Management Endpoints
  // ----------------------------------------------------
  static async listFlags(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const flags = await FlagService.listFlags(projectId);
      res.status(200).json({ success: true, data: flags });
    } catch (error) {
      next(error);
    }
  }

  static async createFlag(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId } = req.params;
      const flag = await FlagService.createFlag(projectId, req.body);
      res.status(201).json({ success: true, data: flag });
    } catch (error) {
      next(error);
    }
  }

  static async getFlagDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, flagKey } = req.params;
      const flag = await FlagService.getFlagDetails(projectId, flagKey);
      res.status(200).json({ success: true, data: flag });
    } catch (error) {
      next(error);
    }
  }

  static async updateFlag(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, flagKey } = req.params;
      const updated = await FlagService.updateFlag(projectId, flagKey, req.body);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async updateFlagEnvironmentState(req: Request, res: Response, next: NextFunction) {
    try {
      const { projectId, flagKey, envKey } = req.params;
      const updatedState = await FlagService.updateFlagEnvironmentState(
        projectId,
        flagKey,
        envKey,
        req.body,
      );
      res.status(200).json({ success: true, data: updatedState });
    } catch (error) {
      next(error);
    }
  }

  // ----------------------------------------------------
  // SDK Evaluation Endpoints (Sub-10ms)
  // ----------------------------------------------------
  static async evaluateSingle(req: Request, res: Response, next: NextFunction) {
    try {
      const apiKey =
        (req.headers['x-client-key'] as string) ||
        (req.headers['authorization']?.replace('Bearer ', '') as string);

      if (!apiKey) {
        throw new AppError('Missing X-Client-Key or Authorization header', 401);
      }

      const { flagKey, context } = req.body;
      const result = await FlagService.evaluateSingle(apiKey, flagKey, context);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  static async evaluateAll(req: Request, res: Response, next: NextFunction) {
    try {
      const apiKey =
        (req.headers['x-client-key'] as string) ||
        (req.headers['authorization']?.replace('Bearer ', '') as string);

      if (!apiKey) {
        throw new AppError('Missing X-Client-Key or Authorization header', 401);
      }

      const { context, flagKeys } = req.body;
      const results = await FlagService.evaluateAll(apiKey, context, flagKeys);
      res.status(200).json({ success: true, data: results });
    } catch (error) {
      next(error);
    }
  }
}
