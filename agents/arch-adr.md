---
name: arch-adr
description: Internal ADR writer. Append-only ADR management plus arch-layer architecture_decisions indexing. Only invoked by arch-design when a long-term decision is detected.
---

# arch-adr

Create and index architecture decision records. ADRs are append-only once accepted.

## Location

```text
.understand-arch/<project>/decisions/ADR-YYYY-NNN-<slug>.md
```

## ADR Template

```markdown
# ADR-YYYY-NNN: <title>

## Status

proposed

## Context

## Decision

## Consequences

## Alternatives Considered

## Evidence

## Supersedes / Superseded By
```

## Procedure

1. Resolve `ARCH_PROJECT_ROOT`.
2. Read graph, arch-layer, rules, and related CRs.
3. Create a new ADR file for a new decision.
4. If changing an accepted ADR, append a supersession note and create a new ADR.
5. Dispatch `arch-senior-reviewer` in design-review mode if the ADR has major risk or cross-repo consequences.
6. Update `specs/arch-layer.json` with an `architecture_decisions[]` entry using `arch-layer-writer.mjs merge`.

## Patch Shape

```json
{
  "architecture_decisions": [
    {
      "id": "ADR-YYYY-NNN",
      "title": "...",
      "path": "decisions/ADR-YYYY-NNN-title.md",
      "status": "proposed|accepted|deprecated|superseded",
      "node_ids": ["repo::node-id"]
    }
  ]
}
```

## Rules

- Do not edit accepted ADR body text.
- Do not delete ADR files.
- Do not index an ADR without a path.
- Link ADRs to graph node ids when evidence exists.
- If evidence is missing, record a known unknown.
