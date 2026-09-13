import { Router } from 'express';
import { IncidentController } from './incident.controller';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';
import { Role } from '@feature-os/types';

export const incidentRouter = Router();

// Breaker listing
incidentRouter.get(
  '/projects/:projectId/incidents/breakers',
  authenticateJWT,
  IncidentController.listBreakers as any,
);

// Breaker operations
incidentRouter.post(
  '/projects/:projectId/incidents/:flagKey/trip',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.SRE),
  IncidentController.tripBreaker as any,
);

incidentRouter.post(
  '/projects/:projectId/incidents/:flagKey/reset',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.SRE),
  IncidentController.resetBreaker as any,
);

incidentRouter.post(
  '/projects/:projectId/incidents/:flagKey/half-open',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.SRE),
  IncidentController.attemptHalfOpen as any,
);

// Chaos Simulation
incidentRouter.post(
  '/projects/:projectId/incidents/chaos/simulate',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.SRE),
  IncidentController.simulateChaos as any,
);

// Organization Incident History
incidentRouter.get('/incidents', authenticateJWT, IncidentController.listIncidents as any);
