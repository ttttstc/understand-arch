---
description: Onboard a project and produce code graphs, arch-layer, wiki, and dashboard inputs
argument-hint: "[project-name] [--repo <path>]... [--enable-hooks]"
allowed-tools: Read, Write, Edit, Glob, Grep, Bash(node:*), Bash(pnpm:*), Bash(git:*), Task, Agent, Skill
---

# /arch-onboard

Use the `Skill` tool for `arch-onboard` if available; otherwise run `skills/arch-onboard/SKILL.md`.

Raw arguments:

```text
$ARGUMENTS
```

This command must dispatch `/arch-analyze` for each repo, then `arch-enrich`, then `arch-wiki`. LLM semantic phases must run through Claude Code subagents, never through Node/Python scripts.
