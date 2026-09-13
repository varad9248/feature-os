export type RolloutStrategyType = 'PERCENTAGE' | 'CANARY' | 'RING' | 'REGIONAL';

export type RolloutStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'RUNNING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'ROLLED_BACK';

export interface RolloutStepInput {
  stepNumber: number;
  percentage: number;
  durationMinutes: number;
  label?: string;
  targetRegion?: string;
}

export interface CreateRolloutScheduleInput {
  flagKey: string;
  environmentKey: string;
  strategy: RolloutStrategyType;
  customSteps?: RolloutStepInput[];
  autoAdvance?: boolean;
}

export interface RolloutHealthEvaluation {
  isHealthy: boolean;
  healthScore: number; // 0.0 to 1.0
  errorRate: number;
  baselineErrorRate: number;
  p95LatencyMs: number;
  baselineP95LatencyMs: number;
  message: string;
  evaluatedAt: string;
}

export interface RolloutScheduleDetails {
  id: string;
  flagKey: string;
  environmentKey: string;
  strategy: RolloutStrategyType;
  status: RolloutStatus;
  currentStep: number;
  healthScore: number;
  createdAt: string;
  updatedAt: string;
  steps: Array<{
    id: string;
    stepNumber: number;
    percentage: number;
    durationMinutes: number;
    passed: boolean;
  }>;
  healthReport?: RolloutHealthEvaluation;
}
