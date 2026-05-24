# Drift Detection Rules

> Drift means implementation or design moved away from accepted architecture decisions or evidence baseline.

## Sources of Truth

- Accepted ADRs.
- `依赖与链路图谱.yaml`.
- `仓库与组件清单.yaml`.
- `项目总览.yaml.org_constraints`.
- Current PR diff or repo scan.

## Drift Types

| Type | Example |
|---|---|
| dependency drift | new direct service call bypasses agreed boundary |
| data ownership drift | service reads another service database |
| deployment drift | deploy unit split/merge not reflected in design |
| API drift | contract changes without ADR or compatibility |
| org policy drift | code violates banned pattern or network boundary |

## Detection Steps

1. Extract changed files and dependency hints.
2. Map changes to manifest components.
3. Compare edges to dependency graph.
4. Compare decision impact to accepted ADRs.
5. Check org KB constraints.
6. Emit findings only when evidence is concrete.

## False Positive Guard

Do not report drift when:

- a changed file is docs-only and does not alter architecture;
- the ADR explicitly allows the pattern;
- the dependency already exists in baseline and the PR only touches implementation details;
- evidence is missing.

When uncertain, use `warning` with clear uncertainty instead of `error`.
