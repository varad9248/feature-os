import prisma, { FlagType } from '@feature-os/db';
import {
  CreateFlagInput,
  UpdateFlagInput,
  UpdateFlagEnvironmentStateInput,
  EvaluationContext,
  EvaluationResult,
} from '@feature-os/types';
import { evaluateFlag, EvaluatableFlagState } from './evaluator/flag-evaluator';
import { AppError } from '../../middleware/error.middleware';

export class FlagService {
  // ----------------------------------------------------
  // Flag CRUD
  // ----------------------------------------------------
  static async listFlags(projectId: string) {
    return prisma.featureFlag.findMany({
      where: { projectId, isArchived: false },
      include: {
        envStates: {
          include: {
            environment: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async createFlag(projectId: string, input: CreateFlagInput) {
    const existing = await prisma.featureFlag.findUnique({
      where: {
        projectId_key: {
          projectId,
          key: input.key,
        },
      },
    });

    if (existing) {
      throw new AppError('A feature flag with this key already exists in this project', 400);
    }

    // Retrieve all environments for this project to initialize environment states
    const environments = await prisma.environment.findMany({ where: { projectId } });

    return prisma.$transaction(async (tx) => {
      const flag = await tx.featureFlag.create({
        data: {
          projectId,
          key: input.key,
          name: input.name,
          description: input.description,
          type: input.type as any,
          tags: input.tags,
        },
      });

      // Default env states: enabled false in all environments initially
      for (const env of environments) {
        await tx.flagEnvironmentState.create({
          data: {
            flagId: flag.id,
            environmentId: env.id,
            isEnabled: false,
            defaultValue: input.type === FlagType.BOOLEAN ? false : 'default',
            rolloutPercentage: 100,
          },
        });
      }

      return tx.featureFlag.findUnique({
        where: { id: flag.id },
        include: {
          envStates: {
            include: { environment: true },
          },
        },
      });
    });
  }

  static async getFlagDetails(projectId: string, flagKey: string) {
    const flag = await prisma.featureFlag.findUnique({
      where: {
        projectId_key: {
          projectId,
          key: flagKey,
        },
      },
      include: {
        envStates: {
          include: {
            environment: true,
            rules: {
              orderBy: { priority: 'asc' },
            },
          },
        },
      },
    });

    if (!flag) {
      throw new AppError('Feature flag not found', 404);
    }

    return flag;
  }

  static async updateFlag(projectId: string, flagKey: string, input: UpdateFlagInput) {
    const flag = await this.getFlagDetails(projectId, flagKey);

    return prisma.featureFlag.update({
      where: { id: flag.id },
      data: {
        name: input.name,
        description: input.description,
        tags: input.tags,
        isArchived: input.isArchived,
      },
      include: {
        envStates: {
          include: { environment: true },
        },
      },
    });
  }

  static async updateFlagEnvironmentState(
    projectId: string,
    flagKey: string,
    envKey: string,
    input: UpdateFlagEnvironmentStateInput,
  ) {
    const flag = await this.getFlagDetails(projectId, flagKey);
    const env = await prisma.environment.findUnique({
      where: {
        projectId_key: {
          projectId,
          key: envKey,
        },
      },
    });

    if (!env) {
      throw new AppError(`Environment '${envKey}' not found`, 404);
    }

    const state = await prisma.flagEnvironmentState.findUnique({
      where: {
        flagId_environmentId: {
          flagId: flag.id,
          environmentId: env.id,
        },
      },
    });

    if (!state) {
      throw new AppError('Flag state for this environment not found', 404);
    }

    return prisma.$transaction(async (tx) => {
      // If rules provided, replace existing rules
      if (input.rules) {
        await tx.targetingRule.deleteMany({
          where: { flagEnvStateId: state.id },
        });

        if (input.rules.length > 0) {
          await tx.targetingRule.createMany({
            data: input.rules.map((r, index) => ({
              flagEnvStateId: state.id,
              attribute: r.attribute,
              operator: r.operator,
              values: r.values,
              variantValue: r.variantValue,
              priority: r.priority !== undefined ? r.priority : index,
            })),
          });
        }
      }

      return tx.flagEnvironmentState.update({
        where: { id: state.id },
        data: {
          isEnabled: input.isEnabled !== undefined ? input.isEnabled : state.isEnabled,
          defaultValue: input.defaultValue !== undefined ? input.defaultValue : state.defaultValue,
          rolloutPercentage:
            input.rolloutPercentage !== undefined
              ? input.rolloutPercentage
              : state.rolloutPercentage,
          version: { increment: 1 },
        },
        include: {
          environment: true,
          rules: { orderBy: { priority: 'asc' } },
        },
      });
    });
  }

  // ----------------------------------------------------
  // Evaluation Engine API
  // ----------------------------------------------------
  static async evaluateSingle(
    apiKey: string,
    flagKey: string,
    context: EvaluationContext,
  ): Promise<EvaluationResult> {
    // 1. Resolve environment by client or server API key
    const env = await prisma.environment.findFirst({
      where: {
        OR: [{ clientApiKey: apiKey }, { serverApiKey: apiKey }],
      },
    });

    if (!env) {
      throw new AppError('Unauthorized. Invalid FeatureOS Client API Key.', 401);
    }

    // 2. Fetch flag and its environment state
    const flag = await prisma.featureFlag.findUnique({
      where: {
        projectId_key: {
          projectId: env.projectId,
          key: flagKey,
        },
      },
      include: {
        envStates: {
          where: { environmentId: env.id },
          include: { rules: true },
        },
      },
    });

    if (!flag || !flag.envStates[0]) {
      return {
        flagKey,
        enabled: false,
        value: false,
        reason: 'DEFAULT_FALLBACK',
        version: 0,
      };
    }

    const envState = flag.envStates[0];

    const stateToEval: EvaluatableFlagState = {
      flagKey: flag.key,
      flagType: flag.type,
      isArchived: flag.isArchived,
      isEnabled: envState.isEnabled,
      defaultValue: envState.defaultValue,
      rolloutPercentage: envState.rolloutPercentage,
      version: envState.version,
      environmentId: env.id,
      rules: envState.rules,
    };

    return evaluateFlag(stateToEval, context);
  }

  static async evaluateAll(
    apiKey: string,
    context: EvaluationContext,
    filterKeys?: string[],
  ): Promise<Record<string, EvaluationResult>> {
    const env = await prisma.environment.findFirst({
      where: {
        OR: [{ clientApiKey: apiKey }, { serverApiKey: apiKey }],
      },
    });

    if (!env) {
      throw new AppError('Unauthorized. Invalid FeatureOS Client API Key.', 401);
    }

    const flags = await prisma.featureFlag.findMany({
      where: {
        projectId: env.projectId,
        isArchived: false,
        ...(filterKeys && filterKeys.length > 0 ? { key: { in: filterKeys } } : {}),
      },
      include: {
        envStates: {
          where: { environmentId: env.id },
          include: { rules: true },
        },
      },
    });

    const results: Record<string, EvaluationResult> = {};

    for (const flag of flags) {
      const envState = flag.envStates[0];
      if (!envState) continue;

      const stateToEval: EvaluatableFlagState = {
        flagKey: flag.key,
        flagType: flag.type,
        isArchived: flag.isArchived,
        isEnabled: envState.isEnabled,
        defaultValue: envState.defaultValue,
        rolloutPercentage: envState.rolloutPercentage,
        version: envState.version,
        environmentId: env.id,
        rules: envState.rules,
      };

      results[flag.key] = evaluateFlag(stateToEval, context);
    }

    return results;
  }
}
