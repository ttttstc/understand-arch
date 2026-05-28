---
name: arch-wiki
description: Render the v3.0 14-page architecture wiki and review projection completeness.
argument-hint: ["[audience=cto|newcomer|pm|architect] [arch-project-dir]"]
---

# /arch-wiki

Render and review the human-readable architecture wiki. The wiki is a projection of graph plus `arch-layer.json`; it is not an independent source of truth.

## Required Pages

Write exactly these pages plus README:

1. `01-overview.md`
2. `02-components.md`
3. `03-interfaces.md`
4. `04-data-models.md`
5. `05-capabilities.md`
6. `06-quality.md`
7. `07-risks-and-debt.md`
8. `08-deployments.md`
9. `09-flows-and-scenarios.md`
10. `10-decisions.md`
11. `11-changes.md`
12. `12-rules.md`
13. `13-pending-changes.md`
14. `14-diagrams.md`
15. `README.md`

## Inputs

- `specs/repos.json`
- `specs/repos/<repo_id>/knowledge-graph.json`
- `specs/arch-layer.json`
- `rules/*.md`
- `decisions/*.md`
- `change-requests/**/CR.md`

## Audience Modes

- `newcomer`: explain reading order, components, interfaces, and common flows.
- `cto`: emphasize capabilities, risks, NFRs, maturity, and roadmap gaps.
- `pm`: emphasize user-facing capabilities, changes, unknowns, and constraints.
- `architect`: include all details, tradeoffs, risks, debt, ADRs, and cross-repo topology.

Default audience is `newcomer`.

## Rendering Procedure

1. Resolve `ARCH_PROJECT_ROOT` from argument or environment.
2. Read all inputs.
3. Build a short source inventory:
   - repo count
   - module/service node count
   - capability count
   - quality attribute count
   - risk/debt count
   - ADR/CR count
4. For each page, write concrete content grounded in evidence.
5. If data is missing, write an honest known unknown and ensure it is represented in `arch-layer.known_unknowns`.
6. Never write TODO, TBD, placeholder, lorem ipsum, default Mermaid, `待补充`, or `占位`.

## Page Mapping

- 01 overview: project summary, repo list, architecture reading order, tour summary.
- 02 components: modules/services/resources from code graphs.
- 03 interfaces: endpoints, schemas, imports, service calls, events, queues.
- 04 data models: tables, schemas, data resources, ownership hints.
- 05 capabilities: every `arch-layer.capabilities[]` item.
- 06 quality: every `arch-layer.quality_attributes[]` item.
- 07 risks and debt: every risk and technical debt item.
- 08 deployments: resources, pipelines, configs, runtime boundaries.
- 09 flows and scenarios: domain/flow/step nodes plus important call chains.
- 10 decisions: ADR index and architecture decision refs.
- 11 changes: CR index and active change requests.
- 12 rules: team rules and their architectural implications.
- 13 pending changes: known unknowns, open risks, unresolved CRs.
- 14 diagrams: Mermaid diagrams grounded in node ids and cross edges.

## Review Procedure

Run deterministic projection check:

```bash
node <PLUGIN_ROOT>/engine/arch/wiki-projection-check.mjs "<ARCH_PROJECT_ROOT>"
```

Dispatch `wiki-reviewer`:

```text
Mode: wiki-review.
Project directory: <ARCH_PROJECT_ROOT>
Audience: <audience>
Deterministic projection output: <paste JSON>.
Read every wiki page plus graph and arch-layer.
Return JSON only with verdict, findings, retry_hints, and summary.
Reject placeholders, missing projections, and generic pages.
```

For `cto` or `architect`, also dispatch `arch-senior-reviewer`:

```text
Mode: wiki-review.
Review the wiki as a senior architect.
Check whether maturity, risk, and decision tradeoffs are explained with enough evidence.
Return JSON only.
```

## Success Criteria

- All 14 pages and README exist.
- Projection check returns ok.
- `wiki-reviewer` verdict is approve or conditional.
- `arch-senior-reviewer` is approve or conditional for full review audiences.
- No placeholder tokens remain.

## Failure Rules

- Missing `arch-layer.json`: stop and ask caller to run `arch-enrich`.
- Missing repo graph: stop and ask caller to run `/arch-analyze`.
- Projection failure: rerender only affected pages once.
- Review reject after retry: report findings and do not claim wiki is complete.
