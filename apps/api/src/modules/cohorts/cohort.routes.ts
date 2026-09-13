import { Router } from 'express';
import { CohortController } from './cohort.controller';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';
import { Role } from '@feature-os/types';

export const cohortRouter = Router();

// Cohort discovery & rule application
cohortRouter.post(
  '/projects/:projectId/cohorts/discover',
  authenticateJWT,
  CohortController.discoverCohorts as any,
);

cohortRouter.post(
  '/projects/:projectId/cohorts/apply',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER),
  CohortController.applyCohortRule as any,
);

// Organization cohorts list
cohortRouter.get('/cohorts', authenticateJWT, CohortController.listCohorts as any);

// Suggestions
cohortRouter.get('/suggestions', authenticateJWT, CohortController.listSuggestions as any);
cohortRouter.post(
  '/suggestions/:id/resolve',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER),
  CohortController.resolveSuggestion as any,
);
