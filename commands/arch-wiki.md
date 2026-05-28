---
description: Render and review the 14-page architecture wiki
argument-hint: "[audience=cto|newcomer|pm|architect] [arch-project-dir]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(node:*), Task, Agent, Skill
---

# /arch-wiki

Use the `Skill` tool for `arch-wiki` if available; otherwise run `skills/arch-wiki/SKILL.md`.

Raw arguments:

```text
$ARGUMENTS
```

Render all 14 wiki pages plus README, run projection checks, then dispatch `wiki-reviewer`.
