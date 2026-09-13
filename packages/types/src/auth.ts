import { z } from 'zod';

export const Role = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  DEVELOPER: 'DEVELOPER',
  PRODUCT_MANAGER: 'PRODUCT_MANAGER',
  SRE: 'SRE',
  VIEWER: 'VIEWER',
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export enum Permission {
  ORG_MANAGE = 'ORG_MANAGE',
  MEMBER_MANAGE = 'MEMBER_MANAGE',
  PROJECT_MANAGE = 'PROJECT_MANAGE',
  ENV_MANAGE = 'ENV_MANAGE',
  FLAG_CREATE = 'FLAG_CREATE',
  FLAG_EDIT = 'FLAG_EDIT',
  FLAG_DELETE = 'FLAG_DELETE',
  FLAG_TOGGLE = 'FLAG_TOGGLE',
  ROLLOUT_MANAGE = 'ROLLOUT_MANAGE',
  ROLLBACK_TRIGGER = 'ROLLBACK_TRIGGER',
  EXPERIMENT_MANAGE = 'EXPERIMENT_MANAGE',
  VIEW_ONLY = 'VIEW_ONLY',
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.OWNER]: Object.values(Permission),
  [Role.ADMIN]: [
    Permission.ORG_MANAGE,
    Permission.MEMBER_MANAGE,
    Permission.PROJECT_MANAGE,
    Permission.ENV_MANAGE,
    Permission.FLAG_CREATE,
    Permission.FLAG_EDIT,
    Permission.FLAG_DELETE,
    Permission.FLAG_TOGGLE,
    Permission.ROLLOUT_MANAGE,
    Permission.ROLLBACK_TRIGGER,
    Permission.EXPERIMENT_MANAGE,
    Permission.VIEW_ONLY,
  ],
  [Role.DEVELOPER]: [
    Permission.FLAG_CREATE,
    Permission.FLAG_EDIT,
    Permission.FLAG_TOGGLE,
    Permission.ROLLOUT_MANAGE,
    Permission.EXPERIMENT_MANAGE,
    Permission.VIEW_ONLY,
  ],
  [Role.PRODUCT_MANAGER]: [
    Permission.FLAG_CREATE,
    Permission.FLAG_EDIT,
    Permission.FLAG_TOGGLE,
    Permission.EXPERIMENT_MANAGE,
    Permission.VIEW_ONLY,
  ],
  [Role.SRE]: [
    Permission.FLAG_TOGGLE,
    Permission.ROLLBACK_TRIGGER,
    Permission.ROLLOUT_MANAGE,
    Permission.VIEW_ONLY,
  ],
  [Role.VIEWER]: [Permission.VIEW_ONLY],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export const RoleSchema = z.nativeEnum(Role);

export interface AuthenticatedUserPayload {
  userId: string;
  email: string;
  organizationId: string;
  role: Role;
}

export const RegisterInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  organizationName: z.string().min(2, 'Organization name must be at least 2 characters'),
});

export type RegisterInput = z.infer<typeof RegisterInputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export type LoginInput = z.infer<typeof LoginInputSchema>;

export const RefreshTokenInputSchema = z.object({
  refreshToken: z.string(),
});

export type RefreshTokenInput = z.infer<typeof RefreshTokenInputSchema>;

export const CreateOrganizationSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Slug must be alphanumeric with hyphens'),
});

export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(2),
  key: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Key must be alphanumeric with hyphens'),
  description: z.string().optional(),
});

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;

export const CreateEnvironmentSchema = z.object({
  name: z.string().min(2),
  key: z.string().min(2).regex(/^[a-z0-9-]+$/, 'Key must be alphanumeric with hyphens'),
});

export type CreateEnvironmentInput = z.infer<typeof CreateEnvironmentSchema>;

export const InviteMemberSchema = z.object({
  email: z.string().email(),
  role: RoleSchema.default(Role.DEVELOPER),
});

export type InviteMemberInput = z.infer<typeof InviteMemberSchema>;

export const UpdateMemberRoleSchema = z.object({
  role: RoleSchema,
});

export type UpdateMemberRoleInput = z.infer<typeof UpdateMemberRoleSchema>;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}
