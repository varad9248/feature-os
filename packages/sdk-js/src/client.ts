import {
  type EvaluationContext,
  type EvaluationResult,
  type StreamEvent,
  type TelemetryEvent,
  TelemetryEventType,
} from '@feature-os/types';
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
  private readonly enableRealtime: boolean;
  private flagsCache = new Map<string, EvaluationResult>();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private pollingTimer: ReturnType<typeof setTimeout> | null = null;
  private sseSource: EventSource | null = null;
  private sseReconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  // Telemetry buffer
  private telemetryQueue: TelemetryEvent[] = [];
  private telemetryTimer: ReturnType<typeof setTimeout> | null = null;

  private changeListeners = new Set<FlagChangeListener>();
  private exposureListeners = new Set<ExposureListener>();

  constructor(options: FeatureOSClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || 'http://localhost:4000').replace(/\/$/, '');
    this.context = options.context;
    this.enableExposureTracking = options.enableExposureTracking ?? true;
    this.offlineFallback = options.offlineFallback ?? true;
    this.enableRealtime = options.enableRealtime ?? true;

    if (options.onExposure) {
      this.exposureListeners.add(options.onExposure);
    }

    // Hydrate from localStorage if available (offline-first)
    this.hydrateFromStorage();

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

    // Auto-flush telemetry every 5 seconds
    this.telemetryTimer = setInterval(() => {
      void this.flushTelemetry();
    }, 5000);
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this.fetchFlags()
      .then(() => {
        this.isInitialized = true;
        if (this.enableRealtime) {
          this.connectRealtimeStream();
        }
      })
      .catch((err) => {
        if (!this.offlineFallback) {
          throw err;
        }
        // If offline fallback enabled, proceed with cached flags
        this.isInitialized = true;
        if (this.enableRealtime) {
          this.connectRealtimeStream();
        }
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

  public track(
    eventName: string,
    properties?: Record<string, unknown>,
    numericValue?: number
  ): void {
    this.enqueueTelemetry({
      eventType: TelemetryEventType.CLICK,
      userId: this.context.userId,
      timestamp: new Date().toISOString(),
      numericValue,
      metadata: { eventName, ...properties },
    });
  }

  public trackError(flagKey: string, error: Error | string): void {
    this.enqueueTelemetry({
      eventType: TelemetryEventType.ERROR,
      flagKey,
      userId: this.context.userId,
      timestamp: new Date().toISOString(),
      errorMessage: typeof error === 'string' ? error : error.message,
      stackTrace: typeof error === 'string' ? '' : error.stack,
      metadata: {},
    });
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
    if (this.telemetryTimer) {
      clearInterval(this.telemetryTimer);
      this.telemetryTimer = null;
    }
    if (this.sseReconnectTimeout) {
      clearTimeout(this.sseReconnectTimeout);
      this.sseReconnectTimeout = null;
    }
    if (this.sseSource) {
      this.sseSource.close();
      this.sseSource = null;
    }
    void this.flushTelemetry();
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
      this.applyEvaluations(payload.data.evaluations);
    }
  }

  private applyEvaluations(evaluations: Record<string, EvaluationResult>): void {
    for (const [key, evaluation] of Object.entries(evaluations)) {
      const previous = this.flagsCache.get(key);
      this.flagsCache.set(key, evaluation);

      if (
        !previous ||
        previous.value !== evaluation.value ||
        previous.enabled !== evaluation.enabled ||
        previous.version !== evaluation.version
      ) {
        for (const listener of this.changeListeners) {
          listener(key, evaluation);
        }
      }
    }
    this.persistToStorage();
  }

  private connectRealtimeStream(): void {
    if (typeof EventSource === 'undefined') return;

    try {
      const streamUrl = `${this.baseUrl}/api/v1/stream?apiKey=${encodeURIComponent(this.apiKey)}`;
      this.sseSource = new EventSource(streamUrl);

      this.sseSource.addEventListener('flag_update', (event: MessageEvent) => {
        try {
          const streamEvent = JSON.parse(event.data) as StreamEvent<{ flagKey: string }>;
          // Refetch flags for the current context to recalculate sticky rules and rollouts cleanly
          void this.fetchFlags();
        } catch {
          // Suppress parsing error
        }
      });

      this.sseSource.addEventListener('full_sync', () => {
        void this.fetchFlags();
      });

      this.sseSource.onerror = () => {
        if (this.sseSource) {
          this.sseSource.close();
          this.sseSource = null;
        }
        // Reconnect after 3 seconds
        this.sseReconnectTimeout = setTimeout(() => {
          this.connectRealtimeStream();
        }, 3000);
      };
    } catch {
      // Suppress connection failure, client continues in offline mode
    }
  }

  private hydrateFromStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = window.localStorage.getItem(`featureos_flags_${this.apiKey}`);
        if (cached) {
          const parsed = JSON.parse(cached) as Record<string, EvaluationResult>;
          for (const [k, v] of Object.entries(parsed)) {
            this.flagsCache.set(k, v);
          }
        }
      }
    } catch {
      // Storage unavailable or disabled
    }
  }

  private persistToStorage(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const obj: Record<string, EvaluationResult> = {};
        for (const [k, v] of this.flagsCache.entries()) {
          obj[k] = v;
        }
        window.localStorage.setItem(`featureos_flags_${this.apiKey}`, JSON.stringify(obj));
      }
    } catch {
      // Storage quota exceeded or disabled
    }
  }

  private enqueueTelemetry(event: TelemetryEvent): void {
    this.telemetryQueue.push(event);
    if (this.telemetryQueue.length >= 20) {
      void this.flushTelemetry();
    }
  }

  public async flushTelemetry(): Promise<void> {
    if (this.telemetryQueue.length === 0) return;

    const batch = [...this.telemetryQueue];
    this.telemetryQueue = [];

    try {
      await fetch(`${this.baseUrl}/api/v1/telemetry/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify({
          environmentKey: 'development',
          sentAt: new Date().toISOString(),
          events: batch,
        }),
      });
    } catch {
      // If network fails, re-queue up to 100 events
      if (this.telemetryQueue.length < 100) {
        this.telemetryQueue.unshift(...batch);
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

    // 1. Notify client exposure listeners
    for (const listener of this.exposureListeners) {
      try {
        listener(exposure);
      } catch {
        // Suppress listener errors
      }
    }

    // 2. Queue into ClickHouse / Kafka analytical pipeline
    this.enqueueTelemetry({
      eventType: TelemetryEventType.EXPOSURE,
      flagKey: result.flagKey,
      variantKey: result.variantKey || 'control',
      userId: this.context.userId,
      timestamp: new Date().toISOString(),
      metadata: {
        enabled: result.enabled,
        reason: result.reason,
        version: result.version,
      },
    });
  }
}
