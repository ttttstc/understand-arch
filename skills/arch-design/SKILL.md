---
name: arch-design
description: Turn a PRD or change request into CR-OPTION.md plus a 14-section CR.md with impact analysis, option selection, and senior architect review.
argument-hint: "<prd-or-request>"
---

# /arch-design

Use this when the user asks for implementation design, PRD review, impact analysis, or a change request.

## Subagent Dispatch Is Mandatory

This skill is an orchestrator. It must use the Claude Code Task tool for every semantic design phase.

For every LLM phase, prefer the Claude Code Task tool with the named `subagent_type` whenever the runtime exposes it.
**Runtime fallback**: If the current runtime does not expose `Task` or `Agent` tools (for example, Codex CLI, opencode, Cursor, or Copilot), inline execution is permitted. In this case:

- Open the response with one line: `[runtime-fallback: inline subagent <name>]`
- Execute the phase logic in the main conversation
- Skip parallel-dispatch instructions; treat them as sequential
- All deterministic Node tools and JSON merge rules still apply unchanged

The `Task` path remains preferred whenever the runtime supports it; the fallback exists for cross-runtime portability and should not be used in Claude Code.

Do not inline this phase. The user must see subagent activity in Claude Code. Deterministic CR file editing and validation stay in `cr-md-editor.mjs`.

## Inputs

- User request or PRD text.
- Current `.understand-arch/<project>/specs/repos.json`.
- Per-repo code graphs.
- `specs/arch-layer.json`.
- `cards/agent-cards.json` when present. Use it as the first retrieval surface for impact and design evidence; raw graph plus arch-layer remain the fallback.
- `rules/*.md`(规范层), `rules/project-language.md`, `rules/constraints/*.md`(约束层:confirmed 硬约束 / proposed 软提示), ADRs, and existing CRs.

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

CR 语言与文档风格(v3.3):CR-OPTION.md 与 CR.md 全中文(代码标识符/命令保留英文,不中英混杂),写成业界标准设计交付文档(Tech Spec/RFC)风格 —— 工程语言、详细设计具体到研发可照做、自包含、无工具元叙述。若 `rules/project-language.md` 存在,必须使用其中推荐术语;同一概念混用是 review finding。

## CR Location

Create or update:

```text
.understand-arch/<project>/change-requests/CR-YYYY-NNN-<slug>/CR.md
```

Before writing CR.md, create:

```text
.understand-arch/<project>/change-requests/CR-YYYY-NNN-<slug>/CR-OPTION.md
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

1. 读 `rules/` + `rules/project-language.md` + `rules/constraints/`,建立本次 design 适用的术语和约束集(规范层 + confirmed + proposed)。
2. Use the Claude Code Task tool with `subagent_type=arch-pre-grill`. Do not inline this phase. The user must see subagent activity in Claude Code.
3. If `design_readiness=needs_user_answer` or `blocking_questions.length >= 3`, stop and ask the user the blocking questions. Do not create CR-OPTION.md or CR.md.
4. If `design_readiness=draft_only`, ask the user whether to continue as an explicitly low-confidence draft. If they continue, every downstream dispatch must carry `draft_only: true`, CR-OPTION.md must label the recommendation as draft-only, and CR.md §12 must list the unresolved evidence.
5. Use the Claude Code Task tool with `subagent_type=arch-frame`, passing the pre-grill JSON. Do not inline this phase. The user must see subagent activity in Claude Code. `arch-frame` must not redo the same clarification from scratch; it consumes pre-grill as the source of problem/goals/non-goals and only adds implementation framing, missing acceptance criteria, and blocking_unknown_count.
6. If `blocking_unknown_count >= 3`, stop and ask the user. Do not invent answers.
7. Build an impact evidence packet. If `cards/agent-cards.json` exists, first select relevant cards by `semantic_tags`, title, anchors, and source_artifact, then pass the selected `card_id` list to `arch-impact-analyzer`. If cards are missing or stale, fall back to raw graph + arch-layer.
8. Use the Claude Code Task tool with `subagent_type=arch-impact-analyzer`(交叉比对约束:受影响节点是否落在某约束管辖范围,踩到的标注)。Do not inline this phase. The user must see subagent activity in Claude Code.
9. 若影响面触碰 proposed 约束 → 提示用户先确认该约束(软阻塞),用户可 override。
10. Send these N dispatches in a single message to run concurrently (N=3), using `subagent_type=arch-solution-designer` for方案 A/B/C candidates. Do not inline this phase. The user must see subagent activity in Claude Code. Merge the three returned Markdown option sections deterministically into `CR-OPTION.md`.
11. Write `CR-OPTION.md` in the CR directory and run:

```bash
node <PLUGIN_ROOT>/engine/arch/cr-md-editor.mjs validate-option --file <CR_DIR>/CR-OPTION.md
```

12. Unless the user explicitly said "按推荐方案继续", "无需确认", or "自动化执行", stop and ask the user to choose A/B/C, a mixed option, or regeneration. Do not write formal CR.md before this decision.
13. Once the user has selected an option, use `cr-md-editor.mjs` to create the CR skeleton.
14. Use the Claude Code Task tool with `subagent_type=arch-interface-designer`, passing the selected option, CR-OPTION.md, pre-grill JSON, impact JSON, selected card ids, graph, arch-layer, rules, constraints, ADRs, and project-language.md. Do not inline this phase. The user must see subagent activity in Claude Code.
15. Use the Claude Code Task tool with `subagent_type=arch-solution-designer`(先读相关约束作为设计护栏,主动遵守,并消费 selected option + interface JSON + selected card ids)。Do not inline this phase. The user must see subagent activity in Claude Code.
16. Write sections 1-7 and 9-13 with `cr-md-editor.mjs`。**§ 4 详细设计必须含 4.1-4.8 子节,其中 4.6 为约束符合性,4.7 为接口质量与复杂度隐藏**。
17. Write section 8 from the impact analyzer, preserving two groups:
   - core impacted set
   - adjacent review set
18. Ensure section 5 summarizes A/B/C from CR-OPTION.md and states the selected option.
19. Ensure section 13 links `CR-OPTION.md`.
20. If the user skipped option confirmation, ensure section 14 records that skip and reason.
21. Run `cr-md-editor.mjs validate --file <CR.md>`.
22. Use the Claude Code Task tool with `subagent_type=arch-senior-reviewer`(约束验收:违反 confirmed/规范层 → blocker;触碰 proposed 未 override → major finding;v3.3 还验可实施性/接口质量/取舍质量/切片质量,并校验设计引用的 card_id 在 anchors 范围内)。Do not inline this phase. The user must see subagent activity in Claude Code.
23. Append findings only to section 14.
24. If review rejects, rerun the specific failed analyzer once using retry hints.

## CR-OPTION.md(v3.3)

Default output before CR.md:

```text
<CR_DIR>/CR-OPTION.md
```

It must be human-readable Markdown, not JSON. It must contain:

1. `## 0. 设计问题`
2. `## 1. 方案 A:最小变更方案`
3. `## 2. 方案 B:架构改良方案`
4. `## 3. 方案 C:长期演进方案`
5. `## 4. 横向对比`
6. `## 5. 推荐意见`
7. `## 6. 人类决策`

Each option must include `核心思路 / 怎么改 / 影响范围 / 优点 / 代价 / 主要风险 / 适合在什么情况下选 / 不适合在什么情况下选`.

Default behavior: stop after writing CR-OPTION.md and ask the user to choose. Formal CR.md is only generated after a human selection, unless the user explicitly asked to continue with the recommended option.

## § 4.6 约束符合性(并入「4. 详细设计」,v3.1)

CR § 4 详细设计必须包含 4.1-4.8,其中 `### 4.6 约束符合性` 列出本方案触及的所有约束:

```markdown
### 4.1 能力变化
### 4.2 组件与边界
### 4.3 接口与契约
### 4.4 数据与状态
### 4.5 流程与失败模式
### 4.6 约束符合性
### 4.7 接口质量与复杂度隐藏
### 4.8 观测与运维
```

`### 4.7 接口质量与复杂度隐藏` 必须消费 `arch-interface-designer` 输出,说明:

- 新接口是否把复杂度藏在稳定边界后面
- 调用方是否容易正确使用、难以误用
- 是否制造 shallow module
- 是否泄漏实现细节
- 推荐接口/边界方案及拒绝的备选方案

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

Use the Claude Code Task tool with `subagent_type=arch-frame`. Do not inline this phase. The user must see subagent activity in Claude Code.

```text
Mode: PRD hard gate.
Request: <user PRD/request>
Pre-grill JSON: <pre-grill output>
Read available graph, arch-layer, rules, ADRs, and CRs.
Consume pre-grill problem_statement/goals/non_goals/domain_terms as the starting point.
Do not duplicate pre-grill's responsibility. Add only implementation framing, missing acceptance criteria, and any remaining blocking_unknown_count.
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

## arch-pre-grill Dispatch(v3.3)

Use the Claude Code Task tool with `subagent_type=arch-pre-grill`. Do not inline this phase. The user must see subagent activity in Claude Code.

```text
Mode: CR pre-grill.
Input: user PRD/request, graph, arch-layer, rules, project-language, constraints, ADRs, historical CRs.
Task:
1. Clarify problem, goals, non-goals, user/actor, domain terms.
2. Check whether the request conflicts with confirmed rules, constraints, or ADRs.
3. Identify blocking questions that must be answered before design.
4. Identify assumptions that may be carried into CR-OPTION.md and CR.md.
5. Decide whether an ADR or /arch-interview is needed.
Return JSON only. All user-facing text in Chinese.
```

## arch-impact-analyzer Dispatch

Use the Claude Code Task tool with `subagent_type=arch-impact-analyzer`. Do not inline this phase. The user must see subagent activity in Claude Code.

```text
Mode: CR impact analysis.
Input PRD: <request>
Use selected Agent-cards first when available:
{
  "selected_card_ids": ["card:component:auth"],
  "cards_path": "<ARCH_PROJECT_ROOT>/cards/agent-cards.json"
}
Use raw code graph and arch-layer only as fallback or to resolve anchors from selected cards.
Return JSON only.
Separate exact graph hits from adjacent review candidates.
Do not put weak text matches into the core impacted set.
Cross-check each impacted node against constraints (规范层 + confirmed + proposed):
return a `constraint_hits` list — { constraint_id, source, status, impacted_node, note }.
Flag any touched proposed constraint as needs-confirmation.
Every item needs confidence and evidence_refs.
All Chinese output; no English/Chinese mixing in one sentence.
```

## CR-OPTION Parallel Dispatch(v3.5)

Send these N dispatches in a single message to run concurrently (N=3). Use the Claude Code Task tool with `subagent_type=arch-solution-designer` for each candidate. Do not inline this phase. The user must see subagent activity in Claude Code.

Candidate A prompt:

```text
Mode: CR-OPTION candidate.
Option: A 最小变更方案.
Input PRD, pre-grill JSON, frame JSON, impact JSON, selected card ids, constraint_hits, graph evidence, rules, project-language, rules/constraints, ADRs, and arch-layer.
Produce only the Markdown body for `## 1. 方案 A:最小变更方案`.
Include 核心思路 / 怎么改 / 影响范围 / 优点 / 代价 / 主要风险 / 适合在什么情况下选 / 不适合在什么情况下选.
All Chinese; keep code identifiers/commands in English; no mixing in one sentence.
```

Candidate B prompt:

```text
Mode: CR-OPTION candidate.
Option: B 架构改良方案.
Input PRD, pre-grill JSON, frame JSON, impact JSON, selected card ids, constraint_hits, graph evidence, rules, project-language, rules/constraints, ADRs, and arch-layer.
Produce only the Markdown body for `## 2. 方案 B:架构改良方案`.
Include 核心思路 / 怎么改 / 影响范围 / 优点 / 代价 / 主要风险 / 适合在什么情况下选 / 不适合在什么情况下选.
All Chinese; keep code identifiers/commands in English; no mixing in one sentence.
```

Candidate C prompt:

```text
Mode: CR-OPTION candidate.
Option: C 长期演进方案.
Input PRD, pre-grill JSON, frame JSON, impact JSON, selected card ids, constraint_hits, graph evidence, rules, project-language, rules/constraints, ADRs, and arch-layer.
Produce only the Markdown body for `## 3. 方案 C:长期演进方案`.
Include 核心思路 / 怎么改 / 影响范围 / 优点 / 代价 / 主要风险 / 适合在什么情况下选 / 不适合在什么情况下选.
All Chinese; keep code identifiers/commands in English; no mixing in one sentence.
```

After all three Task results return, assemble CR-OPTION.md with sections 0, 4, 5, and 6 in the main skill using deterministic Markdown editing. Do not ask any subagent to overwrite the whole file.

## arch-solution-designer Dispatch

Use the Claude Code Task tool with `subagent_type=arch-solution-designer`. Do not inline this phase. The user must see subagent activity in Claude Code.

```text
Mode: CR solution design.
Input PRD, selected option from CR-OPTION.md, pre-grill JSON, frame JSON, impact JSON, interface JSON, selected card ids, constraint_hits, graph evidence, rules, project-language, rules/constraints, ADRs, and arch-layer.
First read all relevant constraints as design guardrails and design to comply.
Draft CR.md sections 1-7 and 9-13.
Section 4 must include subsections 4.1-4.8 in order. Section 4.6 lists every touched constraint
(source, status, how the design complies or override reason, violation_check command). Section 4.7 explains interface quality and complexity hiding.
Section 5 must summarize CR-OPTION.md A/B/C alternatives and state the selected option.
Section 9 must use vertical slices only. Every slice must include 目标, 范围, 具体改动, 验收, 回滚, 人机边界(AFK/HITL), and 依赖.
Section 13 must link CR-OPTION.md.
Do not write section 14.
Use concrete implementation steps and rollback/test plans — write like a standard Tech Spec a senior dev can implement directly.
All Chinese; keep code identifiers/commands in English; no mixing in one sentence.
Reject placeholder prose. No tool/scan/phase/analyzer meta narrative.
Return JSON mapping section numbers to markdown content.
```

## arch-review / arch-senior-reviewer Dispatch(约束验收)

Use the Claude Code Task tool with `subagent_type=arch-senior-reviewer`. Do not inline this phase. The user must see subagent activity in Claude Code.

```text
Mode: CR review (v3.1 constraint-aware).
Review CR.md including § 4.6 约束符合性.
Blocker if the design violates any confirmed constraint or 规范层 rule.
Major finding if it touches a proposed constraint without override + reason.
Verify every constraint in § 4.6 carries a violation_check (command or detection method).
Verify § 4.7 explains interface quality, complexity hiding, caller experience, and shallow module risk.
Verify § 5 summarizes CR-OPTION.md and the chosen option.
Verify § 9 is vertical slices, not horizontal task split.
Verify CR reads as a standard design-delivery doc, full Chinese, no meta narrative.
Return JSON only with verdict, findings, retry_hints, summary.
```

## Success Criteria

- CR.md has exactly the 14 headings.
- CR-OPTION.md exists and has A/B/C options, comparison, recommendation, and human decision section.
- CR.md is created only after human selection or explicit "按推荐方案继续".
- § 4 详细设计 contains 4.1-4.8, including 4.6 约束符合性 listing touched constraints + violation_check and 4.7 interface quality.
- Section 8 has core and adjacent groups.
- Section 9 has vertical slices with AFK/HITL.
- Section 14 contains senior review output.
- No constraint marked confirmed/规范层 is violated.
- No placeholder text remains; CR reads as a standard design-delivery doc, full Chinese, no meta narrative.
- `arch-senior-reviewer` verdict is approve or conditional.

## Failure Rules

- Three or more blocking unknowns: stop.
- Pre-grill design_readiness=needs_user_answer: stop before CR-OPTION.md.
- Pre-grill design_readiness=draft_only: continue only with explicit user consent, mark CR-OPTION.md and CR.md as low-confidence draft, and put unresolved evidence in CR §12.
- Missing CR-OPTION.md or invalid CR-OPTION.md: stop before CR.md.
- User has not selected an option and did not explicitly ask to continue with recommendation: stop after CR-OPTION.md.
- Missing baseline: stop unless draft mode is explicit.
- Violates a confirmed/规范层 constraint: blocker, cannot pass.
- Touches a proposed constraint without override: major finding, prompt to confirm via /arch-interview first.
- Review reject after one retry: leave CR.md marked draft and report findings.
- English/Chinese mixing in CR prose: finding.
