---
name: arch-diagram
description: Produce evidence-grounded Mermaid architecture diagrams from graph plus arch-layer.
argument-hint: ["[c4|context|container|component|flow|risk] [arch-project-dir]"]
---

# /arch-diagram

Generate diagrams as markdown/Mermaid projections of existing graph and architecture-layer data. v3.0 does not create a separate diagram engine; diagrams are written into wiki page `14-diagrams.md` and may be copied into CR.md or ADRs.

## Supported Diagram Types

- `context`: system context and external actors.
- `container`: services, modules, resources, and repos.
- `component`: important modules/classes within a repo.
- `flow`: key runtime scenario or domain flow.
- `risk`: risk/debt heatmap by component.
- `c4`: produce context + container + component summaries.

## Inputs

- `specs/repos.json`
- per-repo code graphs
- `specs/arch-layer.json`
- optional CR.md or ADR path supplied by caller

## Procedure

1. Resolve `ARCH_PROJECT_ROOT`.
2. Read graph and arch-layer.
3. Select diagram type.
4. Choose only nodes with evidence.
5. Prefer module/service/resource/endpoint/schema/table nodes for architecture diagrams.
6. Include repo prefixes in labels when multi-repo.
7. Write Mermaid, not SVG.
8. Add a source note listing graph or arch-layer ids used.

## LLM Dispatch

If the diagram requires semantic grouping, dispatch `arch-solution-designer`:

```text
Mode: architecture diagram projection.
Diagram type: <type>
Read graph and arch-layer.
Return Mermaid only plus a JSON list of evidence ids.
Do not invent nodes.
Do not omit critical risks for risk diagrams.
```

## Output

- Default: append or replace the matching section in `wiki/14-diagrams.md`.
- If caller provides CR.md: update `## 13. 关联` with the diagram reference.
- If caller provides ADR: append a diagram block as evidence.

## Failure Rules

- Missing graph: stop.
- Missing arch-layer for risk/capability diagrams: stop.
- Mermaid with placeholder labels: reject and regenerate once.
