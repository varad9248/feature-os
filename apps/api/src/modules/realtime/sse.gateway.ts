import type { Response } from 'express';
import crypto from 'crypto';
import type { StreamEvent, StreamStats } from '@feature-os/types';
import { redisPubSub } from './redis-pubsub';
import { logger } from '../../middleware/logger.middleware';

interface ConnectedClient {
  id: string;
  res: Response;
  orgId: string;
  projectId: string;
  environmentId: string;
  connectedAt: number;
}

export class SSEGateway {
  private clients = new Map<string, ConnectedClient>();
  private environmentUnsubscribers = new Map<string, () => Promise<void>>();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private totalBroadcasts = 0;
  private startTime = Date.now();

  constructor() {
    this.startHeartbeat();
  }

  private startHeartbeat(): void {
    // Send SSE comment/heartbeat every 15 seconds
    this.heartbeatInterval = setInterval(() => {
      this.broadcastHeartbeat();
    }, 15000);
  }

  private broadcastHeartbeat(): void {
    const heartbeatData = `:heartbeat ${Date.now()}\n\n`;
    for (const client of this.clients.values()) {
      try {
        client.res.write(heartbeatData);
      } catch {
        this.removeClient(client.id);
      }
    }
  }

  public async registerClient(
    res: Response,
    orgId: string,
    projectId: string,
    environmentId: string,
    lastEventId?: string
  ): Promise<string> {
    const clientId = crypto.randomUUID();

    const client: ConnectedClient = {
      id: clientId,
      res,
      orgId,
      projectId,
      environmentId,
      connectedAt: Date.now(),
    };

    this.clients.set(clientId, client);
    logger.info(
      { clientId, environmentId, totalClients: this.clients.size },
      'SSE client connected'
    );

    // Subscribe this environment to Redis pub/sub if not already subscribed
    const envKey = `${orgId}:${environmentId}`;
    if (!this.environmentUnsubscribers.has(envKey)) {
      const unsub = await redisPubSub.subscribe(orgId, environmentId, (event) => {
        this.broadcastToEnvironment(orgId, environmentId, event);
      });
      this.environmentUnsubscribers.set(envKey, unsub);
    }

    // Send initial handshake
    const handshakeEvent: StreamEvent = {
      eventId: crypto.randomUUID(),
      type: 'INITIAL_HANDSHAKE',
      orgId,
      projectId,
      environmentId,
      version: Date.now(),
      timestamp: Date.now(),
      payload: {
        clientId,
        status: 'CONNECTED',
        heartbeatIntervalMs: 15000,
        reconnectEventId: lastEventId,
      },
    };

    this.sendEventToClient(client, handshakeEvent);

    return clientId;
  }

  public removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    this.clients.delete(clientId);
    logger.info(
      { clientId, environmentId: client.environmentId, remainingClients: this.clients.size },
      'SSE client disconnected'
    );

    // Check if any other clients remain in this environment
    const envKey = `${client.orgId}:${client.environmentId}`;
    const anyRemaining = Array.from(this.clients.values()).some(
      (c) => c.orgId === client.orgId && c.environmentId === client.environmentId
    );

    if (!anyRemaining && this.environmentUnsubscribers.has(envKey)) {
      const unsub = this.environmentUnsubscribers.get(envKey)!;
      void unsub();
      this.environmentUnsubscribers.delete(envKey);
    }
  }

  public broadcastToEnvironment(orgId: string, environmentId: string, event: StreamEvent): void {
    this.totalBroadcasts++;
    for (const client of this.clients.values()) {
      if (client.orgId === orgId && client.environmentId === environmentId) {
        this.sendEventToClient(client, event);
      }
    }
  }

  private sendEventToClient(client: ConnectedClient, event: StreamEvent): void {
    try {
      const eventType = event.type.toLowerCase();
      const message = `id: ${event.eventId}\nevent: ${eventType}\ndata: ${JSON.stringify(event)}\n\n`;
      client.res.write(message);
    } catch {
      this.removeClient(client.id);
    }
  }

  public getStats(): StreamStats {
    const connectionsByEnvironment: Record<string, number> = {};
    for (const client of this.clients.values()) {
      connectionsByEnvironment[client.environmentId] =
        (connectionsByEnvironment[client.environmentId] || 0) + 1;
    }

    return {
      connectedClients: this.clients.size,
      connectionsByEnvironment,
      totalBroadcasts: this.totalBroadcasts,
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
    };
  }

  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    for (const client of this.clients.values()) {
      try {
        client.res.end();
      } catch {
        // Suppress error on shutdown
      }
    }

    this.clients.clear();
  }
}

export const sseGateway = new SSEGateway();
