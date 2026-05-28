---
description: Audit understand-arch baseline freshness, projection, and review readiness
argument-hint: "[arch-project-dir] [--full]"
allowed-tools: Read, Write, Glob, Grep, Bash(node:*), Bash(git:*), Task, Agent, Skill
---

# /arch-audit

Use the `Skill` tool for `arch-audit` if available; otherwise run `skills/arch-audit/SKILL.md`.

Raw arguments:

```text
$ARGUMENTS
```

Use deterministic tools first, then dispatch `arch-senior-reviewer` in audit mode.
