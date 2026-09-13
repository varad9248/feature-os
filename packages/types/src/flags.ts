import { z } from 'zod';

export enum FlagType {
  BOOLEAN = 'BOOLEAN',
  MULTIVARIATE = 'MULTIVARIATE',
  JSON = 'JSON',
}

export enum RuleOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  IN_LIST = 'IN_LIST',
  MATCHES_REGEX = 'MATCHES_REGEX',
  SEMVER_GTE = 'SEMVER_GTE',
  SEMVER_LTE = 'SEMVER_LTE',
}

export const EvaluationContextSchema = z.object({
  userId: z.string(),
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

export interface EvaluationResult<T = any> {
  flagKey: string;
  enabled: boolean;
  value: T;
  variantKey?: string;
  reason: 'TARGETING_MATCH' | 'PERCENTAGE_ROLLOUT' | 'DEFAULT_FALLBACK' | 'DISABLED';
  version: number;
}

export const BulkEvaluationRequestSchema = z.object({
  context: EvaluationContextSchema,
  flagKeys: z.array(z.string()).optional(),
});

export type BulkEvaluationRequest = z.infer<typeof BulkEvaluationRequestSchema>;
