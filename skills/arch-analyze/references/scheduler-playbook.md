# Scheduler Playbook

## Purpose

This reference defines how `arch-analyze` schedules v2.0 Phase 0-8 work for one or more repositories.
The scheduler preserves a single pipeline for N=1 and N>1 so that single-repo projects do not drift from multi-repo behavior.

## Inputs

- `.understand-arch/{project}/specs/repos.yaml`
- `.understand-arch/{project}/state.yaml`
- Existing `specs/repos/{repo_id}/.fingerprint.json`
- Optional changed paths, repo filters, or drift-audit hints
- Optional rules summary

## Phase Order

1. Phase 0 Pre-flight loads repos, state, fingerprints and mode.
2. Phase 1 SCAN dispatches `arch-project-scanner` per affected repo.
3. Phase 1.5 BATCH runs deterministic batching and writes `batches-{repo_id}.json`.
4. Phase 2 ANALYZE dispatches `arch-file-analyzer` per batch.
5. Phase 3 ASSEMBLE merges batch fragments into an assembled repo graph.
6. Phase 4 STRUCTURE dispatches `arch-architecture-analyzer`.
7. Phase 5 DOMAIN dispatches `arch-domain-analyzer`.
8. Phase 6 QUALITY dispatches `arch-quality-analyzer`.
9. Phase 7 REVIEW dispatches `arch-graph-reviewer --mode=phase-7-final`.
10. Phase 8 FINALIZE writes repo graph, fingerprint and cross-repo graph.

## Scheduling Rules

- Limit active repo workers to the project policy or 5 by default.
- Within a repo, Phase 1.5 waits for Phase 1, Phase 2 waits for Phase 1.5, and so on.
- Different repos may run Phase 1-7 concurrently, but Phase 8 waits for all affected repo reviews.
- A failed repo does not corrupt other repo outputs; mark it degraded and keep previous fresh outputs where possible.
- Retry deterministic tool failures once when stderr indicates transient I/O.
- Do not retry schema violations without changing the producer input.
- Preserve intermediate files for auditability.

## Incremental Mode

Incremental mode narrows work by changed paths:

- Manifest, lockfile, API schema, infra and entrypoint changes refresh the whole repo.
- Import-only changes refresh the batches containing source and target files plus neighbor batches.
- Local function-body changes refresh only the containing batch and mark derived domain/quality as possibly stale.
- Cross-repo reference changes force Phase 8 cross-edge recomputation.

## Output Contracts

- Phase 1 writes `intermediate/scan-result-{repo_id}.json`.
- Phase 1.5 writes `intermediate/batches-{repo_id}.json`.
- Phase 2 writes `intermediate/batch-{n}.json` or `batch-{n}-part-{k}.json`.
- Phase 3 writes `intermediate/assembled-graph-{repo_id}.json`.
- Phase 4 writes `intermediate/layers-{repo_id}.json`.
- Phase 5 writes `intermediate/domain-{repo_id}.json`.
- Phase 6 writes `intermediate/quality-{repo_id}.json`.
- Phase 7 writes `intermediate/review-phase-7-{repo_id}.json`.
- Phase 8 writes only spec outputs allowed by `write-scope.yaml`.

## Guardrails

- Never write wiki, CR or ADR from `arch-analyze`.
- Never skip Phase 7 for refreshed repo graphs.
- Never invent cross-repo edges without explicit evidence.
- Never special-case single-repo projects.
