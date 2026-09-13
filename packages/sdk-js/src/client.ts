import type { EvaluationContext, EvaluationResult } from '@feature-os/types';
import type {
  FeatureOSClientOptions,
  ExposureEvent,
  FlagChangeListener,
  ExposureListener,
} from './types';

export class FeatureOSClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private context: EvaluationContext;
  private readonly enableExposureTracking: boolean;
  private readonly offlineFallback: boolean;
  private flagsCache = new Map<string, EvaluationResult>();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private pollingTimer: NodeJS.Timeout | null = null;

  private changeListeners = new Set<FlagChangeListener>();
  private exposureListeners = new Set<ExposureListener>();

  constructor(options: FeatureOSClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || 'http://localhost:4000').replace(/\/$/, '');
    this.context = options.context;
    this.enableExposureTracking = options.enableExposureTracking ?? true;
    this.offlineFallback = options.offlineFallback ?? true;

    if (options.onExposure) {
      this.exposureListeners.add(options.onExposure);
    }

    if (options.initialFlags) {
      for (const [key, value] of Object.entries(options.initialFlags)) {
        this.flagsCache.set(key, value);
      }
    }

    if (options.pollingIntervalMs && options.pollingIntervalMs > 0) {
      this.pollingTimer = setInterval(() => {
        void this.fetchFlags();
      }, options.pollingIntervalMs);
    }
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.fetchFlags()
      .then(() => {
        this.isInitialized = true;
      })
      .catch((err) => {
        if (!this.offlineFallback) {
          throw err;
        }
        // If offline fallback enabled, allow app to proceed with initial/default flags
        this.isInitialized = true;
      });

    return this.initPromise;
  }

  public async setContext(newContext: EvaluationContext): Promise<void> {
    this.context = newContext;
    await this.fetchFlags();
  }

  public getContext(): EvaluationContext {
    return { ...this.context };
  }

  public isReady(): boolean {
    return this.isInitialized;
  }

  public isEnabled(flagKey: string, defaultValue = false): boolean {
    const result = this.evaluate(flagKey, defaultValue);
    return result.enabled;
  }

  public getValue<T = unknown>(flagKey: string, defaultValue: T): T {
    const result = this.evaluate(flagKey, defaultValue);
    return (result.value as T) ?? defaultValue;
  }

  public evaluate<T = unknown>(flagKey: string, defaultValue: T): EvaluationResult<T> {
    const cached = this.flagsCache.get(flagKey);

    let result: EvaluationResult<T>;
    if (cached) {
      result = {
        flagKey,
        enabled: cached.enabled,
        value: (cached.value as T) ?? defaultValue,
        variantKey: cached.variantKey,
        reason: cached.reason,
        version: cached.version,
      };
    } else {
      result = {
        flagKey,
        enabled: Boolean(defaultValue),
        value: defaultValue,
        reason: 'DEFAULT_FALLBACK',
        version: 0,
      };
    }

    if (this.enableExposureTracking) {
      this.trackExposure(result);
    }

    return result;
  }

  public getAllFlags(): Record<string, EvaluationResult> {
    const output: Record<string, EvaluationResult> = {};
    for (const [key, value] of this.flagsCache.entries()) {
      output[key] = value;
    }
    return output;
  }

  public onFlagChange(listener: FlagChangeListener): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  public onExposure(listener: ExposureListener): () => void {
    this.exposureListeners.add(listener);
    return () => {
      this.exposureListeners.delete(listener);
    };
  }

  public destroy(): void {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.changeListeners.clear();
    this.exposureListeners.clear();
    this.flagsCache.clear();
  }

  private async fetchFlags(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/api/v1/evaluate/all`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
      },
      body: JSON.stringify({
        context: this.context,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to evaluate flags: HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      success: boolean;
      data: {
        evaluations: Record<string, EvaluationResult>;
      };
    };

    if (payload.success && payload.data?.evaluations) {
      for (const [key, evaluation] of Object.entries(payload.data.evaluations)) {
        const previous = this.flagsCache.get(key);
        this.flagsCache.set(key, evaluation);

        if (!previous || previous.value !== evaluation.value || previous.enabled !== evaluation.enabled) {
          for (const listener of this.changeListeners) {
            listener(key, evaluation);
          }
        }
      }
    }
  }

  private trackExposure(result: EvaluationResult): void {
    const exposure: ExposureEvent = {
      flagKey: result.flagKey,
      userId: this.context.userId,
      enabled: result.enabled,
      value: result.value,
      variantKey: result.variantKey,
      reason: result.reason,
      timestamp: Date.now(),
    };

    for (const listener of this.exposureListeners) {
      try {
        listener(exposure);
      } catch {
        // Suppress listener errors
      }
    }
  }
}
