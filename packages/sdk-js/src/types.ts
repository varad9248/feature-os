import type { EvaluationContext, EvaluationResult } from '@feature-os/types';

export interface ExposureEvent {
  flagKey: string;
  userId: string;
  enabled: boolean;
  value: unknown;
  variantKey?: string;
  reason: string;
  timestamp: number;
}

export interface FeatureOSClientOptions {
  apiKey: string;
  baseUrl?: string;
  context: EvaluationContext;
  pollingIntervalMs?: number;
  enableExposureTracking?: boolean;
  onExposure?: (event: ExposureEvent) => void;
  initialFlags?: Record<string, EvaluationResult>;
  offlineFallback?: boolean;
  enableRealtime?: boolean;
}

export interface FeatureOSServerOptions {
  apiKey: string;
  baseUrl?: string;
  pollingIntervalMs?: number;
  enableExposureTracking?: boolean;
  onExposure?: (event: ExposureEvent) => void;
}

export type FlagChangeListener = (flagKey: string, result: EvaluationResult) => void;
export type ExposureListener = (event: ExposureEvent) => void;
