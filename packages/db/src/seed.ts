import { PrismaClient, Role, FlagType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial FeatureOS workspace data...');

  // 1. Create Default Organization
  const org = await prisma.organization.upsert({
    where: { slug: 'acme-corp' },
    update: {},
    create: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
    },
  });

  // 2. Create Default Admin User
  const user = await prisma.user.upsert({
    where: { email: 'admin@featureos.io' },
    update: {},
    create: {
      email: 'admin@featureos.io',
      name: 'System Admin',
      // bcrypt hash for 'password123'
      passwordHash: '$2b$10$fPcQU1Y9ZjLfsSo7d9UWZePuD0.WkuEQ9tOLMY3yLSfcOHhjUy1Fq',
      isVerified: true,
    },
  });

  // 3. Link Membership
  await prisma.member.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      userId: user.id,
      role: Role.OWNER,
    },
  });

  // 4. Create Default Project
  const project = await prisma.project.upsert({
    where: {
      organizationId_key: {
        organizationId: org.id,
        key: 'e-commerce-web',
      },
    },
    update: {},
    create: {
      organizationId: org.id,
      name: 'E-Commerce Web',
      key: 'e-commerce-web',
      description: 'Primary customer facing store',
    },
  });

  // 5. Create Default Environments: Development, Staging, Production
  const envDev = await prisma.environment.upsert({
    where: {
      projectId_key: {
        projectId: project.id,
        key: 'development',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      name: 'Development',
      key: 'development',
    },
  });

  const envProd = await prisma.environment.upsert({
    where: {
      projectId_key: {
        projectId: project.id,
        key: 'production',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      name: 'Production',
      key: 'production',
    },
  });

  // 6. Create Demo Flag
  const flag = await prisma.featureFlag.upsert({
    where: {
      projectId_key: {
        projectId: project.id,
        key: 'checkout-v2-ai-recommendations',
      },
    },
    update: {},
    create: {
      projectId: project.id,
      key: 'checkout-v2-ai-recommendations',
      name: 'Checkout v2 with AI Recommendations',
      description: 'Enables real-time dynamic upsell recommendations at checkout',
      type: FlagType.BOOLEAN,
      tags: ['checkout', 'ai', 'revenue'],
    },
  });

  // 7. Create Flag Environment States
  await prisma.flagEnvironmentState.upsert({
    where: {
      flagId_environmentId: {
        flagId: flag.id,
        environmentId: envDev.id,
      },
    },
    update: {},
    create: {
      flagId: flag.id,
      environmentId: envDev.id,
      isEnabled: true,
      defaultValue: true,
      rolloutPercentage: 100,
    },
  });

  await prisma.flagEnvironmentState.upsert({
    where: {
      flagId_environmentId: {
        flagId: flag.id,
        environmentId: envProd.id,
      },
    },
    update: {},
    create: {
      flagId: flag.id,
      environmentId: envProd.id,
      isEnabled: true,
      defaultValue: false,
      rolloutPercentage: 20,
    },
  });

  console.log('Database seeded successfully with initial tenant data.');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
