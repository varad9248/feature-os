import { Router } from 'express';
import { TenancyController } from './tenancy.controller';
import { authenticateJWT, requirePermission } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  Permission,
  CreateOrganizationSchema,
  CreateProjectSchema,
  CreateEnvironmentSchema,
  InviteMemberSchema,
  UpdateMemberRoleSchema,
} from '@feature-os/types';

export const tenancyRouter: Router = Router();

// Apply authentication to all tenancy endpoints
tenancyRouter.use(authenticateJWT);

// ----------------------------------------------------
// Organization Endpoints
// ----------------------------------------------------
tenancyRouter.get('/orgs', TenancyController.listOrganizations);
tenancyRouter.post(
  '/orgs',
  validateRequest({ body: CreateOrganizationSchema }),
  TenancyController.createOrganization,
);

// ----------------------------------------------------
// Project Endpoints
// ----------------------------------------------------
tenancyRouter.get('/orgs/:orgId/projects', TenancyController.listProjects);
tenancyRouter.post(
  '/orgs/:orgId/projects',
  requirePermission(Permission.PROJECT_MANAGE),
  validateRequest({ body: CreateProjectSchema }),
  TenancyController.createProject,
);

// ----------------------------------------------------
// Environment Endpoints
// ----------------------------------------------------
tenancyRouter.get('/projects/:projectId/environments', TenancyController.listEnvironments);
tenancyRouter.post(
  '/projects/:projectId/environments',
  requirePermission(Permission.ENV_MANAGE),
  validateRequest({ body: CreateEnvironmentSchema }),
  TenancyController.createEnvironment,
);

// ----------------------------------------------------
// Member & RBAC Endpoints
// ----------------------------------------------------
tenancyRouter.get(
  '/orgs/:orgId/members',
  requirePermission(Permission.VIEW_ONLY),
  TenancyController.listMembers,
);
tenancyRouter.post(
  '/orgs/:orgId/members/invite',
  requirePermission(Permission.MEMBER_MANAGE),
  validateRequest({ body: InviteMemberSchema }),
  TenancyController.inviteMember,
);
tenancyRouter.patch(
  '/orgs/:orgId/members/:memberId',
  requirePermission(Permission.MEMBER_MANAGE),
  validateRequest({ body: UpdateMemberRoleSchema }),
  TenancyController.updateMemberRole,
);
tenancyRouter.delete(
  '/orgs/:orgId/members/:memberId',
  requirePermission(Permission.MEMBER_MANAGE),
  TenancyController.removeMember,
);
