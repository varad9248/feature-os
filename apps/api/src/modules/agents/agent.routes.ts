import { Router } from 'express';
import { AgentController } from './agent.controller';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';
import { Role } from '@feature-os/types';

export const agentRouter = Router();

// Multi-Agent evaluation runner
agentRouter.post(
  '/projects/:projectId/agents/evaluate',
  authenticateJWT,
  AgentController.evaluateFlag as any,
);

// Agent runtime status & tooling info
agentRouter.get('/agents/status', authenticateJWT, AgentController.getRuntimeStatus as any);

// AI Inbox Feed
agentRouter.get('/agents/inbox', authenticateJWT, AgentController.listInbox as any);

// Human-in-the-Loop Governance Actions
agentRouter.post(
  '/projects/:projectId/agents/suggestions/:id/approve',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER),
  AgentController.approveSuggestion as any,
);

agentRouter.post(
  '/projects/:projectId/agents/suggestions/:id/reject',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER),
  AgentController.rejectSuggestion as any,
);
