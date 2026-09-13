import { z } from 'zod';

export enum TelemetryEventType {
  EXPOSURE = 'EXPOSURE',
  CLICK = 'CLICK',
  CONVERSION = 'CONVERSION',
  ERROR = 'ERROR',
  LATENCY = 'LATENCY',
}

export const TelemetryEventSchema = z.object({
  eventId: z.string().uuid().optional(),
  timestamp: z.string().datetime().or(z.number()),
  eventType: z.nativeEnum(TelemetryEventType),
  flagKey: z.string().optional(),
  variantKey: z.string().optional(),
  userId: z.string(),
  numericValue: z.number().optional(),
  durationMs: z.number().optional(),
  errorMessage: z.string().optional(),
  stackTrace: z.string().optional(),
  metadata: z.record(z.any()).optional().default({}),
});

export type TelemetryEvent = z.infer<typeof TelemetryEventSchema>;

export const TelemetryBatchEnvelopeSchema = z.object({
  environmentKey: z.string(),
  sentAt: z.string().datetime().or(z.number()),
  events: z.array(TelemetryEventSchema),
});

export type TelemetryBatchEnvelope = z.infer<typeof TelemetryBatchEnvelopeSchema>;
