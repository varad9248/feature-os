import { z } from 'zod';

export const FlagType = {
  BOOLEAN: 'BOOLEAN',
  MULTIVARIATE: 'MULTIVARIATE',
  JSON: 'JSON',
} as const;

export type FlagType = (typeof FlagType)[keyof typeof FlagType];

export const FlagTypeSchema = z.nativeEnum(FlagType);

export const RuleOperator = {
  EQUALS: 'EQUALS',
  NOT_EQUALS: 'NOT_EQUALS',
  CONTAINS: 'CONTAINS',
  NOT_CONTAINS: 'NOT_CONTAINS',
  GREATER_THAN: 'GREATER_THAN',
  LESS_THAN: 'LESS_THAN',
  IN_LIST: 'IN_LIST',
  MATCHES_REGEX: 'MATCHES_REGEX',
  SEMVER_GTE: 'SEMVER_GTE',
  SEMVER_LTE: 'SEMVER_LTE',
} as const;

export type RuleOperator = (typeof RuleOperator)[keyof typeof RuleOperator];

export const RuleOperatorSchema = z.nativeEnum(RuleOperator);

// ----------------------------------------------------
// Evaluation Schemas
// ----------------------------------------------------

export const EvaluationContextSchema = z.object({
  userId: z.string().min(1, 'userId is required for deterministic sticky bucketing'),
  email: z.string().optional(),
  country: z.string().optional(),
  city: z.string().optional(),
  device: z.string().optional(),
  browser: z.string().optional(),
  os: z.string().optional(),
  appVersion: z.string().optional(),
  custom: z.record(z.any()).optional().default({}),
});

export type EvaluationContext = z.infer<typeof EvaluationContextSchema>;

export const EvaluationResultSchema = z.object({
  flagKey: z.string(),
  enabled: z.boolean(),
  value: z.any(),
  variantKey: z.string().optional(),
  reason: z.enum(['TARGETING_MATCH', 'PERCENTAGE_ROLLOUT', 'DEFAULT_FALLBACK', 'DISABLED']),
  version: z.number(),
});

export type EvaluationResult<T = any> = {
  flagKey: string;
  enabled: boolean;
  value: T;
  variantKey?: string;
  reason: 'TARGETING_MATCH' | 'PERCENTAGE_ROLLOUT' | 'DEFAULT_FALLBACK' | 'DISABLED';
  version: number;
};

export const EvaluationRequestSchema = z.object({
  flagKey: z.string(),
  context: EvaluationContextSchema,
  defaultValue: z.any().optional().default(false),
});

export type EvaluationRequest = z.infer<typeof EvaluationRequestSchema>;

export const BulkEvaluationRequestSchema = z.object({
  context: EvaluationContextSchema,
  flagKeys: z.array(z.string()).optional(),
});

export type BulkEvaluationRequest = z.infer<typeof BulkEvaluationRequestSchema>;

// ----------------------------------------------------
// Flag CRUD & Management Schemas
// ----------------------------------------------------

export const CreateFlagSchema = z.object({
  key: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-_.]+$/, 'Key must contain lowercase alphanumeric characters, dashes, dots, or underscores'),
  name: z.string().min(2),
  description: z.string().optional(),
  type: FlagTypeSchema.default(FlagType.BOOLEAN),
  tags: z.array(z.string()).default([]),
});

export type CreateFlagInput = z.infer<typeof CreateFlagSchema>;

export const UpdateFlagSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
});

export type UpdateFlagInput = z.infer<typeof UpdateFlagSchema>;

export const TargetingRuleInputSchema = z.object({
  attribute: z.string().min(1),
  operator: RuleOperatorSchema,
  values: z.array(z.any()).min(1),
  variantValue: z.any(),
  priority: z.number().int().default(0),
});

export type TargetingRuleInput = z.infer<typeof TargetingRuleInputSchema>;

export const UpdateFlagEnvironmentStateSchema = z.object({
  isEnabled: z.boolean().optional(),
  defaultValue: z.any().optional(),
  rolloutPercentage: z.number().min(0).max(100).optional(),
  rules: z.array(TargetingRuleInputSchema).optional(),
});

export type UpdateFlagEnvironmentStateInput = z.infer<typeof UpdateFlagEnvironmentStateSchema>;
