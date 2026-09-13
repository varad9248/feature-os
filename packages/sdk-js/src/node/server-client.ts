import type { EvaluationContext, EvaluationResult } from '@feature-os/types';
import type { FeatureOSServerOptions, ExposureEvent, ExposureListener } from '../types';

export class FeatureOSServerClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly enableExposureTracking: boolean;
  private exposureListeners = new Set<ExposureListener>();

  constructor(options: FeatureOSServerOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || 'http://localhost:4000').replace(/\/$/, '');
    this.enableExposureTracking = options.enableExposureTracking ?? true;

    if (options.onExposure) {
      this.exposureListeners.add(options.onExposure);
    }
  }

  public async evaluate<T = unknown>(
    flagKey: string,
    context: EvaluationContext,
    defaultValue: T
  ): Promise<EvaluationResult<T>> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          flagKey,
          context,
          defaultValue,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = (await response.json()) as {
        success: boolean;
        data: EvaluationResult<T>;
      };

      const result = payload.data;
      if (this.enableExposureTracking) {
        this.trackExposure(result, context.userId);
      }
      return result;
    } catch {
      // Fallback
      const fallbackResult: EvaluationResult<T> = {
        flagKey,
        enabled: Boolean(defaultValue),
        value: defaultValue,
        reason: 'DEFAULT_FALLBACK',
        version: 0,
      };

      if (this.enableExposureTracking) {
        this.trackExposure(fallbackResult, context.userId);
      }

      return fallbackResult;
    }
  }

  public async evaluateAll(context: EvaluationContext): Promise<Record<string, EvaluationResult>> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluate/all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        context,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      success: boolean;
      data: {
        evaluations: Record<string, EvaluationResult>;
      };
    };

    return payload.data?.evaluations || {};
  }

  public onExposure(listener: ExposureListener): () => void {
    this.exposureListeners.add(listener);
    return () => {
      this.exposureListeners.delete(listener);
    };
  }

  public destroy(): void {
    this.exposureListeners.clear();
  }

  private trackExposure(result: EvaluationResult, userId: string): void {
    const event: ExposureEvent = {
      flagKey: result.flagKey,
      userId,
      enabled: result.enabled,
      value: result.value,
      variantKey: result.variantKey,
      reason: result.reason,
      timestamp: Date.now(),
    };

    for (const listener of this.exposureListeners) {
      try {
        listener(event);
      } catch {
        // Suppress listener error
      }
    }
  }
}
