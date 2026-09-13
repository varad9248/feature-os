export type BreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  flagId: string;
  flagKey: string;
  flagName: string;
  state: BreakerState;
  failureThreshold: number; // e.g. 0.05 (5%)
  cooldownSeconds: number; // e.g. 60s
  lastTrippedAt: string | null;
  updatedAt: string;
  currentErrorRate?: number;
}

export type ChaosScenario =
  | 'ERROR_STORM_500'
  | 'HIGH_LATENCY_SPIKE'
  | 'DOWNSTREAM_DATABASE_TIMEOUT'
  | 'GPU_RENDER_CRASH';

export interface ChaosSimulationInput {
  flagKey: string;
  scenario: ChaosScenario;
  simulatedErrorRate?: number;
  simulatedLatencyMs?: number;
}

export interface ChaosSimulationResult {
  flagKey: string;
  scenario: ChaosScenario;
  injectedErrorRate: number;
  injectedLatencyMs: number;
  circuitBreakerTripped: boolean;
  previousState: BreakerState;
  newState: BreakerState;
  autonomousActionTaken: string;
  timeToSelfHealMs: number;
  timestamp: string;
}

export interface IncidentRecord {
  id: string;
  flagKey: string;
  summary: string;
  rootCause: string | null;
  resolutionDetails: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}
