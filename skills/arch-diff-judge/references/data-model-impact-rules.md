# Data Model Impact Rules

> Data impact is high-risk in design mode. Treat missing migration, backfill, compatibility, or rollback as incomplete.

## What Counts as Data Model

- SQL tables, columns, indexes, constraints.
- NoSQL documents and collection shapes.
- Event schemas.
- Search indexes.
- Vector indexes and embeddings metadata.
- Agent memory schemas.
- Files or object storage layouts when persisted.

## Required Fields

Each data model impact entry must include:

- `id`
- `change_type`
- `fields`
- `migration_strategy`
- `backfill_plan`
- `compat_strategy`
- `rollback`
- `evidence_refs`

## Change Types

| Type | Meaning |
|---|---|
| add | new persisted model or field |
| modify | compatible or incompatible shape change |
| drop | removal of persisted model or field |
| deprecate | stop writing/reading but keep for compatibility |
| no_impact | no persisted data affected |

## Migration Strategy

Describe the transition, not DDL.

Allowed:

- "Add nullable field; write new value after feature flag; backfill asynchronously."
- "Introduce v2 event schema and dual-publish during compatibility window."

Forbidden:

- SQL DDL scripts.
- ORM migration code.
- Generated database clients.

## Backfill Plan

Use null only when no historical data needs mutation.

Good:

- "Backfill last 90 days from order_events; verify counts before read switch."

Bad:

- "Run migration."

## Compatibility Strategy

Address old readers/writers:

- additive backward-compatible field;
- dual-read;
- dual-write;
- versioned event;
- read-repair;
- compatibility window;
- not applicable with reason.

## Rollback

Rollback must mention data state:

- Can old code ignore new field?
- Can feature flag stop writes?
- Is backfill reversible?
- Is data migration destructive?

If rollback is impossible, say so and provide mitigation:

```yaml
rollback: "Cannot remove emitted v2 events from downstream consumers; mitigation is to keep v1 dual-publish for 30 days and disable v2 consumers."
```

## Evidence

Use evidence from:

- model/entity definitions;
- migration directories;
- schema files;
- event contract files;
- dependency graph data ownership;
- PRD acceptance criteria.

Never infer table ownership without evidence. Mark unknown and route to user if it affects architecture.
