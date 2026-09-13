# FeatureOS — Development Workflow & Phase Gating Protocol

> **Engineering Principle**: Strict Phase-Wise Progression. A phase cannot be marked complete, nor can subsequent phases begin, until all tasks in that phase pass their respective Definition of Done (DoD) and verification gates.

---

## 1. Phase-Wise Execution Protocol

To ensure a production-grade system without regressions:

```
┌───────────────────────────────────────────────────────────┐
│ 1. Phase Initialization                                   │
│    - Review phase objectives in MASTER_ROADMAP_TRACKER.md │
│    - Identify corresponding modules in FEATURE_MODULE_MATRIX.md│
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│ 2. Implementation by Feature Module Boundary              │
│    - Write data contracts & schemas first (packages/types)│
│    - Implement database models & migrations (packages/db) │
│    - Build service logic with unit & integration tests     │
│    - Connect frontend views / SDK hooks                  │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│ 3. Automated Verification Gate                            │
│    - Linting & type checking across monorepo              │
│    - Unit and integration test pass                       │
│    - Docker container health check verification          │
└─────────────────────────────┬─────────────────────────────┘
                              ▼
┌───────────────────────────────────────────────────────────┐
│ 4. Phase Sign-off & Status Update                         │
│    - Mark checkboxes in MASTER_ROADMAP_TRACKER.md         │
│    - Update phase completion percentage                   │
│    - Transition next phase from "Pending" to "In Progress"│
└───────────────────────────────────────────────────────────┘
```

---

## 2. Definition of Done (DoD) Checklist

Every phase must satisfy the following criteria before advancing:

1. **Architecture Compliance**:
   - Adheres strictly to the architectural patterns defined in [`PROJECT_ARCHITECTURE.md`](file:///c:/Users/sairam/Desktop/feature-os/docs/PROJECT_ARCHITECTURE.md).
   - No direct coupling between `apps/*` (only via `packages/*` or HTTP/SSE/Kafka protocols).
2. **Type Safety & Contracts**:
   - Zero TypeScript compilation errors (`pnpm typecheck` or `tsc --noEmit`).
   - Zero `any` types in public API interfaces; all I/O validated using Zod / Pydantic.
3. **Automated Testing**:
   - Critical path business logic covered by unit tests (e.g. sticky bucketing, rule evaluation, circuit breakers).
   - Integration tests verify API endpoints and database operations.
4. **Environment & Container Parity**:
   - Services run smoothly inside Docker Compose.
   - All required environment variables documented in `.env.example` templates.
5. **Documentation & Tracking**:
   - Relevant sub-tasks checked off in [`MASTER_ROADMAP_TRACKER.md`](file:///c:/Users/sairam/Desktop/feature-os/docs/MASTER_ROADMAP_TRACKER.md).
   - Any new endpoints, schemas, or events documented in [`FEATURE_MODULE_MATRIX.md`](file:///c:/Users/sairam/Desktop/feature-os/docs/FEATURE_MODULE_MATRIX.md).

---

## 3. Git Workflow & Conventional Commits

We enforce Conventional Commits to maintain a clean changelog:

### Commit Format
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Supported Types
- `feat`: A new feature for a phase or module
- `fix`: A bug fix
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or correcting tests
- `docs`: Documentation changes
- `chore`: Build tasks, package configs, dependency updates
- `infra`: Docker Compose, Kafka, Kubernetes, or CI/CD adjustments

### Scopes
Use the module or application name:
- `(auth)`
- `(flags)`
- `(sse)`
- `(telemetry)`
- `(ai-service)`
- `(sdk)`
- `(dashboard)`
- `(infra)`
- `(db)`

*Example*: `feat(flags): implement deterministic murmurhash sticky bucketing algorithm`

---

## 4. Feature Module Boundary Rules

To avoid technical debt and architectural erosion:

1. **Domain Isolation**:
   - Logic belonging to Feature Flags must not directly mutate User tables. It must interact through the Auth/Tenancy module.
2. **Package Hygiene**:
   - `packages/types` must never import from `apps/*`.
   - `packages/db` must never import UI libraries or Express code.
3. **Asynchronous Decoupling**:
   - Heavy analytical tasks and AI inference must never block the REST evaluation critical path. Always dispatch to Kafka or execute asynchronously.

---

## 5. Ready for Phase 01

The tracking and governance foundation is fully active. The next step is executing **Phase 01 — Platform Foundation & Repository Architecture**.
