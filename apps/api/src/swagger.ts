export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'FeatureOS Core Gateway API',
    version: '1.0.0',
    description: 'Enterprise REST & GraphQL API for Feature Management, Realtime Evaluation, and Telemetry Ingestion',
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Local Development Server',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'System & Services Health Check',
        tags: ['System'],
        responses: {
          '200': {
            description: 'All system dependencies are healthy',
          },
        },
      },
    },
    '/api/v1/flags': {
      get: {
        summary: 'List Feature Flags',
        tags: ['Feature Flags'],
        responses: {
          '200': {
            description: 'List of configured flags',
          },
        },
      },
    },
    '/api/v1/evaluate': {
      post: {
        summary: 'Deterministic Flag Evaluation Endpoint',
        tags: ['Evaluation'],
        responses: {
          '200': {
            description: 'Evaluated flag variant',
          },
        },
      },
    },
    '/api/v1/stream': {
      get: {
        summary: 'Server-Sent Events (SSE) Realtime Updates Stream',
        tags: ['Realtime Distribution'],
        responses: {
          '200': {
            description: 'Active event stream',
          },
        },
      },
    },
  },
};
