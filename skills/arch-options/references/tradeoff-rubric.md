# Tradeoff Rubric

> Every option must fill the four forced columns: impact scope, module dependency changes, data model changes, rollback strategy.

## Column 1: Impact Scope

Must answer:

- Which services change?
- Which modules change?
- Which APIs/contracts change?
- Which data, permissions, deploy units, configs change?
- Which impact items are intentionally no-impact?

Minimum evidence:

- Link to `影响面.yaml` affected entries.

Reject if:

- Uses vague terms like "backend changes".
- Omits a dimension that `影响面.yaml` says is affected.

## Column 2: Module Dependency Changes

Must answer:

- New dependencies.
- Removed dependencies.
- Changed dependency direction.
- Risk of cross-layer calls or cycles.
- Whether dependency change aligns with current architecture boundaries.

Minimum evidence:

- `依赖与链路图谱.yaml` node/edge IDs.
- `仓库与组件清单.yaml` component IDs.

Reject if:

- It says "minimal changes" without naming dependencies.
- It adds a shared module or direct call without explaining coupling.

## Column 3: Data Model Changes

Must answer:

- Tables/documents/events/indexes/memory affected.
- Migration and backfill.
- Compatibility strategy.
- Data ownership.
- Reversibility.

Minimum evidence:

- `影响面.yaml.affected.data_models`.

Reject if:

- Data model is "TBD".
- Backfill is "run migration".
- Rollback ignores data state.

## Column 4: Rollback Strategy

Must answer:

- Code rollback.
- Config/feature flag rollback.
- Data rollback or forward-only mitigation.
- Deployment order rollback.
- User-visible compatibility.

Minimum evidence:

- Impact entries for deployments/configs/data.

Reject if:

- "Rollback by reverting PR."
- Data or event changes are not addressed.
- No trigger for rollback is described.

## Scoring

Optional score per option:

| Score | Meaning |
|---|---|
| 5 | strong, evidence-backed, low ambiguity |
| 4 | workable with minor open questions |
| 3 | workable but meaningful risks remain |
| 2 | high uncertainty or rollback weakness |
| 1 | should not choose without major changes |

Do not average scores blindly. A critical org KB violation can override a high technical score.

## Recommendation Rules

Recommendation must include:

- why this option best fits design intent;
- what it costs;
- what must be true for it to remain valid;
- why alternatives are not chosen.

If every option violates KB, do not recommend any option. Return to workflow for user/PM decision.
