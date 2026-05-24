# Repository Importance Scoring

> Deep analysis is expensive. After manifest, rank repositories so the user can choose where to spend risk/model budget.

## Formula

Score each repository from 0 to 100:

```text
score =
  0.30 * normalized_dependency_indegree +
  0.20 * normalized_dependency_outdegree +
  0.20 * normalized_recent_churn +
  0.15 * normalized_loc +
  0.10 * critical_flow_presence +
  0.05 * owner_unknown_penalty
```

Where:

- `dependency_indegree`: number of internal components depending on this repo.
- `dependency_outdegree`: number of internal dependencies this repo calls.
- `recent_churn`: commits or changed lines in the last 90 days.
- `loc`: rough lines of code excluding vendored/build artifacts.
- `critical_flow_presence`: 1 if repo appears in a critical flow, otherwise 0.
- `owner_unknown_penalty`: 1 if ownership is unknown, otherwise 0.

Normalize numeric metrics against the maximum in the analyzed repo set. If max is 0, normalized value is 0.

## Output Format

```yaml
repo_importance:
  - repo_id: payments-service
    score: 87
    rank: 1
    reasons:
      - "High dependency indegree: 8"
      - "Appears in checkout critical flow"
      - "High 90-day churn"
    recommended_depth: risk
```

## User Prompt

Before `risk`, `model`, or `full` across multiple repos:

```text
建议深挖范围:
1. payments-service - score 87 - checkout flow + high churn
2. identity-service - score 73 - auth dependency hub
3. admin-web - score 41 - lower runtime criticality

请选择: all / top-2 / repo names / manifest-only / abort
```

## Rules

- Never exclude a repo from manifest.
- Deep mode may exclude low-priority repos only after the ranking is shown.
- User selection must be recorded in `state.yaml.overrides` or mode history.
- If the user chooses `all`, continue after budget confirmation.

## Fallbacks

| Missing Signal | Fallback |
|---|---|
| git history unavailable | recent_churn = 0, add warning |
| LOC unavailable | estimate by file count |
| dependencies unavailable | use critical flow and entrypoint clues |
| no critical flows found | critical_flow_presence = 0 for all |

## Interpretation

Score is a prioritization aid, not an architecture judgment. A low score means "probably cheaper to skip for this run", not "unimportant forever".
