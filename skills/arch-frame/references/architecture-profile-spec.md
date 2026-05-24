# Architecture Profile Spec

> `architecture_profile` is the routing layer. It tells the workflow which references and optional phases should influence later architecture work.

## Output Shape

```yaml
architecture_profile:
  identified_styles:
    - microservices
    - event-driven
  primary_concerns:
    - reliability
    - data consistency
  recommended_references:
    - arch-library/microservices-patterns/event-driven.md
    - arch-library/nfr-checklists/reliability.md
  recommended_phases:
    - eval-design
  recommended_diagram_style: blueprint
  user_override: null
  confirmed_by_user_at: null
```

`confirmed_by_user_at` is null until workflow presents the profile and the user confirms or edits it.

## Identification Inputs

Use all available non-code context first:

- PRD or user change request.
- Existing project overview.
- Repository names and descriptions if available.
- README snippets if user provided them.
- Org KB constraints.

Do not require a full code scan. `arch-frame` is allowed to use high-level repo context but should not do `arch-analyze`'s job.

## Identified Styles

Recommended vocabulary:

- `modular-monolith`
- `microservices`
- `event-driven`
- `rest-api`
- `graphql-api`
- `batch-processing`
- `data-pipeline`
- `frontend-bff`
- `platform-internal-tool`
- `llm-application`
- `rag`
- `multi-agent`
- `workflow-orchestration`
- `legacy-modernization`
- `multi-region`

Free text is allowed when the system does not fit the list, but keep names stable and concise.

## Primary Concerns

Recommended vocabulary:

- reliability
- latency
- cost
- security
- compliance
- observability
- maintainability
- data consistency
- migration safety
- rollback
- developer experience
- eval quality
- prompt injection
- tool safety
- tenant isolation

Pick the concerns that change architecture choices. Avoid generic lists where every project has everything.

## Reference Selection

Read `arch-library/MANIFEST.md` and choose only references that match style or concern.

Selection rules:

- Microservices decomposition or service boundary work: choose `microservices-patterns/service-decomposition.md`.
- Async messaging, saga, outbox, eventual consistency: choose `microservices-patterns/event-driven.md`.
- Gateway, BFF, API aggregation: choose `microservices-patterns/api-gateway.md`.
- Rollout, canary, blue-green, release safety: choose `devops-patterns/deployment-strategies.md`.
- Logging, metrics, tracing, alerts: choose `devops-patterns/observability.md`.
- Multi-region or failover: choose `devops-patterns/multi-region.md`.
- Legacy replacement: choose `migration-patterns/strangler.md`.
- Implementation switching behind interfaces: choose `migration-patterns/branch-by-abstraction.md`.
- Dual-run migration: choose `migration-patterns/parallel-run.md`.
- Agent orchestration: choose `agent-architecture/agent-patterns.md`.
- RAG retrieval or knowledge base design: choose `agent-architecture/rag-patterns.md`.
- Tool APIs for agents: choose `agent-architecture/tool-design.md`.
- Agent memory: choose `agent-architecture/memory-architecture.md`.
- Prompt injection or AI safety: choose `agent-architecture/guardrails.md`.
- AI quality measurement: choose `agent-architecture/eval-patterns.md`.
- Reliability, security, cost, performance concerns: choose the matching `nfr-checklists/*.md`.

If the manifest lists a file that does not exist yet, do not recommend it until the file is implemented.

## Phase Selection

Read `internal/phases/MANIFEST.md`.

v1.0 supports:

- `eval-design`: insert for LLM applications, RAG, multi-agent systems, prompt/tool workflows, or any design where quality cannot be judged by deterministic unit tests alone.

Do not invent phase names. Future phases must be added to the manifest first.

## Diagram Style

Use stable style names:

| Context | recommended_diagram_style |
|---|---|
| microservices, deployment, topology | `blueprint` |
| C4 context overview | `flat-icon` |
| management summary | `claude-official` |
| agent/LLM/RAG architecture | `glassmorphism` |
| diffable PR review | `mermaid` |

If unsure, use `blueprint`.

## Confidence and User Override

The profile is a recommendation, not an invisible decision. Workflow must show:

- Identified styles.
- Primary concerns.
- References to load.
- Phases to insert.
- Diagram style.

User can override any field. Store override in `user_override`, then write final merged profile back to `项目总览.yaml`.

After 3 rounds of profile edits, accept the latest user version and mark workflow degraded:

```yaml
degradations:
  - phase: frame
    cause: architecture_profile_unstable
    impact: "References and phases may need manual review."
```

## Quality Bar

A good profile is selective:

- 1 to 4 identified styles.
- 2 to 6 primary concerns.
- 1 to 6 recommended references.
- 0 to 2 recommended phases.

Too many references dilute later prompts. Prefer a smaller, sharper profile.
