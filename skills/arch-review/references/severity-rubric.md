# Severity Rubric

> Severity decides readiness. Use the lowest severity that honestly communicates risk.

## Error

Blocks readiness.

Use when:

- security or compliance redline is violated;
- data loss or destructive migration risk is unaddressed;
- rollback is impossible and unstated;
- accepted ADR is contradicted;
- design mode required artifact is missing;
- evidence is absent for a key decision.

## Warning

Does not block by default but produces degraded readiness.

Use when:

- mitigation exists but is incomplete;
- KB is missing or partially loaded;
- naming or documentation inconsistency affects maintainability;
- parser support is degraded;
- a risk is plausible but not fully proven.

## Info

No readiness impact.

Use for:

- clarity improvements;
- optional diagram/readability suggestions;
- future consideration;
- non-blocking optimization.

## Sorting

Sort findings by:

1. error before warning before info;
2. compliance/security/data before maintainability;
3. broader blast radius before local issues;
4. evidence confidence.

## Suggested Fix Boundary

Suggested fixes are descriptive. Do not provide source code patches, DDL, IaC, CI YAML, or generated clients.
