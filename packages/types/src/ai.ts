import { z } from 'zod';

export enum SuggestionType {
  EXCLUSION_RULE = 'EXCLUSION_RULE',
  ROLLBACK = 'ROLLBACK',
  ROLLOUT_STEP = 'ROLLOUT_STEP',
  WINNER_PROMOTION = 'WINNER_PROMOTION',
}

export enum SuggestionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXECUTED = 'EXECUTED',
}

export interface DiscoveredCohort {
  id: string;
  name: string;
  description: string;
  ruleFilter: Record<string, any>;
  confidenceScore: number;
  size: number;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
}

export interface AISuggestionModel {
  id: string;
  organizationId: string;
  flagKey: string;
  type: SuggestionType;
  rationale: string;
  confidence: number;
  status: SuggestionStatus;
  suggestedAction: Record<string, any>;
  thoughtTrace: string[];
  createdAt: string;
}
