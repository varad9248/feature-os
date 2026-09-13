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
      logger.info('Redis Pub Client connected');
      this.isConnected = true;
    });

    this.pubClient.on('error', (err) => {
      logger.error({ err }, 'Redis Pub Client error');
    });

    this.subClient.on('connect', () => {
      logger.info('Redis Sub Client connected');
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

  public async subscribe(
    orgId: string,
    envId: string,
    listener: (event: StreamEvent) => void
  ): Promise<() => Promise<void>> {
    const channel = this.getChannel(orgId, envId);

    if (!this.channelSubscriptions.has(channel)) {
      this.channelSubscriptions.set(channel, new Set());
      await this.subClient.subscribe(channel);
      logger.info({ channel }, 'Subscribed to Redis channel');
    }

    const listeners = this.channelSubscriptions.get(channel)!;
    listeners.add(listener);

    return async () => {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.channelSubscriptions.delete(channel);
        await this.subClient.unsubscribe(channel);
        logger.info({ channel }, 'Unsubscribed from Redis channel');
      }
    };
  }

  public async shutdown(): Promise<void> {
    await this.pubClient.quit();
    await this.subClient.quit();
  }
}

export const redisPubSub = new RedisPubSubManager();
