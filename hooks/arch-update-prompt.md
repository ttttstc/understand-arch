# understand-arch Incremental Update Prompt

This prompt is hook-triggered and runs inside the current Claude session. It is not a Node orchestration script.

## Contract

- Keep LLM semantic work in skill/subagent dispatches.
- Use deterministic tools only for file discovery, fingerprint comparison, JSON validation, merge, and projection checks.
- Never mark the baseline fresh when graph, arch-layer, or wiki outputs are still stale.
- Keep hooks opt-in: proceed only when `.understand-arch/*/state.yaml` contains `hooks_enabled: true`.

## Incremental Flow

1. Resolve the active project directory under `.understand-arch/{project}`. If multiple projects exist, choose the one whose repo paths include the current working directory.
2. Read `specs/repos.json`, every `specs/repos/{repo}/meta.json`, and `specs/arch-layer.json`.
3. Compare recorded git commit/fingerprint data with the current workspace.
4. If only non-source files changed, update freshness metadata with a clear note and stop.
5. If one repo changed structurally, invoke `/arch-analyze` for that repo so the inherited UA Phase 0-6 subagent pipeline refreshes its `knowledge-graph.json`.
6. If cross-repo imports, API contracts, schemas, deployment config, ADRs, CRs, or rules changed, invoke `arch-enrich` so Phase 7-12 refreshes `arch-layer.json`.
7. Run deterministic validators:
   - `node engine/arch/arch-layer-writer.mjs validate <project-root-or-output-dir>`
   - `node engine/arch/wiki-projection-check.mjs <arch-project-dir>`
   - `node engine/arch/fingerprint-multi-repo.mjs <arch-project-dir>`
8. If the wiki projection check reports missing capability, risk, quality, ADR, CR, or placeholder coverage, invoke `arch-wiki` and then `arch-senior-reviewer` in wiki mode.
9. Report exactly what changed: repos refreshed, graph node/edge deltas, arch-layer deltas, wiki pages rewritten, and any remaining findings.

## Stop Conditions

- Missing `.understand-arch/{project}` baseline: ask the user to run `/arch-onboard`.
- Missing per-repo graph: run `/arch-analyze` before `arch-enrich`.
- Empty capabilities, quality attributes, or risks after enrichment: fail the update and report that the architecture layer is incomplete.
- Any placeholder text in wiki output: fail the update and report the page path.
