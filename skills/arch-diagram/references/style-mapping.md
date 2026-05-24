# Style Mapping

> Style is chosen by diagram type, audience, and architecture profile. User override wins.

## Default Matrix

| Diagram Type | Audience | Fireworks Style | Mermaid Template |
|---|---|---|---|
| c4-context | wiki/onboarding | flat-icon or claude-official | C4 context-like flowchart |
| c4-container | wiki/design | blueprint | C4 container-like flowchart |
| c4-component | dev-implementation | blueprint | component flowchart |
| deployment | dev-implementation/management | blueprint | deployment flowchart |
| sequence | design/review | uml | sequenceDiagram |
| data-flow | design/wiki | flat-icon | flowchart |
| agent/LLM architecture | design/management | glassmorphism | flowchart with subgraphs |

## Profile Overrides

`architecture_profile.recommended_diagram_style` maps:

- `blueprint` -> microservices, topology, deployment.
- `flat-icon` -> context overview and data flow.
- `claude-official` -> management summaries.
- `glassmorphism` -> agent/LLM/RAG architecture.
- `mermaid` -> diffable review artifacts.

## User Override

If user passes `--style`, use it and record:

```yaml
style: <user-style>
style_source: user_override
```

## Style Boundaries

Do not let style alter architecture content.

Allowed:

- visual grouping;
- icon choices;
- layout direction;
- color style.

Not allowed:

- adding nodes not in source;
- removing risky dependencies for aesthetics;
- changing edge direction.
