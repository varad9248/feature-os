import { Router } from 'express';
import { FlagController } from './flag.controller';
import { authenticateJWT, requirePermission } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  Permission,
  CreateFlagSchema,
  UpdateFlagSchema,
  UpdateFlagEnvironmentStateSchema,
  EvaluationRequestSchema,
  BulkEvaluationRequestSchema,
} from '@feature-os/types';

export const flagRouter: Router = Router();

// ----------------------------------------------------
// Public SDK Evaluation Endpoints (API Key Authorized)
// ----------------------------------------------------
flagRouter.post(
  '/evaluate',
  validateRequest({ body: EvaluationRequestSchema }),
  FlagController.evaluateSingle,
);

flagRouter.post(
  '/evaluate/all',
  validateRequest({ body: BulkEvaluationRequestSchema }),
  FlagController.evaluateAll,
);

// ----------------------------------------------------
// Protected Management Endpoints (JWT & RBAC Authorized)
// ----------------------------------------------------
flagRouter.get(
  '/projects/:projectId/flags',
  authenticateJWT,
  requirePermission(Permission.VIEW_ONLY),
  FlagController.listFlags,
);

flagRouter.post(
  '/projects/:projectId/flags',
  authenticateJWT,
  requirePermission(Permission.FLAG_CREATE),
  validateRequest({ body: CreateFlagSchema }),
  FlagController.createFlag,
);

flagRouter.get(
  '/projects/:projectId/flags/:flagKey',
  authenticateJWT,
  requirePermission(Permission.VIEW_ONLY),
  FlagController.getFlagDetails,
);

flagRouter.patch(
  '/projects/:projectId/flags/:flagKey',
  authenticateJWT,
  requirePermission(Permission.FLAG_EDIT),
  validateRequest({ body: UpdateFlagSchema }),
  FlagController.updateFlag,
);

flagRouter.put(
  '/projects/:projectId/flags/:flagKey/environments/:envKey',
  authenticateJWT,
  requirePermission(Permission.FLAG_TOGGLE),
  validateRequest({ body: UpdateFlagEnvironmentStateSchema }),
  FlagController.updateFlagEnvironmentState,
);

flagRouter.patch(
  '/projects/:projectId/flags/:flagKey/environments/:envKey',
  authenticateJWT,
  requirePermission(Permission.FLAG_TOGGLE),
  validateRequest({ body: UpdateFlagEnvironmentStateSchema }),
  FlagController.updateFlagEnvironmentState,
);
