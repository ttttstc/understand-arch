# Integrity Recovery Matrix

> Integrity checks protect the evidence graph before workflow work begins. The rule is simple: mutable derived artifacts can be regenerated; append-only history cannot be silently recreated.

## Severity Levels

| Severity | Meaning | Workflow Behavior |
|---|---|---|
| fatal | State is unreadable or append-only history is missing | Stop and ask for restore or explicit user decision |
| severe | Evidence source is missing or invalid but can be regenerated | Regenerate through owning skill after notifying user |
| moderate | Derived human-facing artifact is missing | Rebuild from evidence and record recovery |
| low | Cosmetic or cache drift | Continue after warning |

## Artifact Ownership

| Artifact | Owner | Mutable | Recovery Default |
|---|---|---|---|
| `state.yaml` | `arch-workflow` | mutable append-only sections | fatal if missing |
| `evidence/项目总览.yaml` | `arch-frame` | mutable | rerun frame or block if user input absent |
| `evidence/仓库与组件清单.yaml` | `arch-analyze` | mutable | rerun analyze manifest |
| `evidence/依赖与链路图谱.yaml` | `arch-analyze` | mutable | rerun analyze manifest |
| `evidence/风险与技术债台账.yaml` | `arch-analyze` | mutable | rerun analyze risk |
| `evidence/决策与证据索引.yaml` | `arch-options` / `arch-adr` | mutable index over append-only records | rebuild from ADR/options if sources exist |
| `wiki/*.md` | `arch-pack` | mutable | regenerate from evidence |
| `diagrams/*.mmd` | `arch-diagram` | mutable | regenerate from evidence |
| `diagrams/*.svg|*.png` | `arch-diagram` | mutable | rerender or degrade to Mermaid |
| `adr/ADR-NNN-*.md` | `arch-adr` | append-only | fatal if missing or numbering gap |
| `design-docs/{change}/` | `arch-pack` / `arch-adr` | append-only per change | fatal if missing after completion |
| `audits/{date}/` | `arch-pack` / `arch-review` | append-only per audit | fatal if missing after completion |
| `briefs/{audience}-{date}/` | `arch-pack` | append-only per brief | fatal if missing after completion |
| `.metrics.jsonl` | all skills | append-only telemetry | warn if missing, recreate empty with audit note |

## Check Matrix

| Check ID | Condition | Severity | Detection | Recovery |
|---|---|---|---|---|
| I-001 | `state.yaml` missing | fatal | file existence | Stop; offer `git restore`, fresh onboard, or abort |
| I-002 | `state.yaml` invalid YAML | fatal | YAML parse | Stop; show parser line; require manual fix |
| I-003 | `state.yaml.phase` not in enum | fatal | schema check | Stop; ask user to set valid phase |
| I-004 | `state.yaml.completed_phases` references missing output | severe/fatal by artifact class | path check | Regenerate mutable outputs; stop for append-only outputs |
| I-005 | project evidence YAML missing | severe | expected file list by mode | Rerun owning skill after notice |
| I-006 | project evidence YAML schema fails | severe | JSON Schema validation | Rerun owning skill; if repeated, block with error |
| I-007 | `evidence_refs` points to missing file | severe | path check | Retry owning skill; do not patch evidence by hand |
| I-008 | `evidence_refs.commit` missing from git history | severe | `git cat-file -e` or equivalent | Mark `commit_hash_drift`; ask whether to refresh baseline |
| I-009 | wiki page missing | moderate | expected wiki list | Regenerate through `arch-pack` |
| I-010 | diagram source missing | moderate | diagram manifest or expected path | Regenerate through `arch-diagram` |
| I-011 | rendered SVG/PNG missing | low | file check | Rerender if backend exists; otherwise degrade to Mermaid |
| I-012 | ADR numbering gap | fatal | scan `ADR-NNN-*` | Stop; require `git restore` or explicit override record |
| I-013 | ADR content missing required section | fatal | section scan | Stop; ADR is append-only and must be human-repaired |
| I-014 | design-docs entry missing after `done` | fatal | mode history check | Stop; require restore or a new design run |
| I-015 | audit/brief entry missing after `done` | fatal | mode history check | Stop; require restore or rerun as new audit/brief |
| I-016 | `.metrics.jsonl` missing | low | file existence | Recreate empty file and append recovery note to state |
| I-017 | org KB file exists but schema fails | fatal | org schema validation | Stop; show file and line; user must fix KB |
| I-018 | org KB directory missing | low | directory check | Mark all KB categories `not_configured`; continue |

## Recovery Record

Every recovery attempt appends to `state.yaml.integrity_history`:

```yaml
integrity_history:
  - timestamp: 2026-05-24T12:00:00Z
    issue: missing_evidence
    file: arch/foo/evidence/依赖与链路图谱.yaml
    action: auto_regenerated
    by: arch-workflow
    reason: "manifest evidence missing before audit mode"
```

Required fields:

- `timestamp`
- `issue`
- `file`
- `action`
- `by`
- `reason`

`reason` may be null only for deterministic automatic rebuilds. User overrides always require a non-empty reason.

## Regeneration Rules

Mutable evidence can be regenerated only by the owning skill:

- Project overview: `arch-frame`
- Manifest and dependency graph: `arch-analyze --depth=manifest`
- Risk register: `arch-analyze --depth=risk`
- Decision index: `arch-options` and `arch-adr` from source artifacts
- Wiki and briefs: `arch-pack`
- Diagrams: `arch-diagram`

Workflow must not fabricate replacement YAML directly.

## Append-Only Rules

Append-only directories represent architecture history:

- `adr/`
- `design-docs/`
- `audits/`
- `briefs/`

If any completed append-only artifact disappears, workflow stops. It may offer three paths:

1. Restore from git.
2. Create a new run that supersedes the missing one.
3. Record a user override with reason and continue in degraded state.

The workflow must not silently recreate the old artifact with the same identity.

## Commit Drift Handling

Commit drift is not always fatal. The workflow distinguishes:

| Drift | Behavior |
|---|---|
| current repo has moved but old commit exists | warn that baseline may be stale; ask whether to refresh |
| old commit no longer exists | severe; mark `commit_hash_drift`; recommend refresh |
| git unavailable | degrade to file mtime checks and record `git_unavailable` |

Design and audit modes should prefer a fresh manifest when drift is detected.

## Failure Escalation

Automatic recovery can retry once. If the owning skill fails twice:

- Set `state.yaml.phase=blocked`.
- Add a degradation record with the failed artifact and owning skill.
- Report the smallest next action to the user: fix input, narrow scope, restore file, or abort.
