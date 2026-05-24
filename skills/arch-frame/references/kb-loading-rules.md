# KB Loading Rules

> Enterprise KB is the v1.0 moat input. `arch-frame` loads it at workflow start and records the result in `项目总览.yaml.org_constraints`.

## Search Order

Load KB from the first configured path that exists:

1. Explicit workflow argument: `--kb-path=<path>`.
2. Team path in repository: `<repo-root>/.arch-kb/`.
3. User path: `~/.understand-arch/kb/`.

If no path exists, mark all KB categories as `not_configured` and continue.

## Expected Files

| File | Schema | Target Field |
|---|---|---|
| `banned-patterns.yaml` | `internal/schemas/banned-patterns.schema.json` | `org_constraints.banned_patterns` |
| `compliance-redlines.yaml` | `internal/schemas/compliance-redlines.schema.json` | `org_constraints.compliance_redlines` |
| `network-boundaries.yaml` | `internal/schemas/network-boundaries.schema.json` | `org_constraints.network_boundaries` |
| `naming-conventions.yaml` | `internal/schemas/naming-conventions.schema.json` | `org_constraints.naming_conventions` |
| `tech-radar.yaml` | `internal/schemas/tech-radar.schema.json` | `org_constraints.tech_radar` |

## Loading Outcomes

| Situation | Behavior | Output |
|---|---|---|
| KB directory missing | Continue with warning | every category `not_configured` |
| KB directory exists, file missing | Continue with warning | missing category `not_loaded` |
| File exists and schema passes | Load summary entries | array of normalized rules |
| File exists and schema fails | Stop workflow | fail-loud with file and line |
| File exists but empty | Stop workflow | schema failure |

## Normalization

Do not copy every KB field into `项目总览.yaml`. Store a compact summary that later skills can use without bloating prompt context.

`banned_patterns` summary:

```yaml
- id: BP-DIRECT-DB
  rule: "Services must not directly read another service's database."
  severity: high
  notes: "Approval required from architecture owner."
```

`tech_radar` summary:

```yaml
- id: TR-VECTOR-DB
  technology: "pgvector"
  status: adopt
  notes: "Preferred for small to medium RAG workloads."
```

## Failure Message

Schema failure should be loud and actionable:

```text
企业 KB 校验失败: ~/.understand-arch/kb/banned-patterns.yaml
Schema: internal/schemas/banned-patterns.schema.json
Problem: patterns[2].severity must be one of critical/high/medium/low
Workflow paused before frame output. Please fix the KB file or rerun with --kb-path pointing to a valid KB.
```

Do not silently skip invalid KB files. Invalid constraints are worse than absent constraints.

## State Updates

Workflow writes load status to `state.yaml.kb_loaded`:

```yaml
kb_loaded:
  source: ~/.understand-arch/kb/
  banned_patterns: loaded
  compliance_redlines: not_loaded
  network_boundaries: loaded
  naming_conventions: loaded
  tech_radar: not_configured
  loaded_at: 2026-05-24T12:00:00Z
  load_errors: []
```

If any file fails schema:

```yaml
load_errors:
  - file: ~/.understand-arch/kb/banned-patterns.yaml
    line: 17
    error: "severity must be critical/high/medium/low"
```

## How Later Skills Use KB

`arch-options`:

- Mark option violations.
- Downgrade or reject options that violate critical/high rules.
- Escalate if every option violates KB.

`arch-review`:

- Run org-conformance.
- Produce findings for drift, banned patterns, redlines, network boundaries, naming, and tech radar mismatch.

`arch-pack`:

- Include KB constraints only when they affect delivery or decision-making.

## Override Rules

Users may override missing KB, but not invalid KB.

Allowed override:

- KB directory does not exist, user wants to proceed.
- A non-critical KB file is absent and user accepts degraded org-conformance.

Disallowed override by default:

- Existing KB file fails schema.
- Compliance redline is invalid or unreadable.

If the user insists on an override, record:

```yaml
overrides:
  - phase: frame
    type: skip_kb_check
    reason: "<user supplied reason>"
    by: user
    at: <ISO-8601>
    consequences: "Org conformance may be incomplete."
```
