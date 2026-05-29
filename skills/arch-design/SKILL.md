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
- `rules/*.md`(规范层), `rules/constraints/*.md`(约束层:confirmed 硬约束 / proposed 软提示), ADRs, and existing CRs.

If no baseline exists, ask the user to run `/arch-onboard` first unless they explicitly want a draft without evidence.

## 约束消费(v3.1,贯穿全流程)

design 必须读 `rules/`(规范层)+ `rules/constraints/`(约束层)并应用:

| 来源 | 状态 | design 对待 |
|---|---|---|
| 规范层 `rules/*.md` | 权威 | 硬约束,违反 = senior blocker |
| 约束层 `constraints/*.md` | confirmed | 硬约束,违反 = senior blocker |
| 约束层 `constraints/*.md` | proposed | 软阻塞:方案触碰时提示"建议先 /arch-interview 或人工确认该约束再继续",用户可 override(override 记入 CR § 4.6 + 第 14 段) |
| 约束层 | rejected | 忽略 |

核心:**confirmed/规范层拦截,proposed 提醒**。

CR 语言与文档风格(v3.1):CR.md 全中文(代码标识符/命令保留英文,不中英混杂),写成业界标准设计交付文档(Tech Spec/RFC)风格 —— 工程语言、详细设计具体到研发可照做、自包含、无工具元叙述。

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

1. 读 `rules/` + `rules/constraints/`,建立本次 design 适用的约束集(规范层 + confirmed + proposed)。
2. Dispatch `arch-frame`.
3. If `blocking_unknown_count >= 3`, stop and ask the user. Do not invent answers.
4. Dispatch `arch-impact-analyzer`(交叉比对约束:受影响节点是否落在某约束管辖范围,踩到的标注)。
5. 若影响面触碰 proposed 约束 → 提示用户先确认该约束(软阻塞),用户可 override。
6. Use `cr-md-editor.mjs` to create the CR skeleton.
7. Dispatch `arch-solution-designer`(先读相关约束作为设计护栏,主动遵守)。
8. Write sections 1-7 and 9-13 with `cr-md-editor.mjs`。**§ 4 详细设计必须含子节「### 4.6 约束符合性」**(见下)。
9. Write section 8 from the impact analyzer, preserving two groups:
   - core impacted set
   - adjacent review set
10. Dispatch `arch-review`(约束验收:违反 confirmed/规范层 → blocker;触碰 proposed 未 override → major finding)。
11. Append findings only to section 14.
12. If review rejects, rerun the specific failed analyzer once using retry hints.

## § 4.6 约束符合性(并入「4. 详细设计」,v3.1)

CR § 4 详细设计末尾必须有子节 `### 4.6 约束符合性`,列出本方案触及的所有约束:

```markdown
### 4.6 约束符合性
| 相关约束 | 来源 | 状态 | 本方案 | 违反检测 |
|---|---|---|---|---|
| Invoice issued 后金额不可变 | 约束层 | 已确认 | 遵守:只改 status 不碰 amount | `pnpm test contract:invoice` |
| billing-core 不依赖 payment-adapter | 规范层 | 权威 | 遵守:走 event | `depcruise ... billing-core` |
| legacy_response 不可删 | 约束层 | 待定(proposed) | 触碰:方案需删 → 已 override(理由 X) | — |
```

- 列规范层 + confirmed + proposed 中与受影响节点相关的约束
- 每条:遵守 / 触碰说明 + violation_check 命令(研发实施后可手动验证)
- proposed 被 override 的,记录 override 理由(同时进第 14 段留档)
- 此子节是 senior-review 必查项

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
Use code graph, arch-layer, rules, rules/constraints, ADRs, and existing CRs.
Return JSON only.
Separate exact graph hits from adjacent review candidates.
Do not put weak text matches into the core impacted set.
Cross-check each impacted node against constraints (规范层 + confirmed + proposed):
return a `constraint_hits` list — { constraint_id, source, status, impacted_node, note }.
Flag any touched proposed constraint as needs-confirmation.
Every item needs confidence and evidence_refs.
All Chinese output; no English/Chinese mixing in one sentence.
```

## arch-solution-designer Dispatch

```text
Mode: CR solution design.
Input PRD, frame JSON, impact JSON, constraint_hits, graph evidence, rules, rules/constraints, ADRs, and arch-layer.
First read all relevant constraints as design guardrails and design to comply.
Draft CR.md sections 1-7 and 9-13.
Section 4 must end with subsection "### 4.6 约束符合性" listing every touched constraint
(source, status, how the design complies or override reason, violation_check command).
Do not write section 14.
Use concrete implementation steps and rollback/test plans — write like a standard Tech Spec a senior dev can implement directly.
All Chinese; keep code identifiers/commands in English; no mixing in one sentence.
Reject placeholder prose. No tool/scan/phase/analyzer meta narrative.
Return JSON mapping section numbers to markdown content.
```

## arch-review / arch-senior-reviewer Dispatch(约束验收)

```text
Mode: CR review (v3.1 constraint-aware).
Review CR.md including § 4.6 约束符合性.
Blocker if the design violates any confirmed constraint or 规范层 rule.
Major finding if it touches a proposed constraint without override + reason.
Verify every constraint in § 4.6 carries a violation_check (command or detection method).
Verify CR reads as a standard design-delivery doc, full Chinese, no meta narrative.
Return JSON only with verdict, findings, retry_hints, summary.
```

## Success Criteria

- CR.md has exactly the 14 headings.
- § 4 详细设计 contains subsection 4.6 约束符合性 listing touched constraints + violation_check.
- Section 8 has core and adjacent groups.
- Section 14 contains senior review output.
- No constraint marked confirmed/规范层 is violated.
- No placeholder text remains; CR reads as a standard design-delivery doc, full Chinese, no meta narrative.
- `arch-senior-reviewer` verdict is approve or conditional.

## Failure Rules

- Three or more blocking unknowns: stop.
- Missing baseline: stop unless draft mode is explicit.
- Violates a confirmed/规范层 constraint: blocker, cannot pass.
- Touches a proposed constraint without override: major finding, prompt to confirm via /arch-interview first.
- Review reject after one retry: leave CR.md marked draft and report findings.
- English/Chinese mixing in CR prose: finding.
