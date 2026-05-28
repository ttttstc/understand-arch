---
name: arch-enrich
description: Internal v3.0 Phase 7-12 architecture layer enrichment. Dispatches architect subagents and writes arch-layer.json.
argument-hint: ["<arch-project-dir>"]
---

# arch-enrich

`arch-enrich` is the architecture-layer half of understand-arch v3.0. It consumes UA-derived code fact graphs and produces `specs/arch-layer.json`. It must run inside the Claude session because Phase 7, 8, 10, and 11 require subagent dispatch. Node scripts are allowed only for deterministic JSON read/write, validation, fingerprinting, and cross-repo edge extraction.

## Inputs

- `ARCH_PROJECT_ROOT`: `.understand-arch/<project>` output directory.
- `specs/repos.json`: repo registry with `repo_id`, `path`, and `graph_path`.
- `specs/repos/<repo_id>/knowledge-graph.json`: one code fact graph per repo.
- `rules/*.md`: team rules when present.
- `decisions/*.md`: ADRs when present.
- `change-requests/**/CR.md`: existing CRs when present.

If `ARCH_PROJECT_ROOT` is not set, resolve it from the first argument. If neither is available, stop and ask the caller to run `/arch-onboard`.

## Outputs

- `specs/arch-layer.json`
- `intermediate/cross-edges.json`
- `specs/freshness.json`
- `intermediate/arch-layer-review.json`

## Phase 7 - CAPABILITY

Dispatch `arch-capability-analyzer` with this template:

```text
Mode: v3 Phase 7 CAPABILITY.
Project directory: <ARCH_PROJECT_ROOT>
Read specs/repos.json and every referenced knowledge-graph.json.
Read rules, ADRs, and existing CRs if they exist.
Produce JSON only:
{
  "capabilities": [
    {
      "id": "cap:<stable-slug>",
      "name": "...",
      "description": "...",
      "maturity": "nascent|growing|stable|optimized|legacy",
      "importance": "low|medium|high|critical",
      "supporting_node_ids": ["repo::node-id"],
      "gaps": ["..."],
      "confidence": "low|medium|high",
      "evidence_refs": ["repo::node-id or file path"]
    }
  ]
}
Reject generic capabilities such as "business logic".
Every capability must cite graph nodes.
```

Save the returned JSON to `intermediate/capabilities.json`.

## Phase 8 - QUALITY

Dispatch `arch-quality-analyzer` with this template:

```text
Mode: v3 Phase 8 QUALITY.
Project directory: <ARCH_PROJECT_ROOT>
Read specs/repos.json, every graph, rules, ADRs, and capabilities.
Produce JSON only:
{
  "quality_attributes": [],
  "risks": [],
  "technical_debt": []
}
All inferred items require confidence and evidence_refs.
Risks require severity, likelihood, mitigation, and node_ids.
Technical debt requires category, severity, recommendation, and node_ids.
Do not invent security or compliance claims without evidence; use known_unknowns when evidence is insufficient.
```

Save the returned JSON to `intermediate/quality.json`.

## Phase 9 - CROSS-REPO LINK

Run deterministic linking:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/cross-repo-linker.mjs "<workspace-root>"
```

Read `intermediate/cross-edges.json`.

If any cross-repo dependency is ambiguous, dispatch `arch-impact-analyzer` with only the ambiguous evidence:

```text
Mode: v3 Phase 9 AMBIGUOUS CROSS-REPO LINK.
Classify each candidate as confirmed, rejected, or unknown.
Return JSON only with confirmed cross_edges and known_unknowns.
Do not merge repo graphs.
Preserve source repo and target repo in every id.
```

## Phase 10 - ARCH-TOUR

Dispatch `tour-builder` in architecture-tour mode:

```text
Mode: v3 Phase 10 ARCH-TOUR.
Read graph summaries plus arch-layer capabilities, risks, technical debt, ADRs, and CRs.
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

## Phase 11 - ARCH-REVIEW

Build a draft `arch-layer.json` by merging:

- capabilities
- quality attributes, risks, technical debt
- deterministic cross edges
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
Reject if capabilities, quality_attributes, or risks are empty.
Reject if confidence/evidence_refs are missing.
Return JSON only with verdict, findings, retry_hints, summary.
```

If verdict is `reject`, do not finalize. Rerun only the specific failed phase once using the retry hints.

## Phase 12 - FINALIZE

Write `specs/arch-layer.json`.

Run:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/arch-layer-writer.mjs validate "<workspace-root>"
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/fingerprint-multi-repo.mjs "<workspace-root>"
```

Report:

- capability count
- quality attribute count
- risk count
- technical debt count
- cross edge count
- review verdict

## Hard Stops

- Do not continue if no repo graph exists.
- Do not emit an empty architecture layer after onboard.
- Do not run LLM inference in Node or Python.
- Do not use UA graph merge to combine repos.
- Do not mark freshness current if validation fails.
