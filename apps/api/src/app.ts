import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import client from 'prom-client';
import { env } from '@feature-os/config';
import { httpLogger } from './middleware/logger.middleware';
import { errorHandler } from './middleware/error.middleware';
import { healthRouter } from './routes/health.routes';
import { apiV1Router } from './routes/api.routes';
import { swaggerDocument } from './swagger';
import { setupGraphQL } from './graphql';

export async function createApp(): Promise<Application> {
  const app = express();

  // Prometheus Metrics Collection
  const collectDefaultMetrics = client.collectDefaultMetrics;
  collectDefaultMetrics({ prefix: 'featureos_api_' });

  app.get('/metrics', async (req, res) => {
    res.set('Content-Type', client.register.contentType);
    res.end(await client.register.metrics());
  });

  // Security & HTTP Middleware
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: env.CORS_ORIGINS.split(','),
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(httpLogger);

  // System & Health Endpoints
  app.use(healthRouter);

  // Swagger Documentation
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

  // REST API v1
  app.use('/api/v1', apiV1Router);

  // Apollo GraphQL integration
  await setupGraphQL(app);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
