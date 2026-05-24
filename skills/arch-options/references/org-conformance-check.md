# Org Conformance Check

> Options must be checked against `项目总览.yaml.org_constraints`. The model must not quietly waive enterprise constraints because an option looks convenient.

## Inputs

- `org_constraints.banned_patterns`
- `org_constraints.compliance_redlines`
- `org_constraints.network_boundaries`
- `org_constraints.naming_conventions`
- `org_constraints.tech_radar`

Each category may be:

- `not_configured`
- `not_loaded`
- array of loaded rules

## Status Handling

| Status | Behavior |
|---|---|
| `not_configured` | Mark conformance `degraded`; continue |
| `not_loaded` | Mark category `not_checked`; continue unless user requires strict mode |
| loaded array | Check each option |

## Violation Format

```yaml
violations:
  - rule_id: BP-DIRECT-DB
    severity: high
    option_id: option-a
    reason: "Option A reads inventory database directly from checkout-service."
    evidence_refs:
      - file: design-docs/change/影响面.yaml
        line: 20
        commit: external
```

## Severity Behavior

| Severity | Behavior |
|---|---|
| critical | option is blocked unless explicit user override |
| high | option is not recommended; escalation required |
| medium | option may proceed with mitigation |
| low | note in tradeoff |

Compliance redlines are treated as at least high unless the KB says otherwise.

## Tech Radar Rules

| Radar Status | Behavior |
|---|---|
| adopt/approved | allowed |
| trial/experimental | allowed with review note |
| assess | require explicit evaluation task |
| hold | not recommended |
| deprecated | violation |

## Network Boundary Rules

Check:

- source/target zones;
- direction;
- protocols;
- approval requirements;
- new external calls.

If the option introduces a new boundary crossing and approval is required, mark it as a condition of recommendation.

## Naming Rules

Naming violations are usually warnings, but can block when:

- the name is part of public API;
- the name affects tenant/security boundary;
- org KB marks severity high.

## Escalation

If all options are blocked:

```yaml
readiness: blocked
reason: all_options_violate_org_constraints
next_step: "Return to arch-frame for scope/constraint decision or record explicit override."
```

Do not manufacture a compliant option unless it follows from the evidence.
