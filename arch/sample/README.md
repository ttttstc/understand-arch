# `sample/` — Worked Example: `shortlink-svc`

A deliberately tiny worked workspace so new users can read what an `understand-arch` output looks like without running anything.

## The sample system

`shortlink-svc` — a fictional single-repo URL shortener (Go HTTP API + Postgres + Redis + background click aggregator). Tiny enough to fit on one screen yet has real architecture concerns (Redis SPOF, click event loss, abuse rules).

## Scope

This sample shows **onboard mode output only**. It does **not** include:
- `user/设计变更/` (would require a concrete change request)
- `user/审计/` (would require an audit run)
- `user/汇报/` (would require an audience pick)

These are intentionally absent so the sample stays small and the diff with `_template/` highlights what `onboard` actually adds.

## Read order

1. [`user/README.md`](user/README.md) — the entry hub a human starts at
2. [`user/知识库/首页.md`](user/知识库/首页.md) — the wiki TL;DR
3. [`agent/证据/项目总览.yaml`](agent/证据/项目总览.yaml) — the root contract every assertion back-links to
4. [`agent/证据/依赖与链路图谱.yaml`](agent/证据/依赖与链路图谱.yaml) — business flow definitions
5. [`user/架构图/container.mmd`](user/架构图/container.mmd) — generated from the dep graph

## What's missing vs full v1.0

- No `agent/指标.jsonl` (would only populate at real runtime)
- No `agent/覆盖记录/` (no overrides exercised)
- Risk severity / wiki content held minimal to keep diffable
