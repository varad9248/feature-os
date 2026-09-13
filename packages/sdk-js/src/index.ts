export * from './types';
export * from './client';
export * from './node/server-client';
export * from './react/FeatureOSProvider';
export * from './react/useFeatureFlag';
export * from './react/FeatureGate';

// Explicit named re-exports for bundler static analysis compatibility
export { FeatureOSClient } from './client';
export { FeatureOSServerClient } from './node/server-client';
export { FeatureOSProvider, FeatureOSContext, useFeatureOS } from './react/FeatureOSProvider';
export { useFeatureFlag, useFeatureEvaluation } from './react/useFeatureFlag';
export { FeatureGate } from './react/FeatureGate';

