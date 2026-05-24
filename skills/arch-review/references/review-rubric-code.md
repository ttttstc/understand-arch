# Code Review Rubric

> Code mode reviews architecture drift in PRs or repositories. It must run in a subagent.

## Inputs

- PR diff or repository path.
- Accepted ADRs.
- `依赖与链路图谱.yaml`.
- `项目总览.yaml.org_constraints`.
- Optional design package for the change.

## Checks

| Check | Looks For |
|---|---|
| architecture drift | dependency graph deviates from accepted ADRs |
| cross-layer calls | new imports/calls across forbidden boundaries |
| database ownership | direct access to another service's data |
| API compatibility | breaking contracts without migration plan |
| event compatibility | schema change without version/dual publish |
| tests | changed critical module lacks relevant tests |
| org conformance | banned patterns, redlines, naming, tech radar |

## Subagent Return

```yaml
mode: code
readiness: blocked|degraded|ready
findings:
  - id: F-001
    severity: error
    category: drift
    location: src/foo.ts:42:abc1234
    description: "New direct dependency violates ADR-004."
    evidence_ref: adr/ADR-004-api-boundary.md
    suggested_fix: "Route through gateway boundary described in ADR-004."
```

## Boundaries

Do not fix code. Do not generate patches. Do not produce CI, DDL, IaC, or source files.

## Degradation

If code language cannot be parsed, fall back to file-level review:

- paths changed;
- imports text search;
- config references;
- dependency files.

Mark readiness at most `degraded` when parser support is missing.
