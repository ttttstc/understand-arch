# Subagent Architecture

> `arch-analyze` always uses subagents. The main context coordinates scope, cache, and synthesis; it does not read the entire repository directly.

## Strategy

v1.0 uses a shallow tree:

- One subagent per repository per depth.
- Parallel subagents across repositories.
- Optional synthesizer pass for cross-repo summary.
- Deterministic scan first, LLM interpretation second.

This keeps failures isolated and prevents a single huge prompt from blurring evidence.

## Phase Split

Each subagent runs two internal phases.

Phase 1 deterministic scan:

- File tree.
- Package/runtime files.
- Entry points.
- Imports or dependency declarations.
- Docker/deploy/config paths.
- Test/config/build clues.
- Git churn and file size stats for risk mode.

Phase 2 LLM interpretation:

- Responsibility summaries.
- Component boundaries.
- Owner inference from CODEOWNERS or docs.
- Risk severity.
- C4 semantic grouping.

LLM must not invent facts absent from phase 1 or supplied docs.

## Subagent Inputs

```yaml
repo_id: payments-service
repo_path: D:/work/payments
depth: manifest
project_overview: arch/foo/evidence/项目总览.yaml
existing_baseline: null
scan_budget:
  max_files: 5000
  max_loc: 500000
required_schema:
  - internal/schemas/仓库与组件清单.schema.json
  - internal/schemas/依赖与链路图谱.schema.json
```

## Subagent Return Envelope

Every subagent returns structured YAML fragments, not prose:

```yaml
repo_id: payments-service
depth: manifest
status: ok
outputs:
  inventory_fragment: ...
  dependency_fragment: ...
warnings: []
analysis_failures: []
evidence_refs:
  - file: package.json
    line: 1
    commit: abc1234
```

Failure envelope:

```yaml
repo_id: payments-service
depth: risk
status: failed
failure:
  reason: timeout
  retryable: true
  suggested_scope_reduction: "src/payments only"
```

## Synthesis Rules

The main context may synthesize:

- Merge repo fragments into project-level YAML.
- De-duplicate external dependencies.
- Normalize IDs.
- Sort risks by severity.
- Record analysis failures.

The main context may not:

- Add new repository facts without evidence.
- Drop a repository because it seems unimportant.
- Convert a failed repo into `no_impact`.

## Retry Rules

- Retry a failed subagent once with smaller scope or clearer error context.
- If it fails again, mark that repository `analysis_failed`.
- Continue other repositories.
- If every repository fails for the requested depth, set workflow `phase=blocked`.

## Parallelism

Recommended defaults:

| Repositories | Parallel Subagents |
|---|---|
| 1 | 1 |
| 2-4 | one per repo |
| 5-10 | batches of 4 |
| 10+ | ask user to select top repos after manifest |

## Evidence Discipline

Every subagent conclusion must cite evidence. If evidence is missing, output:

```yaml
unknown_from_scan:
  field: owner
  reason: "No CODEOWNERS, README owner, or package metadata found."
```

Do not replace unknowns with guesses.
