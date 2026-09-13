import Redis from 'ioredis';
import type { StreamEvent } from '@feature-os/types';
import { logger } from '../../middleware/logger.middleware';

export class RedisPubSubManager {
  private pubClient: Redis;
  private subClient: Redis;
  private isConnected = false;
  private channelSubscriptions = new Map<string, Set<(event: StreamEvent) => void>>();

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    const redisOptions = {
      maxRetriesPerRequest: null,
      retryStrategy(times: number) {
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
    };

    this.pubClient = new Redis(redisUrl, redisOptions);
    this.subClient = new Redis(redisUrl, redisOptions);

    this.setupListeners();
  }

  private setupListeners(): void {
    this.pubClient.on('connect', () => {
      logger.debug('Redis Pub Client connected');
      this.isConnected = true;
    });

    this.pubClient.on('error', (err) => {
      logger.error({ err }, 'Redis Pub Client error');
    });

    this.subClient.on('connect', () => {
      logger.debug('Redis Sub Client connected');
    });

    this.subClient.on('error', (err) => {
      logger.error({ err }, 'Redis Sub Client error');
    });

    this.subClient.on('message', (channel: string, message: string) => {
      try {
        const event = JSON.parse(message) as StreamEvent;
        const listeners = this.channelSubscriptions.get(channel);
        if (listeners) {
          for (const listener of listeners) {
            listener(event);
          }
        }
      } catch (err) {
        logger.error({ err, channel }, 'Failed to parse Redis pub/sub message');
      }
    });
  }

  public getChannel(orgId: string, envId: string): string {
    return `org:${orgId}:env:${envId}:flags`;
  }

  public async publishStreamEvent(event: StreamEvent): Promise<number> {
    const channel = this.getChannel(event.orgId, event.environmentId);
    const payloadString = JSON.stringify(event);
    return this.pubClient.publish(channel, payloadString);
  }

  private unsubscribeTimers = new Map<string, NodeJS.Timeout>();

  public async subscribe(
    orgId: string,
    envId: string,
    listener: (event: StreamEvent) => void
  ): Promise<() => Promise<void>> {
    const channel = this.getChannel(orgId, envId);

    // Cancel pending unsubscribe if a client reconnected
    if (this.unsubscribeTimers.has(channel)) {
      clearTimeout(this.unsubscribeTimers.get(channel)!);
      this.unsubscribeTimers.delete(channel);
    }

    if (!this.channelSubscriptions.has(channel)) {
      this.channelSubscriptions.set(channel, new Set());
      await this.subClient.subscribe(channel);
      logger.debug({ channel }, 'Subscribed to Redis channel');
    }

    const listeners = this.channelSubscriptions.get(channel)!;
    listeners.add(listener);

    return async () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        // Debounce unsubscription by 10 seconds to prevent rapid connection/disconnection flapping
        if (this.unsubscribeTimers.has(channel)) {
          clearTimeout(this.unsubscribeTimers.get(channel)!);
        }
        const timer = setTimeout(async () => {
          this.unsubscribeTimers.delete(channel);
          const current = this.channelSubscriptions.get(channel);
          if (!current || current.size === 0) {
            this.channelSubscriptions.delete(channel);
            try {
              await this.subClient.unsubscribe(channel);
              logger.debug({ channel }, 'Unsubscribed from Redis channel');
            } catch (err) {
              logger.error({ err, channel }, 'Failed to unsubscribe from Redis channel');
            }
          }
        }, 10000);
        this.unsubscribeTimers.set(channel, timer);
      }
    };
  }

  public async shutdown(): Promise<void> {
    await this.pubClient.quit();
    await this.subClient.quit();
  }
}

export const redisPubSub = new RedisPubSubManager();
