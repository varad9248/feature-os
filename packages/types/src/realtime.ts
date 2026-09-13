import { z } from 'zod';

export const StreamEventType = {
  INITIAL_HANDSHAKE: 'INITIAL_HANDSHAKE',
  FLAG_UPDATE: 'FLAG_UPDATE',
  FLAG_DELETE: 'FLAG_DELETE',
  FULL_SYNC: 'FULL_SYNC',
  HEARTBEAT: 'HEARTBEAT',
} as const;

export type StreamEventType = (typeof StreamEventType)[keyof typeof StreamEventType];

export const StreamEventSchema = z.object({
  eventId: z.string(),
  type: z.nativeEnum(StreamEventType),
  orgId: z.string(),
  projectId: z.string(),
  environmentId: z.string(),
  version: z.number(),
  timestamp: z.number(),
  payload: z.record(z.any()).default({}),
});

export type StreamEvent<T = Record<string, unknown>> = {
  eventId: string;
  type: StreamEventType;
  orgId: string;
  projectId: string;
  environmentId: string;
  version: number;
  timestamp: number;
  payload: T;
};

export interface StreamStats {
  connectedClients: number;
  connectionsByEnvironment: Record<string, number>;
  totalBroadcasts: number;
  uptimeSeconds: number;
}
