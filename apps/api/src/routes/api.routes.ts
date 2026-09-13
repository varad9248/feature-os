import { Router, Request, Response } from 'express';
import { authRouter } from '../modules/auth/auth.routes';
import { tenancyRouter } from '../modules/tenancy/tenancy.routes';

export const apiV1Router: Router = Router();

apiV1Router.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'FeatureOS Core API Gateway',
    version: 'v1',
    status: 'operational',
    endpoints: {
      auth: '/api/v1/auth',
      tenancy: '/api/v1/orgs',
      flags: '/api/v1/flags',
      evaluate: '/api/v1/evaluate',
      stream: '/api/v1/stream',
      telemetry: '/api/v1/telemetry',
    },
  });
});

// Mount module routers
apiV1Router.use('/auth', authRouter);
apiV1Router.use('/', tenancyRouter);
