# Change Request Parsing

> `arch-diff-judge` only runs when there is a concrete change request. If the request is vague, return to `arch-frame`.

## Accepted Sources

- `项目总览.yaml.design_intent`
- explicit `--change="<text>"`
- PRD excerpt already parsed by `arch-frame`
- issue text pasted by user

## Minimum Required Shape

```yaml
change_request:
  source: evidence/项目总览.yaml#design_intent
  summary: "Add tenant-scoped historical order search."
  business_goal: "Reduce support tickets for order lookup."
  in_scope:
    - "Search last 90 days of orders."
  non_goals:
    - "Do not migrate archived orders."
  acceptance_criteria:
    - "p95 search latency < 800ms for 90-day range."
```

If `summary`, `in_scope`, or `acceptance_criteria` are missing, route to `arch-frame`.

## Reject Conditions

Reject and ask for `arch-frame` when:

- The request is only an outcome: "make it faster", "improve reliability".
- The affected capability is unnamed.
- Scope and non-goals are absent.
- There is no acceptance criterion.
- The user asks to implement code, DDL, IaC, CI, client generation, or service scaffolding.

## Parsing Rules

Extract:

- user-visible capability;
- data touched;
- APIs or contracts likely touched;
- permissions or tenant/security boundary;
- rollout and compatibility hints;
- explicit non-goals;
- unknowns that remain assumptions.

Do not choose a solution. Impact analysis identifies what may move, not how it should be built.

## Fallback

If direct change text is acceptable but incomplete, create a small clarification list and return:

```yaml
readiness: blocked
reason: change_request_too_vague
recommended_next_skill: arch-frame
questions:
  - "Which user flow changes?"
  - "What must remain compatible?"
```
