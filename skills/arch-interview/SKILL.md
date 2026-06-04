---
name: arch-interview
description: Interview senior engineers to recover implicit project knowledge — the "why" behind anomalies that code archaeology cannot explain. Reads onboard-produced suspicious findings, grills experts one question at a time, and produces proposed constraints for human confirmation.
argument-hint: ["[--scenario=domain|dependency|history|customization|risk|ops|testing] [arch-project-dir]"]
---

# /arch-interview

知识访谈入口。像一个**严谨、认真、善于问问题的新员工**:基于 onboard 已侦查的反常点,逐个追问资深研发/老员工"这里为什么这样",把只活在人脑里的隐性知识(历史因果、特殊适配、踩坑教训)抢救成待确认约束。

定位区分:`arch-constraint-miner` 在 onboard 挖"系统行为里的隐性约束(是什么)";`/arch-interview` 挖"代码行为都体现不出来的为什么"。两者产出汇到同一 `rules/constraints/`,都走 proposed→confirmed。

本 skill 全程中文交互(代码标识符/路径/命令保留英文,不中英混杂)。

## Subagent Dispatch Is Mandatory

This skill is an orchestrator. It must Use the Claude Code Task tool for the semantic question-preparation phase of the interview loop.

For every LLM phase, use the Claude Code Task tool with the named `subagent_type`. If the Task tool is unavailable, stop and report: "Claude Code subagent tool is unavailable; arch-interview cannot satisfy v3.5 because LLM phases would run inline."

Do not inline this phase. The user must see subagent activity in Claude Code. The main conversation may ask and receive the human interview answer, but anomaly interpretation and recommended answer drafting must stay in a subagent.

## Inputs(只读取 onboard 产物,不临时重新分析)

- `rules/constraints/suspicious-findings.md`(onboard 侦查的反常点 + 可疑度 + 影响面)
- `rules/constraints/*.md`(已有 proposed/confirmed 约束)
- `specs/arch-layer.json`、per-repo `knowledge-graph.json`(查证用)

若无 `suspicious-findings.md`(没跑过 onboard):降级走通用场景问卷(7 个场景域的开放问题),并提示"先 /arch-onboard 可让访谈更精准"。

## 场景域(--scenario)

| 域 | 挖什么 |
|---|---|
| domain | 领域/数据不变量:哪个字段/状态不能动,为什么 |
| dependency | 依赖/边界:哪些模块不能互调,哪个同步不能异步 |
| history | 历史包袱:哪个"无用代码"在养大客户,哪个 hack 是教训 |
| customization | 特殊适配:为哪个客户/环境做过特殊处理 |
| risk | 风险/事故:哪里出过事故,哪个改动捅过篓子 |
| ops | 运维/部署:哪个部署顺序不能乱,哪个配置改了会炸 |
| testing | 测试盲区:哪些生产依赖但测试没覆盖 |

未指定 `--scenario` 时,先让用户选一个域(一次约一个域,可分次访谈)。

## 访谈流程

### 第 1 步:读取 + 筛选(秒级,无人参与)

1. 解析 `ARCH_PROJECT_ROOT`。
2. 读 `suspicious-findings.md`,按所选场景域筛选相关反常点,按 可疑度 × 影响面 排序。
3. 读已有约束,避免重复提问已确认的。

### 第 2 步:grill 式访谈(一次一问,带推荐答案)

对排序后的反常点逐个提问。**每次只问一个问题**。每个问题:

- 给出具体位置(file:line / node id)+ 为什么觉得反常
- **给出 AI 的推荐答案**(基于代码猜测 + 行业常见模式),让受访人确认/纠正,降低回答成本
- 用 AskUserQuestion 或直接对话,等受访人回答后再问下一个

Before each question, use the Claude Code Task tool with `subagent_type=arch-constraint-miner` in interview-question mode to prepare the anomaly interpretation and recommended answer. Do not inline this phase. The user must see subagent activity in Claude Code.

Task prompt:

```text
Mode: interview-question.
Scenario: <scenario>.
Project directory: <ARCH_PROJECT_ROOT>.
Suspicious finding: <single selected finding with location and impact>.
Existing constraints: <related constraint ids>.
Produce JSON only:
{
  "question": "...",
  "recommended_answer": "...",
  "evidence_refs": [],
  "duplicate_constraint_ids": []
}
All user-facing text must be Chinese. Do not create confirmed constraints. Do not invent human testimony.
```

提问模板:
```
我发现 {位置} {反常描述}。
我的猜测:{推荐答案}。
请确认:这是有意为之吗?背后的原因/约束是什么?
```

收敛规则:一个域问到"连续几个反常点都得到'这是正常的/无特殊原因'"即收;受访人可随时喊停。

冲突处理:若受访人说法与已有 proposed 约束或别人的说法矛盾,当场把相关约束标 `evidence_level: conflicted`,记录双方说法。

### 第 3 步:产出

1. 把访谈确认的隐性知识结构化为 proposed 约束,追加到对应 `rules/constraints/*.md`(`source: interview`,`evidence_level` 多为 confirmed/人证,备注受访人+日期+关联 SF)。通过约束写工具或直接编辑,**不得覆盖已 confirmed 条目**。
2. 写访谈记录:`rules/constraints/interview/interview-{date}-{受访人}.md`(原始问答留底,模板见 templates/constraints/interview/)。
3. 回标 `suspicious-findings.md`:被解答的反常点 `status: answered` + 链接产出约束;未解答的留 `pending-interview`。

## 输出

- 新增 proposed 约束(source: interview)
- 访谈记录 md
- suspicious-findings 回标
- 中文总结:本次访谈覆盖几个反常点、产出几条约束、还剩几个待访谈、是否有冲突待对齐

## 与 arch-audit 的分工

- audit = "基线 vs 现实是否漂移"(时间维度)
- interview = "代码反常点需要人解释为什么"(静态隐性知识)
- interview 只消费 onboard 已产的侦查结果,不自己重新扫全图

## Failure Rules

- 无 onboard 基线:降级通用问卷 + 提示先 onboard,不报错退出。
- 不得编造受访人没说过的约束(访谈是人证,AI 不能替人下结论)。
- 不得覆盖已 confirmed 约束。
- 产出约束 status 一律 proposed,等人确认。
- 全程中文,不中英混杂。
