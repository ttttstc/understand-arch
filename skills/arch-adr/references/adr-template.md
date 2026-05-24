# ADR Template

> One architecture decision per file. ADRs are append-only decision snapshots.

## Filename

```text
ADR-NNN-{kebab-title}.md
```

Example:

```text
ADR-003-payment-channel-migration.md
```

## Template

```markdown
---
adr_id: ADR-<NNN>
status: proposed|accepted|deprecated|superseded-by-<NNN>
date: <YYYY-MM-DD>
generated_by: arch-adr
related_options: <path-or-null>
related_evidence_index: evidence/决策与证据索引.yaml
---

# ADR-<NNN>: <Title>

## Status

<proposed|accepted|deprecated|superseded-by-NNN>

## Date

<YYYY-MM-DD>

## Context

<Why this decision is needed now. Include business driver, architecture constraints, and relevant prior decisions.>

## Decision

<One concise statement of what is decided.>

## Consequences

### Positive

- <benefit>

### Negative

- <cost or trade-off>

### Neutral

- <side effect, operational note, or constraint>

## Alternatives

### <Alternative Name>

- Summary: <what it was>
- Why not chosen: <specific reason>

## Evidence

- Decision index: `evidence/决策与证据索引.yaml#<entry-id>`
- Frame: `<path>`
- Impact: `<path>`
- Options: `<path>`
```

## Required Sections

All sections are mandatory:

- Status
- Date
- Context
- Decision
- Consequences
- Alternatives
- Evidence

Reject ADR generation if any section would be empty.

## Writing Rules

- Decision should fit in 1-3 sentences.
- Consequences must include positive and negative entries.
- Alternatives must include at least one rejected option.
- Evidence must cite YAML or explicit external source.
- Do not edit old ADR body content.

## Independent ADRs

When ADR is invoked without `arch-options`, Evidence may use:

```markdown
- External evidence: <user-provided source>
```

But it must still be explicit. "Team discussion" is insufficient unless accompanied by date, participants/role, and decision context.
