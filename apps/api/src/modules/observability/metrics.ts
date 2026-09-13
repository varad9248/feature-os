import client from 'prom-client';

export const flagEvaluationsCounter = new client.Counter({
  name: 'featureos_flag_evaluations_total',
  help: 'Total number of feature flag evaluations handled by the runtime engine',
  labelNames: ['flag_key', 'environment', 'result'],
});

export const httpRequestDurationHistogram = new client.Histogram({
  name: 'featureos_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
});

export const realtimeClientsGauge = new client.Gauge({
  name: 'featureos_realtime_connected_clients',
  help: 'Current active SSE real-time streaming clients connected to edge gateways',
  labelNames: ['environment'],
});

export const circuitBreakerGauge = new client.Gauge({
  name: 'featureos_circuit_breaker_state',
  help: 'Current circuit breaker state (0 = CLOSED, 1 = HALF_OPEN, 2 = OPEN)',
  labelNames: ['flag_key'],
});

export const auditEventsCounter = new client.Counter({
  name: 'featureos_audit_events_total',
  help: 'Total tamper-evident audit events cryptographically hash-chained',
  labelNames: ['action', 'entity_type'],
});
