---
name: arch-enrich
description: Internal v3.0 Phase 7-12 architecture layer enrichment. Dispatches architect subagents and writes arch-layer.json.
argument-hint: ["<arch-project-dir>"]
---

# arch-enrich

Consume per-repo code graphs and produce `specs/arch-layer.json`.

## Required Dispatches

Phase 7 CAPABILITY:

Dispatch `arch-capability-analyzer` with:

```text
Read the repo code graph(s), repo registry, and any rules/ADR/CR files. Produce only JSON for arch-layer.capabilities. Every inferred item must include confidence and evidence_refs.
```

Phase 8 QUALITY:

Dispatch `arch-quality-analyzer` with:

```text
Read the same graph set. Produce JSON for quality_attributes, risks, and technical_debt. Every inferred item must include confidence and evidence_refs.
```

Phase 9 CROSS-REPO:

Run deterministic `engine/arch/cross-repo-linker.mjs`. If ambiguous edges remain, dispatch `arch-impact-analyzer` only with the ambiguous evidence and merge confirmed edges.

Phase 10 ARCH-TOUR:

Dispatch `tour-builder` in architecture-tour mode. It must output `tour` steps with only `order`, `title`, `description`, and `nodeIds`.

Phase 11 REVIEW:

Dispatch `arch-senior-reviewer` with `mode=arch-layer`. Reject empty architect layer.

Phase 12 FINALIZE:

Run `engine/arch/arch-layer-writer.mjs validate`.
