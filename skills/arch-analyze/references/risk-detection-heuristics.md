# Risk Detection Heuristics

> Risk depth identifies architecture risk and technical debt from evidence. It does not invent generic risks.

## Required Risk Fields

Every risk must include:

- `severity`
- `affected_scope`
- `mitigation`
- `evidence_refs`

Missing any field means the risk is rejected.

## Severity Rubric

| Severity | Meaning |
|---|---|
| critical | likely outage, data loss, security/compliance violation, or blocked delivery |
| high | significant reliability, rollback, coupling, or operability risk |
| medium | important but manageable with known mitigation |
| low | localized risk or cleanup item |
| info | observation, not a risk |

## Heuristic Categories

### Coupling

Signals:

- Direct database access across service boundaries.
- Circular imports or deployment dependencies.
- Shared mutable library used by many services.
- Business rules duplicated across services.

Evidence:

- import graph
- config references
- dependency edges
- database connection strings

### Reliability

Signals:

- Critical flow has no retry/idempotency clues.
- Single external dependency in request path without fallback.
- No timeout/circuit-breaker config in integration-heavy services.
- Manual-only recovery process.

Evidence:

- dependency map
- config files
- README/runbook references
- code references for retry/timeouts

### Data

Signals:

- Dual writes without reconciliation.
- Schema changes without backfill plan.
- Data ownership unclear.
- Event schema lacks versioning.

Evidence:

- migrations
- model definitions
- event contracts
- data access paths

### Operability

Signals:

- No observable health endpoints.
- No logs/metrics/traces around critical flow.
- Deployment scripts exist but no rollback notes.
- Alerts absent for critical dependencies.

Evidence:

- monitoring config
- deployment docs
- logging/tracing setup
- runbooks

### Maintainability

Signals:

- Very large modules with high churn.
- Cross-layer imports.
- Tests missing for high-churn critical modules.
- Hidden generated or vendored code mixed with source.

Evidence:

- LOC stats
- git churn
- test directory mapping
- import matrix

### Security and Compliance

Signals:

- Auth bypass paths.
- Sensitive data logged or exported.
- Public endpoint calls internal privileged operation.
- Org compliance redline match.

Evidence:

- auth middleware paths
- config
- routes
- KB redlines

## Technical Debt vs Risk

Risk asks: "What can hurt the system or decision?"

Technical debt asks: "What makes future change slower or more fragile?"

The same evidence may create both, but keep entries separate when mitigation differs.

## Anti-Generic Rule

Reject risks that could apply to any codebase:

- "系统可能缺少监控。"
- "需要注意性能。"
- "代码可能耦合。"

Accept only evidence-backed risks:

- "checkout-service calls inventory database directly from `src/inventoryClient.ts`, bypassing inventory API; this creates data ownership and rollback risk."

## Sorting

Sort by:

1. severity
2. critical-flow involvement
3. dependency hub involvement
4. recent churn

## Mitigation Quality

Good mitigation:

- specific owner or owning team;
- concrete architecture action;
- preserves rollout/rollback concerns;
- can be referenced by audit roadmap.

Bad mitigation:

- "refactor later";
- "add tests";
- "improve monitoring";
- "discuss with team".

Make it actionable:

- "Move cross-service read behind inventory API; add compatibility endpoint first; deprecate direct DB credential after two releases."
