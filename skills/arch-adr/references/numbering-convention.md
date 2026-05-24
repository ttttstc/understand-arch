# Numbering Convention

> ADR numbering is part of the append-only history. Gaps are treated as possible lost decisions.

## Format

```text
ADR-NNN-title.md
```

- `NNN` is zero-padded.
- Start at `001`.
- Increment by 1.
- Title is kebab-case, max 60 characters.

## Next Number Algorithm

1. List files matching `adr/ADR-*.md`.
2. Extract numeric `NNN`.
3. Verify sequence has no gaps.
4. Next number is max + 1, or 001 if no ADR exists.

## Gap Handling

If files are:

```text
ADR-001-initial-boundaries.md
ADR-003-api-gateway.md
```

Stop. Do not create ADR-004 until the gap is resolved.

User choices:

1. Restore missing ADR-002 from git.
2. Explain the intentional gap and record override.
3. Start a new project history if this is a copied directory.

## Conflict Handling

If `ADR-004-title.md` already exists:

- Do not overwrite.
- Recompute next number.
- If duplicate numbers exist with different files, stop and ask for manual repair.

## Title Rules

Convert decision title to kebab-case:

- lowercase ASCII;
- spaces to hyphens;
- remove punctuation;
- trim to 60 characters;
- keep meaningful words.

Examples:

- "Use API Gateway for Partner Traffic" -> `use-api-gateway-for-partner-traffic`
- "Migrate Orders to Event-Driven Flow" -> `migrate-orders-to-event-driven-flow`

## State Sync

After creating an ADR:

- Add decision entry to `evidence/决策与证据索引.yaml`.
- Append completed phase to `state.yaml`.
- Append metrics entry.

If decision index update fails, keep the ADR file and mark workflow blocked for index repair. Do not delete the ADR.
