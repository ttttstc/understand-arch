# PM Question Template

> `PM问题清单.md` is the hard-gate artifact. It is not a casual note; it is the evidence that the workflow paused instead of designing on unclear premises.

## File Location

Default path:

```text
${ARCH_PROJECT_DIR}/design-docs/{change-name}/PM问题清单.md
```

When change name is not available, use:

```text
${ARCH_PROJECT_DIR}/PM问题清单.md
```

## Template

```markdown
---
generated_by: arch-frame
generated_at: <ISO-8601>
mode: design
readiness: blocked
state_phase: awaiting-pm-confirmation
source_prd: <path-or-conversation-source>
---

# PM问题清单

当前设计流程已暂停。原因: PRD/变更输入命中 <N> 个 clarity blocker，超过 hard gate 阈值 3。

## 如何继续

任选一种方式回答:

1. 直接在本文件每个问题的 `PM Answer` 下填写答案。
2. 在对话里逐条回答问题 ID。
3. 如果必须带不确定性继续，说明 override 理由；workflow 会把风险写入 `state.yaml.overrides`。

## Blocking Questions

### Q1. <short question>

- Severity: BLOCKING
- Category: <missing_required_field|unquantified_acceptance|nfr_unspecified|non_goals_missing|ambiguous_sentence|dependency_unknown>
- Source: `<file>:<line-range>`
- Why it blocks architecture: <impact>
- Suggested answer shape: <specific format or choices>
- PM Answer:

### Q2. <short question>

- Severity: BLOCKING
- Category: <category>
- Source: `<file>:<line-range>`
- Why it blocks architecture: <impact>
- Suggested answer shape: <specific format or choices>
- PM Answer:

## Warnings

### W1. <short warning>

- Severity: WARNING
- Category: <category>
- Source: `<file>:<line-range>`
- Why it matters: <impact>
- PM Answer:

## Remaining Assumptions

| ID | Assumption | Requires Confirmation | Answered |
|---|---|---|---|
| A1 | <text> | true | false |

## Recheck Instructions

After answers are filled, tell workflow: `继续`.
`arch-frame` will reread this file, update `项目总览.yaml.design_intent`, and rerun clarity detection.
```

## Question Writing Rules

Questions must be concrete enough that a PM or business owner can answer without understanding internals.

Good:

- "历史查询需要支持回看多久? 7 天、90 天、1 年，还是全量?"
- "这次是否允许改变外部 API response schema? 如果允许，请列出兼容窗口。"
- "上线失败时是否允许关闭新能力回退到旧流程?"

Bad:

- "请补充技术方案。"
- "这个需求是否合理?"
- "怎么实现比较好?"

Those are architecture questions, not frame questions.

## Category Definitions

| Category | Meaning |
|---|---|
| `missing_required_field` | business goal, scope, or acceptance criteria is absent |
| `unquantified_acceptance` | acceptance exists but cannot be verified |
| `nfr_unspecified` | important NFR dimension is missing |
| `non_goals_missing` | explicit out-of-scope boundary is absent |
| `ambiguous_sentence` | wording has multiple plausible interpretations |
| `dependency_unknown` | required upstream/downstream owner, contract, or availability is unknown |

## Severity Rules

`BLOCKING`:

- The answer changes architecture shape, data model, rollout, rollback, security, or API compatibility.
- The answer is needed before `arch-diff-judge` can determine impact.

`WARNING`:

- The answer improves quality but the workflow can continue with a clearly labeled assumption.

## State Update

When this file is created, workflow must write:

```yaml
phase: awaiting-pm-confirmation
blocking_file: <path>
blocked_by: arch-frame
blocking_questions:
  - id: Q1
    severity: blocking
    text: <question>
    context: <source excerpt summary>
    impact: <why it blocks>
    pm_answer: null
```

## Recheck Behavior

When the user returns:

1. Read answers from this file and the conversation.
2. Update matching assumptions in `项目总览.yaml`.
3. Rerun clarity detection only on unresolved items.
4. If blockers remain, rewrite the file with only remaining blockers.
5. If blockers are cleared, set `phase=frame` or the next workflow phase and continue.
