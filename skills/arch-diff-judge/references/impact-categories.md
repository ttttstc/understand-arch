# Impact Categories

> `影响面.yaml` must cover all seven dimensions. Empty dimensions are represented by explicit `no_impact` entries with reasons.

## Services

Use for deployable/runtime units.

Required fields:

- `id`
- `change_type`: `add|modify|deprecate|drop|no_impact`
- `owner`
- `evidence_refs`

Heuristics:

- Mark `modify` when service owns affected API, data, or critical flow step.
- Mark `add` only when no existing service owns the capability.
- Mark `deprecate` only when a service is being phased out.

## Modules

Use for code modules, packages, libraries, or bounded-context internals.

Required fields:

- `id`
- `change_type`
- `dep_impact`
- `evidence_refs`

`dep_impact` should explain new, removed, or changed dependencies.

## APIs

Use for HTTP, RPC, GraphQL, CLI, public SDK, or internal contracts.

Required fields:

- `id`
- `change_type`
- `contract_change`
- `compat_strategy`
- `evidence_refs`

Compatibility strategies:

- backward-compatible additive;
- versioned endpoint;
- feature flag;
- dual-read/write;
- breaking change with migration window;
- no impact with reason.

## Data Models

Use for tables, documents, event stores, vector stores, indexes, or persisted memory.

Required fields:

- `id`
- `change_type`
- `fields`
- `migration_strategy`
- `backfill_plan`
- `compat_strategy`
- `rollback`
- `evidence_refs`

No data change still needs:

```yaml
change_type: no_impact
migration_strategy: "No persisted model affected; request only changes read path."
rollback: "Revert application routing."
```

## Events and Messages

Use for Kafka topics, queues, pub/sub, webhooks, domain events, and agent tool events.

Required fields:

- `id`
- `change_type`
- `schema_change`
- `compat`
- `evidence_refs`

Look for producer/consumer pairs. A producer-only view is incomplete.

## Permissions

Use for authz, roles, scopes, tenants, audit, secrets, and identity boundaries.

Required fields:

- `id`
- `change_type`
- `audit_impact`
- `evidence_refs`

If permissions are not mentioned but the change touches user data, add a warning or impact item.

## Deployments

Use for deployable units, release order, environment config, migration order, and rollback order.

Required fields:

- `unit_id`
- `change_type`
- `release_order`
- `evidence_refs`

Deployment impact should identify order dependencies, not generate CI/pipeline files.

## Configs

Use for feature flags, environment variables, runtime config, secrets, prompts, and model/provider settings.

Required fields:

- `id`
- `change_type`
- `rollback`
- `evidence_refs`

LLM apps: prompt changes and model/provider switches count as config impact.

## No-Impact Entries

When a dimension has no impact, add a single entry:

```yaml
- id: no-api-impact
  change_type: no_impact
  contract_change: "No external or internal API contract changes."
  compat_strategy: "Not applicable."
  reason: "Change is limited to background reconciliation job."
  evidence_refs: [...]
```

This prevents downstream options from assuming an omitted dimension was forgotten.
