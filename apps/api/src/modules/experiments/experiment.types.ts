export type {
  ExperimentStatus,
  ExperimentVariantDto,
  PosteriorDensityPoint,
  VariantAnalysisResult,
  ExperimentAnalysis,
  ExperimentDto,
  CreateExperimentDto,
  PromoteWinnerDto,
} from '@feature-os/types';

export interface RecordTelemetryDto {
  variantKey: string;
  converted: boolean;
}
