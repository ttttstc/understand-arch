# Drift Detection

## Purpose

Drift detection decides whether the stored architecture baseline is fresh enough to support wiki rendering, impact analysis and design review.
It is a confidence gate, not a graph writer.

## Freshness States

- `fresh`: fingerprints match and no override is active.
- `stale`: manifest, import graph, schema, infra, entrypoint or cross-repo reference changed.
- `possibly_stale`: ordinary code changed and the affected nodes should be checked before design decisions.
- `unknown`: fingerprint or repo data is missing.
- `degraded`: the user recorded an override or the last refresh failed.

## Evidence Sources

- `repos.yaml` repo definitions.
- Per-repo `.fingerprint.json`.
- Current VCS HEAD and changed file list.
- Stored `scan_meta`.
- `state.yaml.overrides[]`.
- Existing repo graph and cross-repo graph.

## Decision Table

| Signal | State | Recommended action |
| --- | --- | --- |
| All hashes match | fresh | Continue |
| Manifest or lockfile changed | stale | Targeted refresh repo |
| Import map changed | stale | Refresh affected batches and assemble |
| API/schema/infra changed | stale | Refresh repo and cross-repo |
| Only local implementation changed | possibly_stale | Show affected nodes and ask user |
| Fingerprint missing | unknown | Repair suggestion or full onboard |
| Override active | degraded | Show override history before continuing |

## User Choices

When the state is not fresh, present three Chinese choices:

1. 刷新 graph。
2. 查看漂移详情。
3. 记录 override 后继续。

Override reasons must be at least 20 characters and must be appended to `state.yaml.overrides[]`.

## Forbidden Behavior

- Do not rewrite graph from audit mode.
- Do not silently continue on stale graph.
- Do not call stale data fresh because the sample is small.
- Do not drop override history.
- Do not modify CR.md, ADR or wiki.
