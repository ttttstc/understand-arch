# `arch/` — Per-Project Architecture Workspaces

This directory holds one subdirectory per project that `understand-arch` operates on. Each subdirectory is the **canonical workspace** for that project: evidence yamls, wiki pages, diagrams, ADRs, design docs, audits, briefs, and workflow state all live there.

## Subdirectory layout

```
arch/
├── _template/        Skeleton copied by arch-workflow on first run
├── sample/           Minimal worked example for new users to read
└── {your-project}/   Created on first invocation of /arch:onboard etc.
```

## How a project workspace is born

1. User runs `/arch:onboard` (or any mode) for the first time
2. `arch-workflow` resolves `${ARCH_PROJECT_DIR}` to `arch/{project-name}/`
3. If the dir does not exist, `arch-workflow` copies `_template/` there
4. The atomic skills (`arch-frame`, `arch-analyze`, ...) fill in the stubs
5. On subsequent runs, `arch-workflow` runs an integrity check against `state.yaml` and refuses to operate on a corrupt baseline

## What lives where

| Path | Mutability | Owner |
|---|---|---|
| `state.yaml` | mutable | arch-workflow only |
| `evidence/*.yaml` | mutable, regenerable | arch-frame / arch-analyze |
| `wiki/*.md` | mutable, regenerable | arch-pack |
| `diagrams/` | mutable, regenerable | arch-diagram |
| `adr/` | **append-only** | arch-adr |
| `design-docs/{change}/` | **append-only** | design-mode pipeline |
| `audits/{date}/` | **append-only** | arch-review / arch-pack |
| `briefs/{audience}-{date}/` | **append-only** | arch-pack |
| `overrides/` | append-only audit log | arch-workflow |
| `PM问题清单.md` | mutable | arch-frame (HARD GATE) |
| `.metrics.jsonl` | append-only | every skill |

`append-only` paths must never be edited or deleted by the tool; only the human user does so explicitly via git.

## Why `_template/` is committed

So that:
- A reader of the repo can see the canonical workspace shape without running anything
- `arch-workflow` has a stable source for first-run copy
- Schema changes propagate by updating one place

## Why `sample/` is committed

So that:
- A first-time user can read a real-shaped workspace before running `/arch:onboard`
- The OSS marketplace listing has something concrete to point at in screenshots
- Regression tests can run acceptance loops against a known-good workspace

The sample is **intentionally minimal** (single-repo URL shortener) so that the diff between "what schema requires" and "what real output looks like" is easy to follow. It is not meant to showcase every feature.
