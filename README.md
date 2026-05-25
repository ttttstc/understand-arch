# understand-arch

> A Docs-as-Code architecture knowledge suite for Claude Code.

[中文](./README.zh.md) | [Spec](./docs/spec-v1.0.md) | [Contributing](./CONTRIBUTING.md)

## What it is

`understand-arch` keeps a project's architecture baseline in versioned assets that both humans and agents can trust.

It is centered on:

- `specs/` as the stable architecture baseline
- `change-requests/CR-*` as single-change delta packs
- `decisions/` as append-only ADR history
- `generated/` as human-facing views that can be regenerated

## Public workflow

v1.0 exposes four user-facing entries:

- `/arch:onboard` — build or refresh `specs/`
- `/arch:design` — create a CR and design one change against the current baseline
- `/arch:audit` — review baseline completeness and freshness, and optionally run drift audit
- `/arch:brief` — generate a human-readable wiki/brief/report from trusted source artifacts

## Outputs

```text
arch/{project}/
├── specs/
├── decisions/
├── change-requests/
├── generated/
├── state.yaml
└── .metrics.jsonl
```

## Boundaries

Allowed artifacts:

- `*.md`
- `*.yaml`
- `*.mmd`
- `*.svg|*.png`

Forbidden outputs:

- IaC
- DDL / migrations
- CI workflows
- service scaffolds
- source code

## Status

v0.2.x is being migrated from the older deliverable-heavy model to the new `specs + CR + governance` model. See [docs/spec-v1.0.md](./docs/spec-v1.0.md) for the canonical target state.
