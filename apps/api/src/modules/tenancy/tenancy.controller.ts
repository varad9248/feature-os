import { Request, Response, NextFunction } from 'express';
import { TenancyService } from './tenancy.service';
import { AuthenticatedRequest } from '../../middleware/auth.middleware';

export class TenancyController {
  // Organizations
  static async listOrganizations(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user.userId;
      const orgs = await TenancyService.listUserOrganizations(userId);
      res.status(200).json({ success: true, data: orgs });
    } catch (error) {
      next(error);
    }
  }

  static async createOrganization(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as AuthenticatedRequest).user.userId;
      const org = await TenancyService.createOrganization(userId, req.body);
      res.status(201).json({ success: true, data: org });
    } catch (error) {
      next(error);
    }
  }

  // Projects
  static async listProjects(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.params.orgId;
      const projects = await TenancyService.listProjects(orgId);
      res.status(200).json({ success: true, data: projects });
    } catch (error) {
      next(error);
    }
  }

  static async createProject(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.params.orgId;
      const project = await TenancyService.createProject(orgId, req.body);
      res.status(201).json({ success: true, data: project });
    } catch (error) {
      next(error);
    }
  }

  // Environments
  static async listEnvironments(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId;
      const envs = await TenancyService.listEnvironments(projectId);
      res.status(200).json({ success: true, data: envs });
    } catch (error) {
      next(error);
    }
  }

  static async createEnvironment(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId;
      const env = await TenancyService.createEnvironment(projectId, req.body);
      res.status(201).json({ success: true, data: env });
    } catch (error) {
      next(error);
    }
  }

  // Members & RBAC
  static async listMembers(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.params.orgId;
      const members = await TenancyService.listMembers(orgId);
      res.status(200).json({ success: true, data: members });
    } catch (error) {
      next(error);
    }
  }

  static async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = req.params.orgId;
      const member = await TenancyService.inviteMember(orgId, req.body);
      res.status(201).json({ success: true, data: member });
    } catch (error) {
      next(error);
    }
  }

  static async updateMemberRole(req: Request, res: Response, next: NextFunction) {
    try {
      const { orgId, memberId } = req.params;
      const { role } = req.body;
      const updated = await TenancyService.updateMemberRole(orgId, memberId, role);
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction) {
    try {
      const { orgId, memberId } = req.params;
      await TenancyService.removeMember(orgId, memberId);
      res.status(200).json({ success: true, message: 'Member removed successfully' });
    } catch (error) {
      next(error);
    }
  }
}
