---
name: arch-wiki
description: Render ARCHITECTURE.md plus the v3.0 14-page architecture wiki and review projection completeness.
argument-hint: "[audience=cto|newcomer|pm|architect] [arch-project-dir]"
---

# /arch-wiki

Render and review the human-readable architecture wiki. The main product is `ARCHITECTURE.md`; the 14 pages are slice views. `ARCHITECTURE.md` must be the full 01-14 chapter concatenation with a table of contents, not a separate summary. The wiki is a deterministic projection of graph plus `arch-layer.json`; it is not an independent source of truth and must not run LLM inference during rendering.

## Subagent Dispatch Is Mandatory

This skill is an orchestrator. It must use the Claude Code Task tool for semantic wiki review and audience refinement phases.

For every LLM phase, prefer the Claude Code Task tool with the named `subagent_type` whenever the runtime exposes it.
**Runtime fallback**: If the current runtime does not expose `Task` or `Agent` tools (for example, Codex CLI, opencode, Cursor, or Copilot), inline execution is permitted. In this case:

- Open the response with one line: `[runtime-fallback: inline subagent <name>]`
- Execute the phase logic in the main conversation
- Skip parallel-dispatch instructions; treat them as sequential
- All deterministic Node tools and JSON merge rules still apply unchanged

The `Task` path remains preferred whenever the runtime supports it; the fallback exists for cross-runtime portability and should not be used in Claude Code.

Do not inline this phase. The user must see subagent activity in Claude Code. Rendering remains deterministic in `render-wiki.mjs`; subagents may review or refine source gaps only.

## Required Pages

Write exactly `ARCHITECTURE.md`, these pages, and README:

0. `ARCHITECTURE.md`
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

- `newcomer`: explain components, interfaces, and common flows in accessible language (no reading-path tutorial — the document itself reads top to bottom).
- `cto`: emphasize capabilities, risks, NFRs, maturity, and roadmap gaps.
- `pm`: emphasize user-facing capabilities, changes, unknowns, and constraints.
- `architect`: include all details, tradeoffs, risks, debt, ADRs, and cross-repo topology.

Default audience is `newcomer`.

If the user specifies multiple audiences, Send these N dispatches in a single message to run concurrently (N=<audience-count>). Use the Claude Code Task tool with `subagent_type=wiki-reviewer` once per audience. Do not inline this phase. The user must see subagent activity in Claude Code. Each audience review must return JSON only with verdict, findings, retry_hints, and summary for its audience.

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
4. Run deterministic rendering:
   ```bash
   ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/render-wiki.mjs "<ARCH_PROJECT_ROOT>"
   ```
5. If data is missing, write an honest known unknown and ensure it is represented in `arch-layer.known_unknowns`.
6. Never write TODO, TBD, placeholder, lorem ipsum, default Mermaid, `待补充`, or `占位`.
7. Do not ask an LLM to invent wiki content. If the wiki is thin, rerun `arch-enrich` Phase 7/8/9 so arch-layer gets thicker, then render again.
8. Do not put evidence in wiki output at all. No inline `[evidence:]` markers and no `## 证据来源` tables.
9. Evidence remains only in `specs/arch-layer.json#evidence_refs` for audit, wiki-reviewer, senior-reviewer Q6, and eval checks.
10. Write like a standard architecture technical document: describe the project, its architecture, tradeoffs, components, capabilities, quality attributes, risks, and flows.
11. Do not include meta narrative: no reading paths, mental-model tutorials, glossaries, scan summaries, internal phases, field definitions, tool limitations, or analyzer/reviewer/subagent terminology.
12. Do not turn pages into raw field dumps. Keep project-specific conclusions and technical detail, but remove methodology filler.

## Page Mapping

- ARCHITECTURE: full readable whitepaper assembled by concatenating the same 14 chapter bodies used by the slice pages, preceded by a table of contents.
- 01 overview: project summary, repo list, architecture style and key tradeoffs (no reading order, no tour summary — see §10.1 style rules).
- 02 components: component_profiles plus module/service/resource facts.
- 03 interfaces: external_dependencies plus endpoints, schemas, imports, service calls, events, queues.
- 04 data models: boundaries plus tables, schemas, data resources, ownership hints.
- 05 capabilities: every `arch-layer.capabilities[]` item.
- 06 quality: every `arch-layer.quality_attributes[]` and `extension_constraints[]` item.
- 07 risks and debt: every risk, technical debt, and complexity_hotspot item.
- 08 deployments: resources, pipelines, configs, runtime boundaries.
- 09 flows and scenarios: every `arch-layer.flows[]` item plus domain/flow/step nodes.
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

Use the Claude Code Task tool with `subagent_type=wiki-reviewer` for F1-F7. Do not inline this phase. The user must see subagent activity in Claude Code.

```text
Mode: wiki-review.
Project directory: <ARCH_PROJECT_ROOT>
Audience: <audience>
Deterministic projection output: <paste JSON>.
Read ARCHITECTURE.md, every wiki page, graph, and arch-layer.
Return JSON only with verdict, findings, retry_hints, and summary.
Reject placeholders, missing projections, missing timestamps, missing long-form synthesis, and generic pages.
```

For first onboard and for `cto` or `architect`, also use the Claude Code Task tool with `subagent_type=arch-senior-reviewer` for Q1-Q7. Do not inline this phase. The user must see subagent activity in Claude Code.

```text
Mode: wiki-review.
Review the wiki as a senior architect.
Check whether maturity, risk, and decision tradeoffs are explained with enough evidence.
Apply Q1 information density, Q2 decision support, Q3 narrative coherence, Q4 evidence, Q5 insight depth, Q6 no hallucination, Q7 audience fit.
Return JSON only.
```

If either reviewer returns `needs_revision`, `conditional` with high findings, or `reject`, perform refiner=b once:

1. Feed findings back into the deterministic render by first fixing the source arch-layer gap:
   - Missing narrative, components, tech stack, dependencies, or boundaries -> rerun `arch-enrich` Phase 7.
   - Missing capabilities or flows -> rerun `arch-enrich` Phase 8.
   - Missing quality, hotspots, or constraints -> rerun `arch-enrich` Phase 9.
2. Re-run `render-wiki.mjs`.
3. Re-run projection check and reviewers.
4. If it still fails, report findings and do not claim the wiki is complete.

## Success Criteria

- `ARCHITECTURE.md`, all 14 pages, and README exist.
- `ARCHITECTURE.md` is roughly the same byte size as the 14 slices combined because it contains the full chapter content.
- Every page has timestamp/source line.
- Wiki prose and chapter endings contain no rendered evidence; `arch-layer.json#evidence_refs` remains valid for audit checks.
- The wiki reads as a project architecture document, not a tool output report; Q8 no-meta-narrative holds.
- Projection check returns ok.
- `wiki-reviewer` verdict is approve or conditional.
- `arch-senior-reviewer` is approve or conditional for full review audiences.
- No placeholder tokens remain.

## Failure Rules

- Missing `arch-layer.json`: stop and ask caller to run `arch-enrich`.
- Missing repo graph: stop and ask caller to run `/arch-analyze`.
- Projection failure: rerender only affected pages once.
- Review reject after retry: report findings and do not claim wiki is complete.
