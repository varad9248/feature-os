import { useEffect, useState } from 'react';
import type { EvaluationResult } from '@feature-os/types';
import { useFeatureOS } from './FeatureOSProvider';

export interface UseFeatureFlagResult<T> {
  enabled: boolean;
  value: T;
  reason: string;
  version: number;
  loading: boolean;
}

export function useFeatureEvaluation<T = unknown>(
  flagKey: string,
  defaultValue: T
): EvaluationResult<T> {
  const { client, isReady } = useFeatureOS();

  const getEvaluation = (): EvaluationResult<T> => {
    if (!client) {
      return {
        flagKey,
        enabled: Boolean(defaultValue),
        value: defaultValue,
        reason: 'DEFAULT_FALLBACK',
        version: 0,
      };
    }
    return client.evaluate<T>(flagKey, defaultValue);
  };

  const [evaluation, setEvaluation] = useState<EvaluationResult<T>>(getEvaluation);

  useEffect(() => {
    if (!client) return;

    // Update on mount or when client is ready
    setEvaluation(client.evaluate<T>(flagKey, defaultValue));

    const unsubscribe = client.onFlagChange((key, newResult) => {
      if (key === flagKey) {
        setEvaluation({
          flagKey,
          enabled: newResult.enabled,
          value: (newResult.value as T) ?? defaultValue,
          variantKey: newResult.variantKey,
          reason: newResult.reason,
          version: newResult.version,
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [client, flagKey, isReady, defaultValue]);

  return evaluation;
}

export function useFeatureFlag<T = boolean>(
  flagKey: string,
  defaultValue: T
): UseFeatureFlagResult<T> {
  const { isReady } = useFeatureOS();
  const evaluation = useFeatureEvaluation<T>(flagKey, defaultValue);

  return {
    enabled: evaluation.enabled,
    value: evaluation.value,
    reason: evaluation.reason,
    version: evaluation.version,
    loading: !isReady,
  };
}
