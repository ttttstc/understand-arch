---
description: Generate evidence-grounded Mermaid architecture diagrams
argument-hint: "[c4|context|container|component|flow|risk] [arch-project-dir]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(node:*), Task, Agent, Skill
---

# /arch-diagram

Use the `Skill` tool for `arch-diagram` if available; otherwise run `skills/arch-diagram/SKILL.md`.

Raw arguments:

```text
$ARGUMENTS
```

Use graph and arch-layer evidence only. Write Mermaid projections into wiki or the requested artifact.
