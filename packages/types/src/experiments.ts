export type ExperimentStatus = 'DRAFT' | 'RUNNING' | 'PAUSED' | 'CONCLUDED';

export interface ExperimentVariantDto {
  id: string;
  experimentId: string;
  key: string;
  name: string;
  weight: number;
  sampleCount: number;
  conversions: number;
}

export interface PosteriorDensityPoint {
  x: number;
  density: number;
}

export interface VariantAnalysisResult {
  key: string;
  name: string;
  sampleCount: number;
  conversions: number;
  conversionRate: number;
  credibleInterval95: [number, number];
  p2bb: number; // Probability to be Best (0.0 to 1.0)
  relativeLift: number;
  expectedLoss: number;
  posteriorDensityCurve: PosteriorDensityPoint[];
}

export interface ExperimentAnalysis {
  experimentId: string;
  variants: VariantAnalysisResult[];
  recommendedWinner: string | null;
  winnerConfidence: number;
  canStopEarly: boolean;
  summary: string;
}

export interface ExperimentDto {
  id: string;
  flagId: string;
  flagKey?: string;
  name: string;
  hypothesis: string;
  primaryMetric: string;
  status: ExperimentStatus;
  winnerVariant: string | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  variants: ExperimentVariantDto[];
  analysis?: ExperimentAnalysis;
}

export interface CreateExperimentDto {
  flagId: string;
  name: string;
  hypothesis: string;
  primaryMetric: string;
  variants: Array<{
    key: string;
    name: string;
    weight: number;
  }>;
}

export interface PromoteWinnerDto {
  variantKey: string;
}
