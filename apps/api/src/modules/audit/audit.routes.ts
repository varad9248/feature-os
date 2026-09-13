import { Router } from 'express';
import { AuditController } from './audit.controller';
import { authenticateJWT, requireRole } from '../../middleware/auth.middleware';
import { Role } from '@feature-os/types';

export const auditRouter = Router();

// List audit logs for current organization
auditRouter.get(
  '/audit',
  authenticateJWT,
  AuditController.listLogs as any,
);

// Cryptographic hash chain verification
auditRouter.get(
  '/audit/verify',
  authenticateJWT,
  AuditController.verifyChain as any,
);

// AI Incident Vector Memory Semantic Search
auditRouter.get(
  '/audit/memory/search',
  authenticateJWT,
  AuditController.searchMemory as any,
);

// Manually record audit log entry
auditRouter.post(
  '/audit',
  authenticateJWT,
  requireRole(Role.OWNER, Role.ADMIN, Role.DEVELOPER, Role.SRE),
  AuditController.recordLog as any,
);
