# `sample/` — Worked Example: `shortlink-svc`

A deliberately tiny worked workspace so new users can read what an `understand-arch` output looks like without running anything.

## The sample system

`shortlink-svc` — a fictional single-repo URL shortener:
- HTTP API (Go)
- Postgres for url table
- Redis for hot-key cache
- Background worker for click aggregation

Chosen because it is small enough to fit on one screen yet has real concerns (cache invalidation, click metric loss, abuse).

## Scope of this sample

This sample shows **onboard mode output only**. It does not include:
- `design-docs/` (would require a concrete change request)
- `audits/` (would require an audit run)
- `briefs/` (would require an audience)

These are intentionally absent so the sample stays small and the diff with `_template/` highlights what `onboard` actually adds.

## What to look at first

1. [`evidence/项目总览.yaml`](evidence/项目总览.yaml) — the root contract; every claim back-links here
2. [`wiki/首页.md`](wiki/首页.md) — entry point for a human reader
3. [`evidence/依赖与链路图谱.yaml`](evidence/依赖与链路图谱.yaml) — `signup-redirect-click` business flow definition
4. [`diagrams/container.mmd`](diagrams/container.mmd) — generated from the dependency graph

## What's missing (vs full v1.0)

- No `.metrics.jsonl` (would only be populated by a real run)
- No `overrides/` (no overrides were exercised)
- Evidence yamls are populated for the happy path; edge cases are documented as open questions instead of inline risks, to keep the sample compact.
