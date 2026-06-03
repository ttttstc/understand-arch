---
name: arch-enrich
description: Internal v3.0 Phase 7-13 architecture layer enrichment. Dispatches architect subagents and writes arch-layer.json.
argument-hint: ["<arch-project-dir>"]
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(node:*), Bash(git:*), Task, Agent
---

# arch-enrich

`arch-enrich` is the architecture-layer half of understand-arch v3.0. It consumes UA-derived code fact graphs and produces `specs/arch-layer.json`. It must run inside the Claude session because Phase 7, 8, 9, 11, and 12 require subagent dispatch. Node scripts are allowed only for deterministic JSON read/write, validation, fingerprinting, eval, and cross-repo edge extraction.

## Inputs

- `ARCH_PROJECT_ROOT`: `.understand-arch/<project>` output directory.
- `specs/repos.json`: repo registry with `repo_id`, `path`, and `graph_path`.
- `specs/repos/<repo_id>/knowledge-graph.json`: one code fact graph per repo.
- `rules/*.md`: team rules when present.
- `decisions/*.md`: ADRs when present.
- `change-requests/**/CR.md`: existing CRs when present.
- Optional `intermediate/incremental-plan.json`: v3.4 subset plan from `incremental-planner.mjs`.

If `ARCH_PROJECT_ROOT` is not set, resolve it from the first argument. If neither is available, stop and ask the caller to run `/arch-onboard`.

## v3.4 Subset Mode

When the caller provides an incremental plan whose action is `PARTIAL_UPDATE`, every LLM phase must run in subset mode:

```json
{
  "subset_mode": true,
  "subset_arch_node_ids": ["repo::node-id"],
  "previous_arch_layer": "<ARCH_PROJECT_ROOT>/specs/arch-layer.json"
}
```

In subset mode, each subagent must emit only objects supported by the requested `subset_arch_node_ids`. Do not re-infer unrelated components, capabilities, flows, risks, constraints, or tour steps. Deterministic merge is handled by `arch-layer-writer.mjs merge`; do not hand-merge JSON in prose.

If the plan action is `SKIP`, do not dispatch architecture LLM phases. Run deterministic cards refresh and cards-check, then inspect findings:

- `missing_summary`: dispatch `arch-card-summarizer` only for the empty-summary cards in `affected_card_ids`, save `intermediate/card-summaries.json`, and merge with `cards-summary-merge.mjs`.
- `stale_source_hash`: report the stale card ids and run the same local summary path only for affected cards if the deriver cleared a summary.
- If no affected card id is available, keep existing summaries when source_hash is unchanged and leave remaining missing summaries for audit fallback.

The current deterministic deriver preserves existing `focused_summary` when a card's `source_hash` has not changed, so cosmetic-only code edits do not blank summaries.

If the plan action is `ARCHITECTURE_UPDATE` or `FULL_UPDATE`, run the existing full flow.

## Outputs

- `specs/arch-layer.json`
- `intermediate/cross-edges.json`
- `specs/freshness.json`
- `intermediate/arch-layer-review.json`
- `eval-report.json`

## Subagent Dispatch Contract

For every LLM phase, use Claude Code `Task` or `Agent` with the named `subagent_type`. If neither tool is available, stop and report that v3.0 cannot satisfy the iron law in this runtime. Do not inline semantic inference in the main session and do not move it into Node/Python.

## Phase 7 - NARRATIVE

Dispatch `arch-narrative-analyzer` with this template:

```text
Mode: v3 Phase 7 NARRATIVE.
Project directory: <ARCH_PROJECT_ROOT>
Subset mode: <true|false>.
Subset arch node ids: <ids or empty>.
Previous arch layer: <path or empty>.
Read specs/repos.json and every referenced knowledge-graph.json.
Read prior specs/arch-layer.json if present.
Read rules, ADRs, and existing CRs if they exist.
Produce JSON only:
{
  "architecture_style": {},
  "component_profiles": [],
  "tech_stack": [],
  "external_dependencies": [],
  "boundaries": []
}
Narrative must be architectural prose with judgement and evidence, not a node inventory.
Every inferred object must include confidence and evidence_refs.
```

Save the returned JSON to `intermediate/narrative.json`.

## Phase 8 - CAPABILITY

Dispatch `arch-capability-analyzer` with this template:

```text
Mode: v3 Phase 8 CAPABILITY.
Project directory: <ARCH_PROJECT_ROOT>
Subset mode: <true|false>.
Subset arch node ids: <ids or empty>.
Previous arch layer: <path or empty>.
Read specs/repos.json and every referenced knowledge-graph.json.
Read narrative output, rules, ADRs, and existing CRs if they exist.
Produce JSON only:
{
  "capabilities": [],
  "flows": []
}
Reject generic capabilities such as "business logic".
Every capability and flow must cite graph nodes.
```

Save the returned JSON to `intermediate/capabilities.json`.

## Phase 9 - QUALITY

Dispatch `arch-quality-analyzer` with this template:

```text
Mode: v3 Phase 9 QUALITY.
Project directory: <ARCH_PROJECT_ROOT>
Subset mode: <true|false>.
Subset arch node ids: <ids or empty>.
Previous arch layer: <path or empty>.
Read specs/repos.json, every graph, narrative output, capabilities, flows, rules, and ADRs.
Produce JSON only:
{
  "quality_attributes": [],
  "risks": [],
  "technical_debt": [],
  "complexity_hotspots": [],
  "extension_constraints": []
}
All inferred items require confidence and evidence_refs.
Risks require severity, likelihood, mitigation, and node_ids.
Technical debt requires category, severity, recommendation, and node_ids.
Hotspots and extension constraints must explain why future architecture decisions are harder.
Do not invent security or compliance claims without evidence; use known_unknowns when evidence is insufficient.
```

Save the returned JSON to `intermediate/quality.json`.

## Phase 9.5 - CONSTRAINT-MINE + HISTORY-MINE(规格约束层,v3.1/v3.4)

Dispatch `arch-constraint-miner` with this template:

```text
Mode: v3.1 Phase 9.5 CONSTRAINT-MINE.
Project directory: <ARCH_PROJECT_ROOT>
Subset mode: <true|false>.
Subset arch node ids: <ids or empty>.
Previous arch layer: <path or empty>.
Read specs/repos.json, every graph, narrative output, capabilities, flows, quality, rules, and ADRs.
Produce JSON only with three outputs:
{
  "constraints": [],          // 隐性约束考古(proposed, source ai-mined, evidence_level 非 confirmed)
  "suspicious_findings": [],  // 反常点侦查(7 类,带可疑度×影响面)
  "coding_conventions": []    // 风格约定统计(带 consistency.match_rate)
}
All user-facing text in Chinese. Constraints and conventions are proposed only.
Suspicious findings must be thorough — they are a standalone risk map and the source for /arch-interview.
```

In parallel, collect git-history signals deterministically:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/history-miner-runner.mjs collect --arch-dir="<ARCH_PROJECT_ROOT>"
```

Dispatch `arch-history-miner` with this template:

```text
Mode: v3.4 Phase 9.5 HISTORY-MINE.
Project directory: <ARCH_PROJECT_ROOT>
Read intermediate/history-miner-input.json.
Produce JSON only:
{
  "constraints": [],
  "suspicious_findings": []
}
Constraints are proposed only, source ai-mined, evidence_level never confirmed.
Suspicious findings must stay pending-interview.
Do not infer author/team performance.
Do not run git; use only the collected history signals.
```

Save the returned JSON to `intermediate/history-miner-output.json`, then merge it deterministically:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/history-miner-runner.mjs merge --arch-dir="<ARCH_PROJECT_ROOT>" --output="<ARCH_PROJECT_ROOT>/intermediate/history-miner-output.json"
```

Write the outputs deterministically (no LLM in Node):

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/constraint-writer.mjs "<workspace-root>"
```

This writes (creating `rules/constraints/` if absent, never overwriting human-confirmed entries):

- `rules/constraints/{system-charter,domain-invariants,dependency-rules,api-contracts,risk-register,test-coverage-gaps}.md` (proposed constraints, merged by category)
- `rules/constraints/suspicious-findings.md` (full ranked list)
- `rules/constraints/coding-conventions.md` (with consistency)

Merge rule: new proposed entries are appended; existing `confirmed`/`adjusted`/`rejected` entries are preserved untouched (human decisions win).

## Phase 9.6 - PROJECT-LANGUAGE(v3.3)

Dispatch `arch-project-language-analyzer` with this template:

```text
Mode: v3.3 PROJECT-LANGUAGE.
Project directory: <ARCH_PROJECT_ROOT>
Read specs/repos.json, every graph, narrative output, capabilities, flows, quality, rules, constraints, ADRs, and existing CRs.
Produce a shared project language table for future wiki, CR, diagram, and review output.
Return JSON only:
{
  "domain_terms": [],
  "roles": [],
  "states_events": [],
  "components": [],
  "forbidden_mixups": []
}
Only include terms supported by project evidence. Keep user-facing values Chinese and preserve code identifiers.
```

Save the returned JSON to `intermediate/project-language.json`, then run deterministic rendering:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/project-language-writer.mjs "<workspace-root>"
```

This writes `rules/project-language.md`. Empty sections are allowed only when the writer explicitly marks them as `未识别`; do not invent vocabulary to fill the table.

## Phase 10 - CROSS-REPO LINK

Run deterministic linking:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/cross-repo-linker.mjs "<workspace-root>"
```

Read `intermediate/cross-edges.json`.

If any cross-repo dependency is ambiguous, dispatch `arch-impact-analyzer` with only the ambiguous evidence:

```text
Mode: v3 Phase 10 AMBIGUOUS CROSS-REPO LINK.
Classify each candidate as confirmed, rejected, or unknown.
Return JSON only with confirmed cross_edges and known_unknowns.
Do not merge repo graphs.
Preserve source repo and target repo in every id.
```

## Phase 11 - CARDS-SUMMARY(v3.4)

Run deterministic cards derivation:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/cards-deriver.mjs --arch-dir="<ARCH_PROJECT_ROOT>"
```

Run deterministic cards-check. `missing_summary` warnings are expected before this phase and do not block:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/cards-check.mjs --arch-dir="<ARCH_PROJECT_ROOT>"
```

If any card has an empty `focused_summary`, dispatch `arch-card-summarizer` with this template:

```text
Mode: v3.4 Phase 11 CARDS-SUMMARY.
Project directory: <ARCH_PROJECT_ROOT>
Read cards/agent-cards.json.
Read source materials referenced by each empty-summary card's source_artifact.
Produce JSON only:
{
  "summaries": [
    {
      "card_id": "card:component:auth",
      "focused_summary": "不超过 200 字的中文高密度摘要"
    }
  ]
}
Do not change anchors, tags, related cards, evidence level, source artifact, or source hash.
No narrative, no markdown, no tool-output wording.
```

Save the returned JSON to `intermediate/card-summaries.json`, then merge it deterministically:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/cards-summary-merge.mjs --arch-dir="<ARCH_PROJECT_ROOT>" --summaries="<ARCH_PROJECT_ROOT>/intermediate/card-summaries.json"
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/cards-check.mjs --arch-dir="<ARCH_PROJECT_ROOT>"
```

After merge, `cards-check` should have no `missing_summary` warnings for cards that were sent to the summarizer. If the summarizer omitted a card, report the omitted ids.

## Phase 11.5 - ARCH-TOUR

Dispatch `tour-builder` in architecture-tour mode:

```text
Mode: v3 Phase 11 ARCH-TOUR.
Subset mode: <true|false>.
Subset arch node ids: <ids or empty>.
Previous arch layer: <path or empty>.
Read graph summaries plus narrative, capabilities, flows, risks, technical debt, hotspots, constraints, ADRs, and CRs.
Create an architect-facing tour: overview -> capabilities -> critical flows -> risks -> decisions.
Return JSON only:
{
  "tour": [
    {
      "order": 1,
      "title": "...",
      "description": "...",
      "nodeIds": ["repo::node-id", "cap:<id>", "risk:<id>"]
    }
  ]
}
Do not include languageLesson.
Every step must cite at least one graph or arch-layer id.
```

Save the output to `intermediate/arch-tour.json`.

## Phase 12 - ARCH-REVIEW

Build a draft `arch-layer.json` by merging:

- narrative fields
- capabilities
- flows
- quality attributes, risks, technical debt, complexity hotspots, extension constraints
- deterministic cross edges
- external dependencies and boundaries
- tour
- ADR/CR indexes if present
- freshness metadata

Run deterministic validation:

```bash
node <PLUGIN_ROOT>/engine/arch/arch-layer-writer.mjs validate "<workspace-root>"
```

Run wiki projection later in `/arch-wiki`; here only ensure that all referenced graph ids exist in the per-repo graphs.

Dispatch `arch-senior-reviewer`:

```text
Mode: arch-layer.
Review <ARCH_PROJECT_ROOT>/specs/arch-layer.json.
Deterministic validation output: <paste summary>.
Reject if architecture_style is unknown without honest explanation.
Reject if component_profiles, capabilities, quality_attributes, or risks are empty for a real application graph.
Reject if confidence/evidence_refs are missing.
Return JSON only with verdict, findings, retry_hints, summary.
```

If verdict is `reject`, do not finalize. Rerun only the specific failed phase once using the retry hints.

## Phase 13 - FINALIZE

Write `specs/arch-layer.json`.

Run:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/arch-layer-writer.mjs validate "<workspace-root>"
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/fingerprint-multi-repo.mjs "<workspace-root>"
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/eval-report.mjs "<workspace-root>"
```

Report:

- capability count
- component profile count
- quality attribute count
- risk count
- technical debt count
- flow count
- hotspot count
- extension constraint count
- cross edge count
- review verdict
- eval trust label and hallucination rate

## Hard Stops

- Do not continue if no repo graph exists.
- Do not emit an empty architecture layer after onboard.
- Do not emit an architecture layer with empty narrative fields after onboard.
- Do not run LLM inference in Node or Python.
- Do not use UA graph merge to combine repos.
- Do not mark freshness current if validation fails.
