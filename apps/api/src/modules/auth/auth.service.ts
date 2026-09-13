import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '@feature-os/db';
import { env } from '@feature-os/config';
import { Role, RegisterInput, LoginInput, AuthTokens, AuthenticatedUserPayload } from '@feature-os/types';
import { AppError } from '../../middleware/error.middleware';

export class AuthService {
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async register(input: RegisterInput): Promise<{ user: any; tokens: AuthTokens; organization: any }> {
    const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
    if (existingUser) {
      throw new AppError('A user with this email already exists', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    // Create User, Organization, Member (OWNER), Project, and 3 Default Environments in a single transaction
    const orgSlug = input.organizationName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Math.random().toString(36).substring(2, 6);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          isVerified: true,
        },
      });

      const organization = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug: orgSlug,
        },
      });

      await tx.member.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          role: Role.OWNER,
        },
      });

      const project = await tx.project.create({
        data: {
          organizationId: organization.id,
          name: 'Default Project',
          key: 'default',
          description: 'Primary project workspace',
        },
      });

      await tx.environment.createMany({
        data: [
          { projectId: project.id, name: 'Development', key: 'development' },
          { projectId: project.id, name: 'Staging', key: 'staging' },
          { projectId: project.id, name: 'Production', key: 'production' },
        ],
      });

      return { user, organization };
    });

    const tokens = await this.generateTokens({
      userId: result.user.id,
      email: result.user.email,
      organizationId: result.organization.id,
      role: Role.OWNER,
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      organization: result.organization,
      tokens,
    };
  }

  static async login(input: LoginInput): Promise<{ user: any; tokens: AuthTokens; organization: any }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Invalid email or password', 401);
    }

    const isValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isValid) {
      throw new AppError('Invalid email or password', 401);
    }

    const primaryMembership = user.memberships[0];
    if (!primaryMembership) {
      throw new AppError('User is not associated with any organization', 403);
    }

    const tokens = await this.generateTokens({
      userId: user.id,
      email: user.email,
      organizationId: primaryMembership.organizationId,
      role: primaryMembership.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      organization: primaryMembership.organization,
      tokens,
    };
  }

  static async refreshTokens(rawRefreshToken: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(rawRefreshToken);
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            memberships: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await prisma.session.delete({ where: { id: session.id } });
      }
      throw new AppError('Invalid or expired refresh token', 401);
    }

    // Revoke old session
    await prisma.session.delete({ where: { id: session.id } });

    const primaryMembership = session.user.memberships[0];
    const role = primaryMembership ? primaryMembership.role : Role.VIEWER;
    const organizationId = primaryMembership ? primaryMembership.organizationId : '';

    return this.generateTokens({
      userId: session.user.id,
      email: session.user.email,
      organizationId,
      role,
    });
  }

  static async logout(userId: string): Promise<void> {
    await prisma.session.deleteMany({ where: { userId } });
  }

  static async getMe(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        memberships: {
          select: {
            role: true,
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                projects: {
                  select: {
                    id: true,
                    name: true,
                    key: true,
                    environments: {
                      select: {
                        id: true,
                        name: true,
                        key: true,
                        clientApiKey: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    return user;
  }

  private static async generateTokens(payload: AuthenticatedUserPayload): Promise<AuthTokens> {
    const accessToken = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '15m',
    });

    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await prisma.session.create({
      data: {
        userId: payload.userId,
        tokenHash,
        expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      expiresIn: '15m',
    };
  }
}
