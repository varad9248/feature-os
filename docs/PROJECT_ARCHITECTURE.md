# FeatureOS — Technical Architecture & System Design

> **Document Type**: Core Architecture Specification  
> **Version**: 1.0.0  
> **Target Audience**: Platform Engineers, Backend Developers, Distributed Systems Architects

---

## 1. Executive System Topology

FeatureOS is structured as an AI-native distributed platform combining low-latency flag evaluation with an asynchronous analytical streaming pipeline and an autonomous multi-agent reasoning runtime.

```mermaid
flowchart TB
    subgraph ClientLayer["Client Layer & Applications"]
        SPA["Next.js Web Dashboard<br/>(Port 3000)"]
        ReactApp["External React Client<br/>(React SDK)"]
        NodeSvc["Backend Microservice<br/>(Node.js SDK)"]
    end

    subgraph EdgeGateway["API & Distribution Gateway (apps/api - Port 4000)"]
        ExpressRouter["Express.js REST API<br/>(/api/v1)"]
        GraphQLServer["Apollo GraphQL Server<br/>(/graphql)"]
        SSEDistributor["SSE Streaming Hub<br/>(/api/v1/stream)"]
        IngestionGateway["Telemetry Ingestion Gateway<br/>(/api/v1/telemetry)"]
        EvalEngine["Deterministic Flag Evaluator<br/>(In-Memory MurmurHash3)"]
    end

    subgraph MessagingLayer["Streaming & Messaging Layer"]
        RedisPubSub["Redis 7 (Port 6379)<br/>Pub/Sub Channels & Cache"]
        KafkaBus["Apache Kafka (Port 9092)<br/>Partitioned Telemetry Topics"]
    end

    subgraph AnalyticalAndAI["Analytical & AI Autonomous Layer"]
        ClickHouse["ClickHouse OLAP (Port 8123)<br/>Columnar Telemetry Warehouse"]
        FastAPISvc["FastAPI AI Engine (apps/ai-service - Port 8000)<br/>- ML Clustering (DBSCAN/KMeans)<br/>- LangGraph Multi-Agent Runtime<br/>- Bayesian Experimentation Engine"]
    end

    subgraph StorageLayer["Persistent Operational Storage"]
        PostgreSQL["PostgreSQL 16 (Port 5432)<br/>- Relational Multi-Tenant Data<br/>- Prisma ORM<br/>- pgvector Incident Embeddings"]
    end

    %% Client communication
    SPA -->|GraphQL & REST| ExpressRouter
    SPA -->|Live Activity| SSEDistributor
    ReactApp -->|Fetch / Stream Flags| SSEDistributor
    ReactApp -->|Emit Exposures/Clicks| IngestionGateway
    NodeSvc -->|Batch Evaluation| EvalEngine

    %% Gateway to stores
    ExpressRouter --> PostgreSQL
    GraphQLServer --> PostgreSQL
    EvalEngine -.->|Cache-Aside| RedisPubSub
    SSEDistributor <-->|Subscribes| RedisPubSub
    IngestionGateway -->|Produces Events| KafkaBus

    %% Kafka Consumers
    KafkaBus -->|Batch Ingestion Workers| ClickHouse
    KafkaBus -->|Anomaly Stream| FastAPISvc

    %% AI Integrations
    FastAPISvc -->|Analytical Queries| ClickHouse
    FastAPISvc -->|Read/Write Incidents & Memory| PostgreSQL
    FastAPISvc -->|Post Recommendations| ExpressRouter
```

---

## 2. Core Subsystems & Data Flows

### 2.1 Low-Latency Flag Evaluation & Real-Time Sync (Sub-10ms)
Feature flags must be evaluated in under 10ms with zero network hops whenever evaluated in-process via SDKs, or sub-15ms via edge REST evaluation.

```mermaid
sequenceDiagram
    autonumber
    actor User as Client User
    participant SDK as FeatureOS React/Node SDK
    participant API as Express API Server
    participant Redis as Redis Pub/Sub
    participant PG as PostgreSQL DB

    Note over SDK: In-Memory Cache Initialized
    User->>SDK: evaluate("checkout-v2", context)
    SDK->>SDK: Deterministic Sticky Bucketing (MurmurHash3)
    SDK-->>User: Returns Variant { enabled: true, color: "blue" }
    SDK-)API: Async POST /api/v1/telemetry (Exposure Event)

    Note over API: Admin updates Flag Rule in Dashboard
    API->>PG: Commit Flag Changes
    API->>Redis: PUBLISH env:prod:flags { flagKey, delta, version }
    Redis->>API: Broadcast to active SSE workers
    API->>SDK: SSE Push: "flag_update" event
    SDK->>SDK: Hot-swap In-Memory Cache (No restart required)
```

### 2.2 Telemetry & Event Ingestion Pipeline
All evaluations, interactions, errors, and performance markers flow through an asynchronous backpressure-protected pipeline.

```mermaid
flowchart LR
    subgraph Emission["Client Emission"]
        A1["Exposure Event"]
        A2["Click / Conversion"]
        A3["Latency Marker"]
        A4["Error / Crash"]
    end

    subgraph Ingestion["Ingestion Gateway"]
        B["POST /api/v1/telemetry/events<br/>(Batching & Validation)"]
    end

    subgraph Kafka["Apache Kafka Topics"]
        K1["featureos.telemetry.exposures"]
        K2["featureos.telemetry.clicks"]
        K3["featureos.telemetry.errors"]
        K4["featureos.telemetry.latency"]
    end

    subgraph Consumers["Event Consumers"]
        C1["ClickHouse Batch Sink Worker"]
        C2["Realtime Anomaly Detector"]
    end

    subgraph Destinations["Storage & Alerting"]
        D1["ClickHouse MergeTree Tables"]
        D2["FastAPI Anomaly Buffer"]
    end

    Emission --> Ingestion
    Ingestion --> Kafka
    K1 & K2 --> C1 --> D1
    K3 & K4 --> C1 --> D1
    K3 & K4 --> C2 --> D2
```

### 2.3 Autonomous Multi-Agent AI Runtime (LangGraph)
A multi-agent state graph continuously analyzes telemetry and coordinates decisions with human approval.

```mermaid
stateDiagram-v2
    [*] --> IngestionState: Anomaly Detected / Scheduled Trigger
    
    state IngestionState {
        TelemetryAgent: Queries ClickHouse for metric anomalies
    }

    IngestionState --> CohortDiscovery: Anomalous Session Group Identified
    
    state CohortDiscovery {
        CohortAgent: Runs DBSCAN & Isolation Forest clustering
        CohortAgent: Extracts boundary rules (e.g. Safari 17.2 + iOS)
    }

    CohortDiscovery --> MemoryRecall: Query Past Incidents
    
    state MemoryRecall {
        MemoryAgent: Searches pgvector embeddings for similar failures
    }

    MemoryRecall --> StrategyFormulation: Generate Action Plan
    
    state StrategyFormulation {
        RolloutAgent: Formulates exclusion rule or rollback recommendation
        PolicyAgent: Validates safety limits & SLA governance
    }

    StrategyFormulation --> HumanApproval: Dispatch to AI Inbox

    state HumanApproval {
        PendingState: Awaiting Engineering Lead Action
        ApprovedState: Action Authorized
        RejectedState: Feedback Logged to Vector Memory
    }

    HumanApproval --> Execution: Approved
    HumanApproval --> [*]: Rejected

    state Execution {
        ApplyRule: Updates PostgreSQL Flag Rule
        Broadcast: Triggers Redis SSE sync to all clients
    }

    Execution --> [*]
```

### 2.4 Self-Healing Circuit Breaker State Machine
FeatureOS guards against production incidents by automatically detecting degraded flags and degrading gracefully.

```mermaid
stateDiagram-v2
    [*] --> CLOSED: Normal Operation

    CLOSED --> OPEN: Failure rate > threshold (e.g. > 2% errors or p95 > 1500ms)
    
    state OPEN {
        [*] --> DisableFeature: Instantly disable flag or route to fallback variant
        DisableFeature --> AlertEngine: Notify dashboard & SRE channel
        AlertEngine --> CooldownTimer: Start 60s cooldown
    }

    OPEN --> HALF_OPEN: Cooldown expired
    
    state HALF_OPEN {
        TestCanary: Route 1% probe traffic to new variant
        EvaluateHealth: Monitor canary error rate
    }

    HALF_OPEN --> CLOSED: Probe healthy (0 errors in test window)
    HALF_OPEN --> OPEN: Probe failed (Errors re-occur)
```

---

## 3. Monorepo Structure & Package Dependencies

FeatureOS is governed by strict boundaries across apps and packages:

```
feature-os/
├── apps/
│   ├── web/                    # Next.js 15 (Dashboard UI)
│   │   ├── app/                # App Router: (auth), (dashboard), api/
│   │   ├── components/         # shadcn/ui components & feature widgets
│   │   ├── lib/                # Apollo client, TanStack query, Zustand stores
│   │   └── styles/             # Tailwind CSS v4 definitions
│   │
│   ├── api/                    # Express.js Core Backend
│   │   ├── src/
│   │   │   ├── modules/        # Feature Modules: auth, flags, rollouts, telemetry...
│   │   │   ├── graphql/        # Apollo schemas, resolvers, and context
│   │   │   ├── sse/            # Server-Sent Events hub & Redis subscriber
│   │   │   ├── kafka/          # Kafka producers & consumer workers
│   │   │   └── middleware/     # Auth, RBAC, Zod validation, error handler
│   │   └── server.ts           # HTTP & WebSocket initialization
│   │
│   └── ai-service/             # FastAPI AI Engine
│       ├── app/
│       │   ├── agents/         # LangGraph agents: Telemetry, Cohort, Rollout, Policy
│       │   ├── ml/             # scikit-learn clustering & anomaly detection
│       │   ├── bayesian/       # Bayesian A/B statistical testing models
│       │   ├── memory/         # pgvector embeddings & vector search
│       │   └── api/v1/         # FastAPI endpoints (/clustering, /recommendations)
│       └── main.py
│
├── packages/
│   ├── types/                  # Shared TypeScript interfaces & Zod schemas
│   ├── sdk-js/                 # Client SDK: Vanilla JS, React hooks, Node client
│   ├── db/                     # Prisma schema, migrations, seeders
│   └── config/                 # Shared tsconfig, ESLint, Prettier, Env schemas
│
└── docker/                     # Docker Compose local development definitions
```

### Dependency Flow Rules
1. `apps/*` may depend on `packages/*`.
2. `apps/*` must **never** import directly from another `app` (isolated processes communicating strictly via HTTP/GraphQL/SSE/Kafka).
3. `packages/types` must remain pure TypeScript with zero runtime side-effects (only type definitions, enums, and Zod schemas).
4. `packages/db` encapsulates all Prisma client logic and schema migrations.

---

## 4. Multi-Tenant Data Model & Storage Schema

### 4.1 PostgreSQL (Operational Relational Store + pgvector)
Managed via Prisma ORM (`packages/db/prisma/schema.prisma`):

```mermaid
erDiagram
    ORGANIZATION ||--o{ PROJECT : owns
    ORGANIZATION ||--o{ MEMBER : has
    USER ||--o{ MEMBER : participates
    PROJECT ||--o{ ENVIRONMENT : contains
    PROJECT ||--o{ FEATURE_FLAG : defines
    FEATURE_FLAG ||--o{ TARGETING_RULE : contains
    FEATURE_FLAG ||--o{ ROLLOUT_STRATEGY : controls
    FEATURE_FLAG ||--o{ EXPERIMENT : runs
    ORGANIZATION ||--o{ AUDIT_LOG : tracks
    ORGANIZATION ||--o{ INCIDENT_MEMORY : records

    ORGANIZATION {
        string id PK
        string name
        string slug UK
        datetime createdAt
    }

    PROJECT {
        string id PK
        string organizationId FK
        string name
        string key UK
    }

    ENVIRONMENT {
        string id PK
        string projectId FK
        string name
        string key
        string clientApiKey UK
        string serverApiKey UK
    }

    FEATURE_FLAG {
        string id PK
        string projectId FK
        string key
        string name
        string type
        boolean isArchived
    }

    INCIDENT_MEMORY {
        string id PK
        string organizationId FK
        string flagKey
        string rootCauseSummary
        vector embedding_1536
        json metadata
        datetime createdAt
    }
```

### 4.2 ClickHouse (Analytical Columnar Store)
High-performance analytical tables configured with MergeTree engines:

```sql
-- 1. Exposures Table (tracks every flag evaluation)
CREATE TABLE IF NOT EXISTS exposures (
    timestamp DateTime64(3, 'UTC'),
    organization_id UUID,
    project_id UUID,
    environment_id UUID,
    flag_key LowCardinality(String),
    variant_key LowCardinality(String),
    user_id String,
    device LowCardinality(String),
    browser LowCardinality(String),
    country LowCardinality(String),
    app_version String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (organization_id, project_id, flag_key, timestamp);

-- 2. Telemetry Events (interactions & business metrics)
CREATE TABLE IF NOT EXISTS telemetry_events (
    timestamp DateTime64(3, 'UTC'),
    organization_id UUID,
    project_id UUID,
    environment_id UUID,
    user_id String,
    event_name LowCardinality(String),
    numeric_value Float64,
    properties String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (organization_id, event_name, timestamp);

-- 3. Telemetry Errors & Performance
CREATE TABLE IF NOT EXISTS telemetry_errors (
    timestamp DateTime64(3, 'UTC'),
    organization_id UUID,
    flag_key LowCardinality(String),
    user_id String,
    error_message String,
    stack_trace String,
    duration_ms Float32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (organization_id, flag_key, timestamp);
```

---

## 5. Security & Isolation Architecture

- **Tenant Isolation**: Every database query is tenant-scoped by `organizationId`. Cross-tenant data leakage is strictly prohibited via Prisma middleware filters and row-level checks.
- **RBAC Matrix**: Enforced at the gateway layer through hierarchical permissions:
  - `Owner`: Full administrative, billing, and organizational authority.
  - `Admin`: User management, project settings, flag approvals.
  - `Developer`: Create and edit flags, configure targeting rules, trigger rollouts in non-prod.
  - `Product Manager`: Manage experiments, configure non-destructive targeting rules.
  - `SRE`: Circuit breaker overrides, emergency rollbacks, health thresholds.
  - `Viewer`: Read-only access to flags, metrics, and audit logs.
- **API Key Scoping**: Environment keys distinguish between `Client SDK Keys` (restricted to evaluating flags for that environment with no administrative power) and `Server API Keys` (privileged access).
- **Audit Tamper-Evidence**: Audit log entries are strictly append-only and cryptographically hashed with event sourcing guarantees.
