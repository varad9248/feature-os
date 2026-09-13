import prisma from '@feature-os/db';
import {
  Role,
  CreateOrganizationInput,
  CreateProjectInput,
  CreateEnvironmentInput,
  InviteMemberInput,
} from '@feature-os/types';
import { AppError } from '../../middleware/error.middleware';

export class TenancyService {
  // ----------------------------------------------------
  // Organization Management
  // ----------------------------------------------------
  static async listUserOrganizations(userId: string) {
    const memberships = await prisma.member.findMany({
      where: { userId },
      include: {
        organization: {
          include: {
            _count: {
              select: { members: true, projects: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return memberships.map((m) => ({
      ...m.organization,
      role: m.role,
      memberCount: m.organization._count.members,
      projectCount: m.organization._count.projects,
    }));
  }

  static async createOrganization(userId: string, input: CreateOrganizationInput) {
    const existing = await prisma.organization.findUnique({ where: { slug: input.slug } });
    if (existing) {
      throw new AppError('An organization with this slug already exists', 400);
    }

    return prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.name,
          slug: input.slug,
        },
      });

      await tx.member.create({
        data: {
          organizationId: org.id,
          userId,
          role: Role.OWNER,
        },
      });

      const project = await tx.project.create({
        data: {
          organizationId: org.id,
          name: 'Primary Project',
          key: 'primary',
          description: 'Default project workspace',
        },
      });

      await tx.environment.createMany({
        data: [
          { projectId: project.id, name: 'Development', key: 'development' },
          { projectId: project.id, name: 'Staging', key: 'staging' },
          { projectId: project.id, name: 'Production', key: 'production' },
        ],
      });

      return org;
    });
  }

  // ----------------------------------------------------
  // Project Management
  // ----------------------------------------------------
  static async listProjects(organizationId: string) {
    return prisma.project.findMany({
      where: { organizationId },
      include: {
        environments: true,
        _count: {
          select: { flags: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createProject(organizationId: string, input: CreateProjectInput) {
    const existing = await prisma.project.findUnique({
      where: {
        organizationId_key: {
          organizationId,
          key: input.key,
        },
      },
    });

    if (existing) {
      throw new AppError('A project with this key already exists in this organization', 400);
    }

    return prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          organizationId,
          name: input.name,
          key: input.key,
          description: input.description,
        },
      });

      // Automatically provision default environments
      await tx.environment.createMany({
        data: [
          { projectId: project.id, name: 'Development', key: 'development' },
          { projectId: project.id, name: 'Staging', key: 'staging' },
          { projectId: project.id, name: 'Production', key: 'production' },
        ],
      });

      return tx.project.findUnique({
        where: { id: project.id },
        include: { environments: true },
      });
    });
  }

  // ----------------------------------------------------
  // Environment Management
  // ----------------------------------------------------
  static async listEnvironments(projectId: string) {
    return prisma.environment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async createEnvironment(projectId: string, input: CreateEnvironmentInput) {
    const existing = await prisma.environment.findUnique({
      where: {
        projectId_key: {
          projectId,
          key: input.key,
        },
      },
    });

    if (existing) {
      throw new AppError('An environment with this key already exists in this project', 400);
    }

    return prisma.environment.create({
      data: {
        projectId,
        name: input.name,
        key: input.key,
      },
    });
  }

  // ----------------------------------------------------
  // Member & RBAC Management
  // ----------------------------------------------------
  static async listMembers(organizationId: string) {
    return prisma.member.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            avatarUrl: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async inviteMember(organizationId: string, input: InviteMemberInput) {
    let user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user) {
      // Create invited placeholder user
      user = await prisma.user.create({
        data: {
          email: input.email,
          name: input.email.split('@')[0],
          // Temporary placeholder password
          passwordHash: '$2a$10$wN1QyZtZqD53m5m5fG6F8.4Cg0y83iY9R1X4lM7r8q7yM6Z9g8iOm',
          isVerified: false,
        },
      });
    }

    const existingMember = await prisma.member.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      throw new AppError('This user is already a member of this organization', 400);
    }

    return prisma.member.create({
      data: {
        organizationId,
        userId: user.id,
        role: input.role,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  static async updateMemberRole(organizationId: string, memberId: string, newRole: Role) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member || member.organizationId !== organizationId) {
      throw new AppError('Member not found in this organization', 404);
    }

    return prisma.member.update({
      where: { id: memberId },
      data: { role: newRole },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
    });
  }

  static async removeMember(organizationId: string, memberId: string) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    if (!member || member.organizationId !== organizationId) {
      throw new AppError('Member not found in this organization', 404);
    }

    if (member.role === Role.OWNER) {
      const ownerCount = await prisma.member.count({
        where: { organizationId, role: Role.OWNER },
      });
      if (ownerCount <= 1) {
        throw new AppError('Cannot remove the last OWNER of an organization', 400);
      }
    }

    await prisma.member.delete({ where: { id: memberId } });
  }
}
