import { EvaluationContext, EvaluationResult, RuleOperator } from '@feature-os/types';
import { getBucketScore } from './murmurhash';
import { matchRuleCondition } from './rule-matcher';

export interface EvaluatableFlagState {
  flagKey: string;
  flagType: string;
  isArchived: boolean;
  isEnabled: boolean;
  defaultValue: any;
  rolloutPercentage: number;
  version: number;
  environmentId: string;
  rules: Array<{
    id: string;
    attribute: string;
    operator: string;
    values: any;
    variantValue: any;
    priority: number;
  }>;
}

export function evaluateFlag(
  flagState: EvaluatableFlagState,
  context: EvaluationContext,
): EvaluationResult {
  const {
    flagKey,
    isArchived,
    isEnabled,
    defaultValue,
    rolloutPercentage,
    version,
    environmentId,
    rules,
  } = flagState;

  // 1. If archived or disabled, return default off
  if (isArchived || !isEnabled) {
    return {
      flagKey,
      enabled: false,
      value: defaultValue,
      reason: 'DISABLED',
      version,
    };
  }

  // 2. Evaluate targeting rules in priority order
  const sortedRules = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sortedRules) {
    // Look up attribute in standard context fields or custom properties
    let attrValue: any = (context as any)[rule.attribute];
    if (attrValue === undefined && context.custom) {
      attrValue = context.custom[rule.attribute];
    }

    const isMatch = matchRuleCondition(
      attrValue,
      rule.operator as RuleOperator,
      Array.isArray(rule.values) ? rule.values : [rule.values],
    );

    if (isMatch) {
      return {
        flagKey,
        enabled: true,
        value: rule.variantValue,
        variantKey: rule.id,
        reason: 'TARGETING_MATCH',
        version,
      };
    }
  }

  // 3. Fallback to percentage rollout using MurmurHash3 sticky bucketing
  if (rolloutPercentage >= 100) {
    return {
      flagKey,
      enabled: true,
      value: defaultValue,
      reason: 'PERCENTAGE_ROLLOUT',
      version,
    };
  }

  if (rolloutPercentage <= 0) {
    return {
      flagKey,
      enabled: false,
      value: defaultValue,
      reason: 'DEFAULT_FALLBACK',
      version,
    };
  }

  const score = getBucketScore(context.userId, flagKey, environmentId);

  if (score < rolloutPercentage) {
    return {
      flagKey,
      enabled: true,
      value: defaultValue,
      reason: 'PERCENTAGE_ROLLOUT',
      version,
    };
  }

  return {
    flagKey,
    enabled: false,
    value: defaultValue,
    reason: 'DEFAULT_FALLBACK',
    version,
  };
}
