import prisma from '@feature-os/db';
import { Role } from '@feature-os/types';
import { TenancyService } from '../modules/tenancy/tenancy.service';
import { AuthService } from '../modules/auth/auth.service';

export interface GraphQLContext {
  user?: {
    userId: string;
    email: string;
    organizationId: string;
    role: Role;
  };
}

export const resolvers = {
  Query: {
    systemHealth: () => 'FeatureOS GraphQL Gateway Operational',
    me: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.user) return null;
      return AuthService.getMe(context.user.userId);
    },
    organizations: async (_: any, __: any, context: GraphQLContext) => {
      if (!context.user) return [];
      return TenancyService.listUserOrganizations(context.user.userId);
    },
    organization: async (_: any, { id }: { id: string }) => {
      return prisma.organization.findUnique({
        where: { id },
        include: {
          projects: { include: { environments: true } },
          members: { include: { user: true } },
        },
      });
    },
    projects: async (_: any, { organizationId }: { organizationId: string }) => {
      return TenancyService.listProjects(organizationId);
    },
    members: async (_: any, { organizationId }: { organizationId: string }) => {
      return TenancyService.listMembers(organizationId);
    },
    flags: async (_: any, { projectId }: { projectId: string }) => {
      return prisma.featureFlag.findMany({ where: { projectId } });
    },
  },

  Mutation: {
    inviteMember: async (
      _: any,
      { organizationId, email, role }: { organizationId: string; email: string; role: Role },
    ) => {
      return TenancyService.inviteMember(organizationId, { email, role });
    },
    updateMemberRole: async (
      _: any,
      { organizationId, memberId, role }: { organizationId: string; memberId: string; role: Role },
    ) => {
      return TenancyService.updateMemberRole(organizationId, memberId, role);
    },
    removeMember: async (
      _: any,
      { organizationId, memberId }: { organizationId: string; memberId: string },
    ) => {
      await TenancyService.removeMember(organizationId, memberId);
      return true;
    },
  },
};
