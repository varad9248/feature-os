import { Router, type Request, type Response } from 'express';
import prisma from '@feature-os/db';
import { sseGateway } from './sse.gateway';
import { logger } from '../../middleware/logger.middleware';

export const streamRouter = Router();

// ----------------------------------------------------
// GET /api/v1/stream (SSE Streaming Gateway)
// ----------------------------------------------------
streamRouter.get('/stream', async (req: Request, res: Response): Promise<void> => {
  const apiKey = (req.headers['x-api-key'] as string) || (req.query.apiKey as string);

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'API key is required in x-api-key header or ?apiKey= query parameter',
      },
    });
    return;
  }

  try {
    const envRecord = await prisma.environment.findFirst({
      where: {
        OR: [{ clientApiKey: apiKey }, { serverApiKey: apiKey }],
      },
      include: {
        project: true,
      },
    });

    if (!envRecord) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_API_KEY',
          message: 'Supplied API key is invalid or not found',
        },
      });
      return;
    }

    const orgId = envRecord.project.organizationId;
    const projectId = envRecord.projectId;
    const environmentId = envRecord.id;
    const lastEventId = req.headers['last-event-id'] as string | undefined;

    // Set headers for Server-Sent Events
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    res.flushHeaders?.();

    // Register with SSE gateway
    const clientId = await sseGateway.registerClient(
      res,
      orgId,
      projectId,
      environmentId,
      lastEventId
    );

    // Clean up on client disconnect
    req.on('close', () => {
      sseGateway.removeClient(clientId);
    });
  } catch (err) {
    logger.error({ err }, 'Error establishing SSE stream');
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'Failed to establish event stream' },
      });
    }
  }
});

// ----------------------------------------------------
// GET /api/v1/snapshot (Full Configuration Snapshot)
// ----------------------------------------------------
streamRouter.get('/snapshot', async (req: Request, res: Response): Promise<void> => {
  const apiKey = (req.headers['x-api-key'] as string) || (req.query.apiKey as string);

  if (!apiKey) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'API key is required' },
    });
    return;
  }

  try {
    const envRecord = await prisma.environment.findFirst({
      where: {
        OR: [{ clientApiKey: apiKey }, { serverApiKey: apiKey }],
      },
      include: {
        project: true,
      },
    });

    if (!envRecord) {
      res.status(401).json({
        success: false,
        error: { code: 'INVALID_API_KEY', message: 'Invalid API key' },
      });
      return;
    }

    const flags = await prisma.featureFlag.findMany({
      where: {
        projectId: envRecord.projectId,
        isArchived: false,
      },
      include: {
        envStates: {
          where: { environmentId: envRecord.id },
          include: {
            rules: {
              orderBy: { priority: 'asc' },
            },
          },
        },
      },
    });

    const snapshot: Record<string, unknown> = {};
    for (const flag of flags) {
      const envState = flag.envStates[0];
      snapshot[flag.key] = {
        key: flag.key,
        name: flag.name,
        type: flag.type,
        isEnabled: envState?.isEnabled ?? false,
        defaultValue: envState?.defaultValue ?? false,
        rolloutPercentage: envState?.rolloutPercentage ?? 0,
        rules: envState?.rules ?? [],
      };
    }

    res.json({
      success: true,
      data: {
        environmentId: envRecord.id,
        environmentName: envRecord.name,
        version: Date.now(),
        snapshot,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to fetch snapshot');
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch configuration snapshot' },
    });
  }
});

// ----------------------------------------------------
// GET /api/v1/stream/stats (Observability & Metrics)
// ----------------------------------------------------
streamRouter.get('/stream/stats', (_req: Request, res: Response): void => {
  const stats = sseGateway.getStats();
  res.json({
    success: true,
    data: stats,
  });
});
