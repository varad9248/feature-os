import { Router } from 'express';
import { ExperimentController } from './experiment.controller';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';
import { Role } from '@feature-os/types';

export const experimentRouter = Router();

// List all experiments for a project
experimentRouter.get(
  '/projects/:projectId/experiments',
  authenticateJWT,
  ExperimentController.listExperiments as any,
);

// Get single experiment with Bayesian analysis
experimentRouter.get(
  '/projects/:projectId/experiments/:experimentId',
  authenticateJWT,
  ExperimentController.getExperiment as any,
);

// Create new experiment
experimentRouter.post(
  '/projects/:projectId/experiments',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.PRODUCT_MANAGER),
  ExperimentController.createExperiment as any,
);

// Update experiment status
experimentRouter.patch(
  '/projects/:projectId/experiments/:experimentId/status',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.PRODUCT_MANAGER),
  ExperimentController.updateStatus as any,
);

// Ingest telemetry sample for a variant
experimentRouter.post(
  '/projects/:projectId/experiments/:experimentId/telemetry',
  authenticateJWT,
  ExperimentController.recordTelemetry as any,
);

// Promote winning variant to 100% rollout with <50ms Redis Pub/Sub broadcast
experimentRouter.post(
  '/projects/:projectId/experiments/:experimentId/promote',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.PRODUCT_MANAGER),
  ExperimentController.promoteWinner as any,
);
