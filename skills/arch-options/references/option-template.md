# Options Template

> `options.md` compares architecture options. It is not a final decision; `arch-adr` records the decision only after the user selects an option.

## File Location

```text
${ARCH_PROJECT_DIR}/design-docs/{change-name}/options.md
```

## Required Structure

```markdown
---
generated_by: arch-options
generated_at: <ISO-8601>
source_frame: <path>
source_impact: <path>
readiness: ready|degraded|blocked
---

# Options: <change-name>

## Context

<1-2 paragraphs summarizing design_intent and impact scope. Cite evidence IDs or paths.>

## Option Summary

| Option | Summary | Recommendation |
|---|---|---|
| A | <summary> | recommended/not recommended |
| B | <summary> | not recommended |

## Option A: <Name>

### Core Idea

<1-2 sentences>

### Required Changes

- Services:
- Modules:
- APIs:
- Data:
- Config/deploy:

### Forced Tradeoff Matrix

| Impact Scope | Module Dependency Changes | Data Model Changes | Rollback Strategy |
|---|---|---|---|
| <link to 影响面.yaml entries> | <new/changed/deprecated deps> | <migration/backfill/compat> | <code/config/data rollback> |

### Org Conformance

| Rule | Severity | Result | Notes |
|---|---|---|---|
| BP-... | high | pass/violation | ... |

### Pros

- <evidence-backed benefit>

### Cons

- <real cost or risk>

### When To Choose

<conditions>

## Option B: <Name>

<same structure>

## Recommendation

Recommended option: <A/B/...>

Rationale:

- <reason>

Conditions:

- <condition>

## Non-Recommendations

| Option | Why Not Chosen |
|---|---|
| B | <reason> |

## User Selection

Status: pending

Selected option: <to be filled by workflow after user confirms>
Selection rationale: <required if user selects non-recommended option>
```

## Single-Option Exception

Single option is allowed only with:

```markdown
## Why Not Split More Options

<Explain why meaningful alternatives collapse to the same architecture decision.>
```

Set `readiness=degraded` unless the reason is truly structural.

## Evidence Rules

Every option must cite:

- `项目总览.yaml` for intent and constraints.
- `影响面.yaml` for impact scope.
- `仓库与组件清单.yaml` and `依赖与链路图谱.yaml` for module/dependency claims.
- Org KB rules for conformance findings.

Do not introduce new facts that are absent from upstream evidence.
