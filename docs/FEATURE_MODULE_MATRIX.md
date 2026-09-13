# FeatureOS — Feature Module Matrix & Boundary Specification

> **Governance Principle**: Strictly modular architecture. Each feature module encapsulates its own domain logic, data models, validation schemas, and interfaces. Cross-module communications occur strictly via typed service interfaces or asynchronous events.

---

## 1. Feature Module Catalog

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            FeatureOS Feature Modules                        │
├─────────────────────────┬─────────────────────────┬─────────────────────────┤
│ 1. Identity & Tenancy   │ 2. Feature Flags Engine │ 3. Realtime Distribution│
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 4. Telemetry Pipeline   │ 5. AI Cohort Discovery  │ 6. Multi-Agent Runtime  │
├─────────────────────────┼─────────────────────────┼─────────────────────────┤
│ 7. Progressive Rollouts │ 8. Self-Healing Engine  │ 9. Experimentation (A/B)│
├─────────────────────────┴─────────────────────────┴─────────────────────────┤
│ 10. Observability, Audit Logging & Incident Memory                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Granular Module Specifications

### Module 01: Identity, Multi-Tenancy & RBAC
- **Domain**: User authentication, organizations, project hierarchy, environment segregation, membership, and permission enforcement.
- **Phase**: [Phase 02](file:///c:/Users/sairam/Desktop/feature-os/docs/MASTER_ROADMAP_TRACKER.md#phase-02--authentication-organizations--rbac)
- **Monorepo Locations**:
  - `apps/api/src/modules/auth/`
  - `apps/api/src/modules/tenancy/`
  - `apps/web/app/(auth)/`
  - `apps/web/app/(dashboard)/settings/`
  - `packages/db/prisma/schema.prisma` (`User`, `Organization`, `Project`, `Environment`, `Member`)
  - `packages/types/src/auth.ts`
- **Data Entities**:
  - `User`: id, email, passwordHash, name, avatarUrl, isVerified
  - `Organization`: id, name, slug, plan, createdAt
  - `Project`: id, organizationId, name, key, description
  - `Environment`: id, projectId, name, key, clientApiKey, serverApiKey
  - `Member`: id, organizationId, userId, role (`OWNER` | `ADMIN` | `DEVELOPER` | `PRODUCT_MANAGER` | `SRE` | `VIEWER`)
- **APIs & Endpoints**:
  - `POST /api/v1/auth/register` — User signup
  - `POST /api/v1/auth/login` — Authentication & JWT issue
  - `POST /api/v1/auth/refresh` — Refresh token rotation
  - `GET /api/v1/orgs` — List user organizations
  - `POST /api/v1/orgs/:orgId/projects` — Create project
  - `POST /api/v1/orgs/:orgId/members/invite` — Invite workspace member
  - GraphQL: `query GetWorkspaceOverview`, `mutation SwitchOrganization`
- **Dependencies**: Database (Prisma), Redis (session blacklist).

---

### Module 02: Feature Flag Control Plane & Rule Engine
- **Domain**: Flag metadata, multi-attribute targeting rules, deterministic sticky bucketing, and environment overrides.
- **Phase**: [Phase 03](file:///c:/Users/sairam/Desktop/feature-os/docs/MASTER_ROADMAP_TRACKER.md#phase-03--feature-flag-control-plane)
- **Monorepo Locations**:
  - `apps/api/src/modules/flags/`
  - `apps/web/app/(dashboard)/flags/`
  - `packages/sdk-js/src/evaluator/`
  - `packages/types/src/flag.ts`
- **Data Entities**:
  - `FeatureFlag`: id, projectId, key, name, description, type (`BOOLEAN` | `MULTIVARIATE` | `JSON`), isArchived
  - `FlagEnvironmentState`: id, flagId, environmentId, isEnabled, defaultValue, rolloutPercentage
  - `TargetingRule`: id, flagEnvStateId, priority, attribute, operator, values, variantKey
- **APIs & Endpoints**:
  - `GET /api/v1/flags` — List flags with environment filter
  - `POST /api/v1/flags` — Create flag
  - `PUT /api/v1/flags/:key/rules` — Update targeting rule set
  - `POST /api/v1/evaluate` — SDK evaluation endpoint (sub-10ms)
  - `POST /api/v1/evaluate/all` — Bulk evaluation for user context
  - GraphQL: `query GetFlagDetails($key: String!)`, `mutation UpdateFlagState`
- **Dependencies**: Module 01 (Tenancy validation), Module 03 (Notifies Redis Pub/Sub on state change).

---

### Module 03: Realtime Distribution & Streaming Sync (SSE)
- **Domain**: Instant flag distribution to connected clients via Server-Sent Events, Redis broadcasting, and versioned delta syncs.
- **Phase**: [Phase 04](file:///c:/Users/sairam/Desktop/feature-os/docs/MASTER_ROADMAP_TRACKER.md#phase-04--realtime-distribution-engine)
- **Monorepo Locations**:
  - `apps/api/src/modules/sse/`
  - `packages/sdk-js/src/streaming/`
  - `apps/web/components/flags/LiveActivityFeed.tsx`
- **Data Entities**:
  - Ephemeral Redis Channels: `env:{envId}:flags`
  - `FlagVersion`: Environment monotonic version tracker (`{ envId, version: 1042, updatedAt }`)
- **APIs & Endpoints**:
  - `GET /api/v1/stream` — Authenticated SSE stream for SDKs and dashboard
  - `GET /api/v1/snapshot` — Full environment flag snapshot for sync catch-up
  - `GET /api/v1/stream/stats` — Connected clients counter
- **Dependencies**: Module 02 (Triggers updates), Redis Pub/Sub.

---

### Module 04: Telemetry Ingestion & Analytics Pipeline
- **Domain**: High-throughput Kafka event streaming and ClickHouse analytical warehouse storage for exposures, clicks, conversions, errors, and latencies.
- **Phase**: [Phase 05](file:///c:/Users/sairam/Desktop/feature-os/docs/MASTER_ROADMAP_TRACKER.md#phase-05--telemetry--analytics-pipeline)
- **Monorepo Locations**:
  - `apps/api/src/modules/telemetry/`
  - `apps/api/src/kafka/`
  - `packages/sdk-js/src/telemetry/`
  - `apps/web/app/(dashboard)/analytics/`
  - `docker/clickhouse/`
- **Data Entities (ClickHouse)**:
  - `exposures`: timestamp, org_id, project_id, env_id, flag_key, variant, user_id, device, browser, country
  - `telemetry_events`: timestamp, org_id, user_id, event_name, value, properties
  - `telemetry_errors`: timestamp, org_id, flag_key, user_id, error_message, stack_trace, duration_ms
- **APIs & Endpoints**:
  - `POST /api/v1/telemetry/events` — Batch ingestion gateway from SDKs
  - GraphQL: `query GetFlagAnalytics($flagKey: String!, $range: DateRange!)`
  - Kafka Topics: `featureos.telemetry.*`
- **Dependencies**: Module 02 (Generates evaluation context), Kafka, ClickHouse.

---

### Module 05: AI Cohort Discovery & Anomaly Engine
- **Domain**: Unsupervised machine learning models (DBSCAN, KMeans, Isolation Forest) identifying behavioral clusters and anomalous user segments from telemetry.
- **Phase**: [Phase 06](file:///c:/Users/sairam/Desktop/feature-os/docs/MASTER_ROADMAP_TRACKER.md#phase-06--ai-cohort-discovery-engine)
- **Monorepo Locations**:
  - `apps/ai-service/app/ml/`
  - `apps/ai-service/app/api/v1/cohorts.py`
  - `apps/web/app/(dashboard)/cohorts/`
  - `packages/db/prisma/schema.prisma` (`Cohort`)
- **Data Entities**:
  - `Cohort`: id, organizationId, name, description, ruleFilter (JSON targeting rules), severity, confidenceScore, userCount
- **APIs & Endpoints**:
  - `POST /ai/api/v1/cohorts/discover` — Execute clustering job across recent ClickHouse telemetry
  - `GET /ai/api/v1/cohorts/anomalies` — Stream detected telemetry anomalies
  - GraphQL: `query GetDiscoveredCohorts`, `mutation ConvertCohortToTargetingRule`
- **Dependencies**: Module 04 (Telemetry from ClickHouse), Module 02 (Applies cohort as targeting rule).

---

### Module 06: Autonomous Multi-Agent Runtime (LangGraph)
- **Domain**: Coordinated multi-agent decision loop (Telemetry, Cohort, Rollout, Policy, Memory) with Human-In-The-Loop (HITL) approval.
- **Phase**: [Phase 07](file:///c:/Users/sairam/Desktop/feature-os/docs/MASTER_ROADMAP_TRACKER.md#phase-07--multi-agent-ai-runtime)
- **Monorepo Locations**:
  - `apps/ai-service/app/agents/`
  - `apps/ai-service/app/orchestration/state_graph.py`
  - `apps/web/app/(dashboard)/ai-inbox/`
  - `packages/db/prisma/schema.prisma` (`AISuggestion`)
- **Data Entities**:
  - `AISuggestion`: id, organizationId, flagId, type (`EXCLUSION_RULE` | `ROLLBACK` | `ROLLOUT_STEP`), rationale, confidence, state (`PENDING` | `APPROVED` | `REJECTED` | `EXECUTED`), thoughtTrace (JSON)
- **APIs & Endpoints**:
  - `POST /ai/api/v1/agents/evaluate` — Trigger agent reasoning cycle for a flag
  - `POST /api/v1/ai/suggestions/:id/approve` — Approve and execute recommendation
  - `POST /api/v1/ai/suggestions/:id/reject` — Reject and log human feedback to memory
  - GraphQL: `query GetPendingSuggestions`
- **Dependencies**: Module 04, Module 05, Module 02, Module 10 (Vector memory).

---

### Module 07: Progressive Rollout & Staged Delivery Controller
- **Domain**: Canary, Ring, and Percentage progressive deployments with automated telemetry health gating.
- **Phase**: [Phase 08](file:///c:/Users/sairam/Desktop/feature-os/docs/MASTER_ROADMAP_TRACKER.md#phase-08--progressive-rollout-engine)
- **Monorepo Locations**:
  - `apps/api/src/modules/rollouts/`
  - `apps/web/app/(dashboard)/rollouts/`
  - `packages/db/prisma/schema.prisma` (`RolloutSchedule`, `RolloutStep`)
- **Data Entities**:
  - `RolloutSchedule`: id, flagEnvStateId, strategy (`PERCENTAGE` | `CANARY` | `RING`), status (`RUNNING` | `PAUSED` | `COMPLETED` | `ROLLED_BACK`), currentStep
  - `RolloutStep`: id, scheduleId, stepNumber, percentage, durationMinutes, healthScore
- **APIs & Endpoints**:
  - `POST /api/v1/rollouts` — Start staged rollout
  - `POST /api/v1/rollouts/:id/pause` — Pause progression
  - `POST /api/v1/rollouts/:id/resume` — Resume progression
  - GraphQL: `query GetRolloutProgression($flagKey: String!)`
- **Dependencies**: Module 02 (Updates flag percentages), Module 04 (Telemetry health metrics).

---

### Module 08: Self-Healing & Reliability Engine (Circuit Breakers)
- **Domain**: Circuit breaker pattern (`CLOSED`, `OPEN`, `HALF_OPEN`), DAG feature dependency cascades, and automated fallback rendering.
- **Phase**: [Phase 09](file:///c:/Users/sairam/Desktop/feature-os/docs/MASTER_ROADMAP_TRACKER.md#phase-09--self-healing--graceful-degradation)
- **Monorepo Locations**:
  - `apps/api/src/modules/circuit-breaker/`
  - `packages/sdk-js/src/fallbacks/`
  - `apps/web/app/(dashboard)/incidents/`
  - `packages/db/prisma/schema.prisma` (`CircuitBreaker`, `FeatureDependency`)
- **Data Entities**:
  - `CircuitBreaker`: id, flagId, state (`CLOSED` | `OPEN` | `HALF_OPEN`), failureThreshold, cooldownSeconds, lastTrippedAt
  - `FeatureDependency`: id, parentFlagId, childFlagId, cascadeAction (`DISABLE_CHILD` | `FALLBACK_VARIANT`)
- **APIs & Endpoints**:
  - `POST /api/v1/circuit-breakers/:flagKey/trip` — Emergency trip (manual or automated)
  - `POST /api/v1/circuit-breakers/:flagKey/reset` — Reset to CLOSED
  - `POST /api/v1/chaos/inject` — Chaos simulator trigger
- **Dependencies**: Module 02, Module 03 (Instant SSE broadcast), Module 04 (Error rate triggers).

---

### Module 09: Experimentation & Bayesian Analysis Platform
- **Domain**: A/B and multivariate experimentation, Bayesian statistical posterior calculation, credible intervals, and winner promotion.
- **Phase**: [Phase 10](file:///c:/Users/sairam/Desktop/feature-os/docs/MASTER_ROADMAP_TRACKER.md#phase-10--experimentation-platform)
- **Monorepo Locations**:
  - `apps/api/src/modules/experiments/`
  - `apps/ai-service/app/bayesian/`
  - `apps/web/app/(dashboard)/experiments/`
  - `packages/db/prisma/schema.prisma` (`Experiment`, `ExperimentVariant`)
- **Data Entities**:
  - `Experiment`: id, flagId, hypothesis, primaryMetric, status (`DRAFT` | `RUNNING` | `CONCLUDED`), winnerVariantKey
  - `ExperimentVariant`: id, experimentId, key, weight, sampleSize, conversions, p2bb (Probability to be Best)
- **APIs & Endpoints**:
  - `POST /api/v1/experiments` — Create experiment
  - `GET /ai/api/v1/experiments/:id/stats` — Compute Bayesian posterior distributions
  - `POST /api/v1/experiments/:id/promote` — Promote winning variant to 100%
- **Dependencies**: Module 02 (Variant allocation), Module 04 (ClickHouse conversion metrics).

---

### Module 10: Observability, Audit Logs & AI Incident Memory
- **Domain**: OpenTelemetry distributed tracing, Grafana metrics, immutable event-sourced audit logs, and pgvector-backed semantic memory.
- **Phase**: [Phase 11](file:///c:/Users/sairam/Desktop/feature-os/docs/MASTER_ROADMAP_TRACKER.md#phase-11--observability-audit-logs--ai-memory)
- **Monorepo Locations**:
  - `apps/api/src/modules/audit/`
  - `apps/ai-service/app/memory/`
  - `apps/web/app/(dashboard)/audit/`
  - `docker/prometheus/`
  - `docker/grafana/`
  - `packages/db/prisma/schema.prisma` (`AuditLog`, `IncidentMemory`)
- **Data Entities**:
  - `AuditLog`: id, organizationId, userId, action, entityType, entityId, beforeState (JSON), afterState (JSON), hash
  - `IncidentMemory`: id, organizationId, flagKey, summary, embedding (vector 1536), resolutionDetails, createdAt
- **APIs & Endpoints**:
  - `GET /api/v1/audit/logs` — Search immutable audit trail
  - `POST /ai/api/v1/memory/query` — Semantic similarity search across historical incidents
  - Prometheus metrics: `/metrics` on port 4000 & 8000
- **Dependencies**: Module 01, Module 06 (Supplies agent memory context), PostgreSQL + pgvector.

---

## 3. Cross-Module Communication Contract

| From Module | To Module | Communication Protocol | Payload Contract |
|---|---|---|---|
| **Module 02 (Flags)** | **Module 03 (SSE)** | Redis Pub/Sub (`env:{id}:flags`) | `{ flagKey, version, action, diff }` |
| **Module 03 (SDK)** | **Module 04 (Telemetry)** | HTTP POST Batch (`/api/v1/telemetry`) | `TelemetryBatchEnvelope` |
| **Module 04 (Telemetry)** | **Module 05 (AI ML)** | ClickHouse SQL Aggregation | Session feature matrix |
| **Module 05 (AI ML)** | **Module 06 (Agents)** | Internal In-Process Graph State | Discovered cluster boundaries |
| **Module 06 (Agents)** | **Module 02 (Flags)** | REST / Service Call (after approval) | `TargetingRuleInput` |
| **Module 08 (Circuit)** | **Module 03 (SSE)** | High-Priority Redis Broadcast | `{ flagKey, action: "FORCE_FALLBACK" }` |
| **Module 06 (Agents)** | **Module 10 (Memory)** | pgvector Cosine Search (`<=>`) | Vector embedding query (1536 dim) |
