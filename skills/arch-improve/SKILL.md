---
name: arch-improve
description: Find architecture improvement opportunities and draft an improvement RFC candidate without changing code.
argument-hint: ["[focus-area]"]
---

# /arch-improve

Use this when the user asks:

- "这个项目哪里架构不好?"
- "哪里值得重构?"
- "哪个模块应该拆或合?"
- "帮我找 deep module 机会。"
- "给我一份架构改进建议。"

This command does not modify application code and does not automatically create CR.md. It produces an improvement candidate that a human can choose to turn into `/arch-design`.

## Inputs

- Current `.understand-arch/<project>/specs/repos.json`.
- Per-repo knowledge graphs.
- `specs/arch-layer.json`.
- `rules/project-language.md` when present.
- `rules/*.md` and `rules/constraints/*.md`.
- ADRs.
- Historical CRs.
- `rules/constraints/suspicious-findings.md`.
- `rules/constraints/coding-conventions.md`.

If no baseline exists, ask the user to run `/arch-onboard` first.

## Output

Create:

```text
.understand-arch/<project>/improvements/IMPROVE-YYYY-NNN-<slug>.md
```

The Markdown must use this structure:

```markdown
# 架构改进候选:{标题}

## 1. 问题
## 2. 证据
## 3. 架构摩擦
## 4. 改进方案
## 5. 替代方案
## 6. 风险与收益
## 7. 建议切片
## 8. 是否建议转 CR
```

## Workflow

1. Resolve `ARCH_PROJECT_ROOT`.
2. Read graph, arch-layer, rules, constraints, ADRs, historical CRs, suspicious findings, coding conventions, and project language.
3. Dispatch `arch-improvement-analyzer`.
4. Write the returned Markdown into `improvements/IMPROVE-YYYY-NNN-<slug>.md`.
5. Report the file path and whether it recommends turning into `/arch-design`.

## Dispatch Template

```text
Mode: architecture improvement candidate.
Focus area: <user focus or whole project>
Read graph, arch-layer, rules, project-language, constraints, ADRs, historical CRs, suspicious-findings, and coding-conventions.
Produce one improvement RFC candidate in Markdown.
Do not propose cosmetic refactors.
Do not propose framework replacement unless evidence is overwhelming.
Do not modify code.
All user-facing prose must be Chinese.
```

## Failure Rules

- Missing graph or arch-layer: stop and ask the user to run `/arch-onboard`.
- Weak evidence: output an investigation recommendation instead of a confident improvement.
- Do not auto-create CR.md.
- Do not auto-create ADR.
- Do not edit source code.

