# Doc Review Rubric

> Doc mode reviews architecture deliverables. It does not rewrite them.

## Inputs

- `design-doc.md`
- `实施方案.md`
- `options.md`
- ADRs
- `影响面.yaml`
- 4 forced design markdown files
- `项目总览.yaml.org_constraints`

## Required Checks

| Check | Pass Criteria |
|---|---|
| completeness | required files and sections exist |
| evidence | major assertions cite YAML/source |
| options quality | 4 forced tradeoff columns are complete |
| decision quality | ADR has 7 sections, alternatives, consequences |
| implementation readiness | 17 chapters are present and actionable |
| rollback | rollback covers code, config, data, deployment |
| org conformance | KB violations are marked or KB degraded |
| ATAM tradeoffs | quality attribute tradeoffs are explicit |

## Finding Format

```yaml
- id: F-001
  severity: error|warning|info
  category: completeness|evidence|decision|rollback|conformance|atam
  location: design-docs/change/实施方案.md#回滚方案
  description: <what is wrong>
  evidence_ref: <path or yaml entry>
  suggested_fix: <descriptive guidance only>
```

## Readiness

- Any `error` -> `blocked`.
- Warnings only -> `degraded`.
- No findings -> `ready`.

Design mode acceptance does not allow degraded final state.

## No-Issue Case

If no findings:

```markdown
No architecture review findings found.
Residual risk: review is limited to provided artifacts and evidence freshness.
```
