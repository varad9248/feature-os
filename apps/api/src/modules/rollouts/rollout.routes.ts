import { Router } from 'express';
import { RolloutController } from './rollout.controller';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';
import { Role } from '@feature-os/types';

export const rolloutRouter = Router();

// Schedule creation & listing
rolloutRouter.post(
  '/projects/:projectId/rollouts',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER),
  RolloutController.createSchedule as any,
);

rolloutRouter.get(
  '/projects/:projectId/rollouts',
  authenticateJWT,
  RolloutController.listSchedules as any,
);

rolloutRouter.get(
  '/projects/:projectId/rollouts/:id',
  authenticateJWT,
  RolloutController.getScheduleDetails as any,
);

// Progression & Manual Controls
rolloutRouter.post(
  '/projects/:projectId/rollouts/:id/advance',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER),
  RolloutController.advanceStep as any,
);

rolloutRouter.post(
  '/projects/:projectId/rollouts/:id/control',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER),
  RolloutController.controlRollout as any,
);
