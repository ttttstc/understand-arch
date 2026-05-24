# Cache Strategy

> `arch-analyze` outputs are reusable baselines. Cache detection prevents repeated expensive scans while still catching stale evidence.

## Cache Key

The v1.0 cache key is per repository:

```yaml
baseline_commits:
  payments-service: 1a2b3c4
  identity-service: 5d6e7f8
```

No whole-project hash is required in v1.0.

## Cache Check

Before running a depth:

1. Locate expected output files for the requested depth.
2. Validate them against `internal/schemas/*.schema.json`.
3. Compare each `baseline_commits[repo]` with current git HEAD.
4. Decide: hit, partial hit, stale, or invalid.

## Expected Outputs

| Depth | Cache Files |
|---|---|
| manifest | `仓库与组件清单.yaml`, `依赖与链路图谱.yaml` |
| risk | manifest files plus `风险与技术债台账.yaml` |
| model | manifest files plus current-state diagrams |
| full | manifest, risk, model outputs |

## Outcomes

| Outcome | Behavior |
|---|---|
| hit | Skip scan and append metrics line with `duration_s=0` |
| partial hit | Scan only stale/missing repos |
| stale | Ask user whether to refresh or use stale baseline |
| invalid | Regenerate through owning depth |
| missing | Run requested depth |

## Stale Baseline Prompt

```text
baseline 可能过期:
  payments-service: cached 1a2b3c4, current 9f8e7d6

请选择:
  refresh - 重新扫描漂移仓
  use-stale - 继续但标 degraded
  abort
```

If user chooses stale, record:

```yaml
degradations:
  - phase: analyze
    cause: stale_baseline_used
    impact: "Impact/risk results may miss latest repo changes."
```

## External KB Cache

When baseline source is external markdown/wiki:

- Store `source: external_kb`.
- Store source path and mtime if available.
- Mark unknown fields as `unknown_from_external_kb`.

If external source changes, rerun adapter extraction.

## Corrupt Cache

Cache is corrupt when:

- YAML cannot parse.
- Schema fails.
- Required `evidence_refs` missing.
- Evidence points to missing source files.

Corrupt cache must be regenerated. Do not hand-edit generated evidence unless the user is deliberately doing a manual correction and records it as an override.

## Metrics

Every cache decision appends `.metrics.jsonl`:

```json
{"skill":"arch-analyze","mode":"design","inputs_summary":"manifest cache hit for 2 repos","outputs_paths":["..."],"duration_s":0,"token_estimate":0,"overrides_used":false,"verify_passed":true}
```
