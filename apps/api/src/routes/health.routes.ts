import { Router, Request, Response } from 'express';
import prisma from '@feature-os/db';
import Redis from 'ioredis';
import { env } from '@feature-os/config';

export const healthRouter: Router = Router();

healthRouter.get('/health', async (req: Request, res: Response) => {
  const health: Record<string, any> = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    status: 'ok',
    services: {
      api: 'healthy',
      postgres: 'checking',
      redis: 'checking',
    },
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    health.services.postgres = 'connected';
  } catch (error: any) {
    health.status = 'degraded';
    health.services.postgres = `error: ${error.message}`;
  }

  try {
    const redis = new Redis(env.REDIS_URL, { connectTimeout: 1000, maxRetriesPerRequest: 1 });
    await redis.ping();
    await redis.quit();
    health.services.redis = 'connected';
  } catch (error: any) {
    health.status = 'degraded';
    health.services.redis = `error: ${error.message}`;
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});
