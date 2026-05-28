---
description: Launch the understand-arch dashboard for graph plus architecture-layer views
argument-hint: "[arch-project-dir] [repo-id]"
allowed-tools: Bash(node:*), Bash(pnpm:*), Bash(npm:*), Bash(git:*), Read, Glob, Grep, Skill
---

# /arch-dashboard

Run the `arch-dashboard` skill as the user-facing dashboard entrypoint.

Raw arguments:

```text
$ARGUMENTS
```

Execution rules:

1. Resolve the plugin root from `CLAUDE_PLUGIN_ROOT`.
2. Resolve the target `.understand-arch/<project>` directory from `$ARGUMENTS` or the current workspace.
3. Resolve the repo id from `$ARGUMENTS` or `specs/repos.json`.
4. Use the `Skill` tool for `arch-dashboard` if available; otherwise follow `skills/arch-dashboard/SKILL.md` exactly.
5. Start the dashboard with `ARCH_PROJECT_DIR=<arch-project-dir>` and `ARCH_REPO_ID=<repo-id>`.
6. Report the localhost URL printed by Vite.

Do not synthesize dashboard data. If graph or arch-layer outputs are missing, tell the user which upstream command to run.
