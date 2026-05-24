# Org Conformance Check

> Review must check loaded enterprise KB constraints. Missing KB is a degradation; invalid KB should have blocked in `arch-frame`.

## Categories

- banned patterns
- compliance redlines
- network boundaries
- naming conventions
- tech radar

## Finding Severity

| KB Category | Default Severity |
|---|---|
| compliance redline | error |
| critical banned pattern | error |
| high banned pattern | error or warning based on blast radius |
| network boundary violation | error |
| deprecated tech radar item | warning or error |
| naming convention | warning |

## Finding Text

Must include:

- rule ID;
- observed violation;
- location;
- consequence;
- suggested descriptive fix.

## Missing KB

If all KB categories are `not_configured`:

```yaml
readiness: degraded
finding:
  severity: warning
  category: conformance
  description: "Org KB not configured; conformance checks skipped."
```

If only some categories are missing, list skipped categories in the review footer.
