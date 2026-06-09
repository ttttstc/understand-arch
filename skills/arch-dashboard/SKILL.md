---
name: arch-dashboard
description: Launch the interactive web dashboard to visualize understand-arch code graphs and architecture layers
argument-hint: "arch-project-dir"
---

# /arch-dashboard

Launch the forked dashboard against the v3 project output tree.

## Inputs

- `ARCH_PROJECT_ROOT` or first argument: `.understand-arch/<project>`.
- `ARCH_REPO_ID` or second argument: repo id to show by default.

If repo id is omitted, read `specs/repos.json` and choose the first repo.

## Preflight

Verify:

- `specs/repos.json` exists.
- `specs/repos/<repo_id>/knowledge-graph.json` exists.
- `specs/arch-layer.json` exists.
- `dashboard/package.json` exists in the plugin root.
- `engine/core/dist/index.js` exists; if not, build core.

## Launch

```bash
cd <PLUGIN_ROOT>
pnpm --filter @understand-arch/core build
cd dashboard
ARCH_PROJECT_DIR="<ARCH_PROJECT_ROOT>" ARCH_REPO_ID="<repo_id>" pnpm dev
```

The dashboard serves:

- `/knowledge-graph.json` from `specs/repos/<repo_id>/knowledge-graph.json`
- `/arch-layer.json` from `specs/arch-layer.json`
- `/domain-graph.json` when present
- `/config.json` from project config when present

## Required Views

- Structural graph view inherited from UA dashboard.
- Domain graph view when a domain graph exists.
- Architecture layer view showing counts and cards for:
  - capabilities
  - quality attributes
  - risks
  - technical debt
  - cross edges
  - ADRs

## Success Report

Tell the user:

- local URL
- repo id being viewed
- whether arch-layer loaded
- whether dashboard is using token protection

## Failure Rules

- If graph is missing, ask user to run `/arch-onboard`.
- If arch-layer is missing, ask user to run `arch-enrich`.
- Do not synthesize dashboard data.
