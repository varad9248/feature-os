import { Router, type Request, type Response } from 'express';
import { TelemetryBatchEnvelopeSchema } from '@feature-os/types';
import { validateRequest } from '../../middleware/validate.middleware';
import { telemetryPipeline } from './kafka.producer';
import { clickhouseService } from './clickhouse';
import { logger } from '../../middleware/logger.middleware';

export const telemetryRouter = Router();

// ----------------------------------------------------
// POST /api/v1/telemetry/events (High-Throughput Ingestion)
// ----------------------------------------------------
telemetryRouter.post(
  '/events',
  validateRequest({ body: TelemetryBatchEnvelopeSchema }),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { environmentKey, events } = req.body;

      // Ingest asynchronously into Kafka + ClickHouse pipeline
      telemetryPipeline.enqueueEvents(environmentKey, events);

      res.status(202).json({
        success: true,
        data: {
          received: events.length,
          status: 'QUEUED',
        },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to ingest telemetry batch');
      res.status(500).json({
        success: false,
        error: { code: 'INGESTION_ERROR', message: 'Failed to process event batch' },
      });
    }
  }
);

// ----------------------------------------------------
// GET /api/v1/telemetry/summary (Analytical Aggregations)
// ----------------------------------------------------
telemetryRouter.get('/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const env = (req.query.env as string) || 'development';
    const summary = await clickhouseService.getSummary(env);

    res.json({
      success: true,
      data: summary,
    });
  } catch (err) {
    logger.error({ err }, 'Failed to query telemetry summary');
    res.status(500).json({
      success: false,
      error: { code: 'ANALYTICS_QUERY_ERROR', message: 'Failed to query analytical summary' },
    });
  }
});

// ----------------------------------------------------
// GET /api/v1/telemetry/timeseries (Timeseries Rollup)
// ----------------------------------------------------
telemetryRouter.get('/timeseries', async (req: Request, res: Response): Promise<void> => {
  try {
    const env = (req.query.env as string) || 'development';
    const timeseries = await clickhouseService.getTimeseries(env);

    res.json({
      success: true,
      data: {
        environment: env,
        series: timeseries,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to query telemetry timeseries');
    res.status(500).json({
      success: false,
      error: { code: 'ANALYTICS_QUERY_ERROR', message: 'Failed to query timeseries' },
    });
  }
});
