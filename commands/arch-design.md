---
description: Convert a PRD/change request into a 14-section CR.md with impact and senior review
argument-hint: "<prd-or-request>"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(node:*), Task, Agent, Skill
---

# /arch-design

Use the `Skill` tool for `arch-design` if available; otherwise run `skills/arch-design/SKILL.md`.

Raw request:

```text
$ARGUMENTS
```

Use `arch-frame`, `arch-impact-analyzer`, `arch-solution-designer`, and `arch-review`. CR.md edits must be section-level.
