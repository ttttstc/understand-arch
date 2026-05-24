# Superseding Rules

> ADRs are append-only, but status metadata may record that a newer ADR supersedes an older one.

## Allowed Modification

The only allowed edit to an existing ADR is changing Status metadata to:

```text
superseded-by-NNN
```

Do not rewrite:

- Context
- Decision
- Consequences
- Alternatives
- Evidence

## New ADR Requirements

The new ADR must explain:

- which ADR it supersedes;
- why the old decision no longer holds;
- what changed in business context, constraints, evidence, or org policy;
- migration or compatibility considerations.

## Example

Old ADR:

```markdown
## Status

accepted
```

After superseding:

```markdown
## Status

superseded-by-007
```

New ADR context:

```markdown
This supersedes ADR-003 because partner traffic moved from internal-only to public internet exposure, making the previous direct-service ingress decision incompatible with network boundary NB-PUBLIC-EDGE.
```

## Decision Index

Update `决策与证据索引.yaml`:

```yaml
decisions:
  - adr_id: ADR-003
    status: superseded
  - adr_id: ADR-007
    status: accepted
    supersedes:
      - ADR-003
```

If current schema lacks `supersedes`, keep it in ADR body and use status linkage until schema evolves.

## Invalid Superseding

Reject:

- silently editing old decision text;
- deleting old ADR;
- reusing the old ADR number;
- superseding without an alternative/evidence explanation.
