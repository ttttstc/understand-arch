---
name: arch-design
description: Turn a PRD or change request into a 14-section CR.md with impact analysis and senior architect review.
argument-hint: ["<prd-or-request>"]
---

# /arch-design

Use this when the user asks for implementation design, PRD review, impact analysis, or a change request.

## Inputs

- User request or PRD text.
- Current `.understand-arch/<project>/specs/repos.json`.
- Per-repo code graphs.
- `specs/arch-layer.json`.
- `rules/*.md`, ADRs, and existing CRs.

If no baseline exists, ask the user to run `/arch-onboard` first unless they explicitly want a draft without evidence.

## CR Location

Create or update:

```text
.understand-arch/<project>/change-requests/CR-YYYY-NNN-<slug>/CR.md
```

Use `engine/arch/cr-md-editor.mjs` for section-level edits. Never overwrite a whole CR.md once it exists.

## Required CR Headings

The CR must contain exactly:

1. `## 1. 背景`
2. `## 2. 现状`
3. `## 3. 方案概述`
4. `## 4. 详细设计`
5. `## 5. 替代方案`
6. `## 6. NFR`
7. `## 7. 风险`
8. `## 8. 改动清单`
9. `## 9. 实施步骤`
10. `## 10. 回滚`
11. `## 11. 测试`
12. `## 12. 待定`
13. `## 13. 关联`
14. `## 14. Review`

## Workflow

1. Dispatch `arch-frame`.
2. If `blocking_unknown_count >= 3`, stop and ask the user. Do not invent answers.
3. Dispatch `arch-impact-analyzer`.
4. Use `cr-md-editor.mjs` to create the CR skeleton.
5. Dispatch `arch-solution-designer`.
6. Write sections 1-7 and 9-13 with `cr-md-editor.mjs`.
7. Write section 8 from the impact analyzer, preserving two groups:
   - core impacted set
   - adjacent review set
8. Dispatch `arch-review`.
9. Append findings only to section 14.
10. If review rejects, rerun the specific failed analyzer once using retry hints.

## arch-frame Dispatch

```text
Mode: PRD hard gate.
Request: <user PRD/request>
Read available graph, arch-layer, rules, ADRs, and CRs.
Return JSON only:
{
  "problem_statement": "...",
  "goals": [],
  "non_goals": [],
  "constraints": [],
  "affected_users": [],
  "open_questions": [],
  "blocking_unknown_count": 0,
  "assumptions": []
}
```

## arch-impact-analyzer Dispatch

```text
Mode: CR impact analysis.
Input PRD: <request>
Use code graph, arch-layer, rules, ADRs, and existing CRs.
Return JSON only.
Separate exact graph hits from adjacent review candidates.
Do not put weak text matches into the core impacted set.
Every item needs confidence and evidence_refs.
```

## arch-solution-designer Dispatch

```text
Mode: CR solution design.
Input PRD, frame JSON, impact JSON, graph evidence, rules, ADRs, and arch-layer.
Draft CR.md sections 1-7 and 9-13.
Do not write section 14.
Use concrete implementation steps and rollback/test plans.
Reject placeholder prose.
Return JSON mapping section numbers to markdown content.
```

## Success Criteria

- CR.md has exactly the 14 headings.
- Section 8 has core and adjacent groups.
- Section 14 contains senior review output.
- No placeholder text remains.
- `arch-senior-reviewer` verdict is approve or conditional.

## Failure Rules

- Three or more blocking unknowns: stop.
- Missing baseline: stop unless draft mode is explicit.
- Review reject after one retry: leave CR.md marked draft and report findings.
