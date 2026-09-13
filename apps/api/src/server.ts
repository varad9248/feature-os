import { createApp } from './app';
import { env } from '@feature-os/config';
import { logger } from './middleware/logger.middleware';

async function bootstrap() {
  try {
    const app = await createApp();
    const port = env.PORT || 4000;

    app.listen(port, () => {
      logger.info(`FeatureOS Express API server started on port ${port}`);
      logger.info(`Health check: http://localhost:${port}/health`);
      logger.info(`Swagger docs: http://localhost:${port}/docs`);
      logger.info(`GraphQL: http://localhost:${port}/graphql`);
      logger.info(`Metrics: http://localhost:${port}/metrics`);
    });
  } catch (error) {
    logger.error({ error }, 'Fatal error during server bootstrap');
    process.exit(1);
  }
}

bootstrap();
