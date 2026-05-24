# Scope Boundary Rubric

> Scope boundary is the anti-scope-creep contract for design mode.

## Required Fields

```yaml
scope_boundary:
  must_change: []
  may_change: []
  should_not_change: []
```

All three arrays must exist. Empty arrays are allowed only with an explanation elsewhere in the impact entry.

## Must Change

Include items that are necessary for the change to satisfy acceptance criteria.

Examples:

- API endpoint that exposes the new capability.
- Service that owns the affected business rule.
- Data model that must store new state.
- Feature flag needed for safe rollout.

Evidence should point to baseline owner, dependency edge, PRD requirement, or code location.

## May Change

Include items that might change depending on selected option.

Examples:

- Existing shared module that could be reused or bypassed.
- Optional cache layer.
- Internal event schema if async option is chosen.
- Observability dashboard.

Downstream `arch-options` should decide whether these move.

## Should Not Change

Include explicit boundaries that prevent solution sprawl.

Examples:

- External API path must stay stable.
- Existing billing rules must not change.
- Historical data older than 90 days must not be migrated.
- Identity provider must remain unchanged.

Source should come from `design_intent.non_goals`, org KB, or user clarification.

## Quality Checks

- Every `must_change` item appears in affected dimensions.
- Every `should_not_change` item maps to non-goals or constraints.
- `may_change` items are not required for acceptance criteria.
- No item appears in more than one category.

## Bad Boundaries

Reject:

- `must_change: [backend]`
- `may_change: [some services]`
- `should_not_change: [anything unrelated]`

Use concrete IDs from manifest/dependency graph whenever possible.
