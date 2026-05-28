---
name: arch-dashboard
description: Launch the understand-arch dashboard for code graph plus architecture layer views.
argument-hint: ["[project-path]"]
---

# /arch-dashboard

Build core if needed, then start the forked dashboard:

```bash
pnpm --filter @understand-arch/core build
cd <PLUGIN_ROOT>/dashboard
ARCH_PROJECT_DIR=<arch-project-dir> ARCH_REPO_ID=<repo-id> pnpm dev
```

The dashboard reads `specs/repos/<repo-id>/knowledge-graph.json` and `specs/arch-layer.json` from the same project output tree. If you already have a flat directory with both files, set `GRAPH_DIR=<that-dir>` instead.
