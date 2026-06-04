# understand-arch v3.5 Spec(真并行 Subagent 调度规范化)

> Version: 3.5 · Status: Draft · 基于:`docs/spec-v3.4.md`(增量 delta,不重写 v3.0/v3.1/v3.2/v3.3/v3.4)
> 主题:把所有 SKILL 的「Dispatch xxx」自然语言指令统一改写为真 `Task` 工具调用 + 显式并行编排,复用 UA 范式(`skills/arch-analyze/SKILL.md`)。

---

## 0. 摘要

v3.0 ~ v3.4 在底层、规格、出图、CR 质量、知识自迭代五个维度逐层补齐。但运行时存在一个**长期未被发现的执行漏洞**:

> 除了 `arch-analyze`(继承 UA 范式)外,我们其他 7 个 SKILL 的「Dispatch arch-xxx-analyzer with this template:」自然语言指令,**实际不会触发 Claude 真调 `Task` 工具**。Claude 会在主对话里**内嵌模拟** subagent 行为,导致:
>
> 1. **UI 上看不到嵌套 subagent 窗口**(用户感知不到多 agent 协作)
> 2. **没有真正的并行**(本可并行的 phase 全部串行)
> 3. **主对话 token 累积**(没有上下文隔离,长会话 token 爆炸)

`skills/arch-analyze/SKILL.md` 已经是「正确范式」(第 45-63 / 331-333 行),明示「Use the Claude Code `Task` tool / Run X concurrently / Do not inline」。Claude 看到这种指令格式就会**真调 Task 工具**,UI 出现嵌套窗口,token 隔离。

v3.5 不动 schema、不动 agents、不动 engine、不动产物结构,**只把 7 个 SKILL 的 dispatch 段措辞规范化为 UA 范式**,并明确若干**真并行机会**作为硬指标。

v3.5 用户入口数量不变(仍 7 个),命令行为不变。**用户感知:UI 上能看见嵌套 subagent 窗口、并行执行可见、长会话 token 不再爆炸**。

---

## 1. 全局规约(继承)

v3.5 继承以下铁律:

1. LLM 语义推断只在 Skill / subagent 内执行,Node/Python 只做确定性读写
2. 不推翻 v3.0 hard fork UA 底座
3. 不修改 v3.2 图能力 / v3.3 CR 流程 / v3.4 cards 派生 / v3.4 增量 onboard
4. 所有面向人的产物默认中文,代码标识符/命令/schema 字段保留英文
5. confirmed 约束 + 规范层 仍是硬约束;proposed 软阻塞 + 留痕
6. AI-mined / cr-derived 条目永不自标 confirmed

新增铁律:

7. **Subagent 派遣**必须通过 Claude Code `Task` 工具显式调用,**严禁用「Dispatch xxx with this template」式自然语言模糊指令**。每个派遣点必须明示:`Use the Claude Code Task tool with subagent_type=<name>`、`Do not inline this phase`、`The user must see subagent activity in Claude Code`。
8. **并行机会必须显式声明**。若一个 phase 内 N 个 dispatch 互无数据依赖,SKILL 必须明示:`Send these N dispatches in a single message to run concurrently`。Claude 看到这种指令会在一条消息里发起 N 个 `Task` 工具调用,UI 渲染为 N 个嵌套窗口并发。

---

## 2. 需求来源

### 2.1 当前 dispatch 现状(grep 核实)

| SKILL | dispatch 写法 | Claude 实际行为 |
|---|---|---|
| `skills/arch-analyze/SKILL.md`(继承 UA) | **明示** Task / concurrent / Do not inline(第 45-63 / 331-333 行) | ✅ 真 Task 调用,5 个 file-analyzer 并发,UI 可见 |
| `skills/arch-enrich/SKILL.md`(我们写的) | 第 56-58 行 Contract 段说了「Use Task or Agent」,但 Phase 7/8/9/9.5/9.6/11/12 的每个 dispatch 只写「Dispatch arch-xxx-analyzer with this template:」 | ⚠️ 内嵌模拟,无嵌套窗口,串行 |
| `skills/arch-audit/SKILL.md` | 同上模糊 dispatch | ⚠️ 内嵌模拟 |
| `skills/arch-design/SKILL.md` | 同上模糊 dispatch;`pre-grill` + impact + solution + senior 全部串行 | ⚠️ 内嵌模拟 |
| `skills/arch-onboard/SKILL.md` | 编排 analyze + enrich,自身不直接 dispatch subagent | n/a |
| `skills/arch-interview/SKILL.md` | 主访谈循环 dispatch 模糊 | ⚠️ 内嵌模拟 |
| `skills/arch-wiki/SKILL.md` | reviewer dispatch 模糊;多受众模式串行 | ⚠️ 内嵌模拟 |
| `skills/arch-diagram/SKILL.md` | fireworks 翻译 dispatch 模糊 | ⚠️ 内嵌模拟 |
| `skills/arch-improve/SKILL.md` | RFC 起草 dispatch 模糊 | ⚠️ 内嵌模拟 |

结论:**8 个 SKILL 中,7 个写法半吊子**,Claude 实际没用 Task 工具。

### 2.2 标杆复用

`skills/arch-analyze/SKILL.md` 第 45-63 / 331-333 行的指令模式作为本轮**唯一参考模板**:

```text
## Subagent Dispatch Is Mandatory

This skill is an orchestrator. It must use Claude Code's subagent mechanism for semantic phases.

When a phase says "dispatch a subagent", do **not** analyze inline in the main conversation.
Use the Claude Code `Task` tool, or the `Agent` tool if this runtime exposes that name,
with the specified `subagent_type`.

If neither `Task` nor `Agent` is available, stop and report:
"Claude Code subagent tool is unavailable; arch-X cannot satisfy v3.5 because LLM
phases would run inline."

For [phase X], launch up to N [agent-name] subagents concurrently.
The user should see subagent activity in Claude Code.
If the runtime queues them, still create separate subagent tasks per batch
and report the queueing.
```

每个具体 phase 处:

```text
Dispatch the `arch-xxx-analyzer` subagent using `Task` (or `Agent`) with
subagent_type="arch-xxx-analyzer". Append the following additional context:

[template body]

Do not inspect or summarize the input inline in the main session.
The main session only schedules the subagent and waits for its output.
```

并行机会处明示:

```text
Send these N dispatches in a single message to run concurrently.
The user must see N subagent tabs / windows in Claude Code.
```

### 2.3 用户决策(讨论纪要)

| # | 决策 | 来源 |
|---|---|---|
| 1 | v3.5 主线 = C1 真并行 dispatch 规范化,**只改 SKILL,不改其他** | 用户拍板 |
| 2 | 扫描部分直接复用 UA(arch-analyze 不动) | 用户拍板 |
| 3 | 其他 7 个 SKILL 按 UA 范式重写 dispatch 段 | 用户拍板 |
| 4 | B 系列(集成 / 行为 / 数据深度 schema 三大缺口)推后到 v3.6 | Claude 提议 |
| 5 | 任务级评估 / 向量召回推后到 v3.6+ | Claude 提议 |

---

## 3. 目标 & 非目标

### 3.1 目标

1. **7 个 SKILL** 的 dispatch 段全部规范化:`arch-enrich` / `arch-audit` / `arch-design` / `arch-interview` / `arch-wiki` / `arch-diagram` / `arch-improve`
2. **真并行硬指标**(至少 4 处真并行机会落地):
   - `arch-enrich` Phase 9.5:`arch-constraint-miner` + `arch-history-miner` 一条消息双 Task
   - `arch-design` CR-OPTION 3 候选:3 个候选方案一条消息三 Task(继承 v3.3 设计)
   - `arch-wiki` 多受众模式:cto / newcomer / pm / architect 一条消息四 Task
   - `arch-audit` 三大 check:cards-check 后,constraint-check + decision-extractor 兜底 + suspicious-findings 复查 可并行
3. 静态文本检测脚本(`engine/arch/dispatch-lint.mjs`):扫每个 SKILL,验证存在 Task / Do not inline / concurrent 关键词
4. 不动 agents/*.md(它们本来就是 subagent prompt)
5. 不动 engine/*.mjs(确定性 Node 工具)
6. 不动 schemas
7. `npm run verify` exit 0,v3.0~v3.4 全部行为不破坏
8. 版本号 → `3.5.0-rc1`

### 3.2 非目标(本轮明确不做)

- 改 schema(graph / arch-layer / constraint / cards)
- 改 agents/*.md(subagent prompt 已就位)
- 改 engine/*.mjs(确定性 Node 工具)
- 改 产物结构、目录布局、文件命名
- 改 命令清单 / 参数 / 用户感知行为
- B 系列三大 schema 缺口(集成 / 行为 / 数据深度)→ v3.6
- 任务级端到端效果评估 → v3.6+
- cards 向量召回 → v3.6+ 评估
- LLM 行为单测(只做静态文本检测;LLM 实际是否真调 Task 由 runtime 决定,无法在 Node 单测层硬测)

---

## 4. 用户视角变化

### 4.1 命令清单

完全不变,仍 7 个:`/arch-onboard` / `/arch-design` / `/arch-audit` / `/arch-wiki` / `/arch-diagram` / `/arch-dashboard` / `/arch-interview`(+ v3.3 `/arch-improve` 共 8)。

### 4.2 用户可感知的行为变化

**v3.5 后用户会看到**:

1. **嵌套 subagent 窗口**:跑 `/arch-onboard` / `/arch-design` / `/arch-audit` 时,Claude Code UI 会显式呈现 N 个嵌套 subagent runtime(类似 arch-analyze 当前的体验)
2. **并行执行可视化**:Phase 9.5 同时跑两个 miner、CR-OPTION 同时起 3 个方案候选、wiki 多受众模式同时跑 4 个版本 —— 用户能看到「N 个 agent 在并行」
3. **长会话 token 不再爆炸**:每个 subagent 独立上下文,主对话只看产物,token 增长被切断

**v3.5 后用户不会看到的差异**:

- 产物、命令、参数、报告格式 —— 全部完全一致
- README 主体不需要新增任何描述(这是底层执行体验升级,不是产品能力新增)

### 4.3 README 描述

**不改 README**。这是内部执行体验升级,产品能力面不变,无需用户阅读新章节。

---

## 5. 实施要点

### 5.1 改造模板(每个 SKILL 通用)

每个需要改造的 SKILL 在文件头部加一段「Subagent Dispatch Is Mandatory」声明(若没有);每个具体 phase 的 dispatch 段按下述格式重写:

```text
## Phase X — [PHASE_NAME]

Dispatch the `<subagent-name>` subagent using the Claude Code `Task` tool with
subagent_type="<subagent-name>" (or the `Agent` tool if this runtime exposes
that name).

[原模板内容保持不变,只替换调用句]

After the subagent completes, read its output file at `<path>` and merge using
`<deterministic-tool>`.

Do not inspect, summarize, or reason about [phase domain] inline in the main session.
The main session only schedules the dispatch and waits for output.
The user must see subagent activity in Claude Code.

If `Task` and `Agent` tools are both unavailable, stop and report:
"v3.5 cannot satisfy the parallel dispatch contract in this runtime."
```

并行机会处加并行声明(见 §5.2 ~ §5.5)。

### 5.2 真并行机会清单(硬指标)

#### 5.2.1 `arch-enrich` Phase 9.5 双 miner

当前:`arch-constraint-miner` 先跑,完成后再跑 `arch-history-miner`,串行约 2× 时延。

改造:

```text
## Phase 9.5 — CONSTRAINT-MINE + HISTORY-MINE(v3.1 / v3.4)

Send these two dispatches in a single message to run concurrently:

1. Dispatch `arch-constraint-miner` via Task tool with subagent_type="arch-constraint-miner".
   [template body 1]

2. Dispatch `arch-history-miner` via Task tool with subagent_type="arch-history-miner".
   [template body 2]

The user must see two subagent tabs in Claude Code.
Do not inspect either subagent's reasoning inline.
After both complete, merge constraint outputs with `constraint-writer.mjs` and
history outputs with `history-miner-runner.mjs`.
```

#### 5.2.2 `arch-design` CR-OPTION 3 候选

v3.3 引入 CR-OPTION.md,3 个方案候选(最小变更 / 架构改良 / 长期演进)。当前各候选可能串行。

改造:

```text
## CR-OPTION Generation

After pre-grill completes, send these three dispatches in a single message to run
concurrently:

1. Dispatch `arch-solution-designer` with mode="option-a-minimal" via Task tool.
2. Dispatch `arch-solution-designer` with mode="option-b-architectural" via Task tool.
3. Dispatch `arch-solution-designer` with mode="option-c-long-term" via Task tool.

The user must see three subagent tabs in Claude Code.
Each subagent drafts its candidate independently from the same impact analysis;
do not let one option's reasoning leak into another's input.

After all three complete, merge into `CR-OPTION.md` with three sections.
```

#### 5.2.3 `arch-wiki` 多受众模式

当前:`--audience=cto` / `newcomer` / `pm` / `architect` 各自跑一次。

改造(用户显式要求多受众时):

```text
## Multi-Audience Mode

When the user requests multiple audiences (e.g. `--audience=cto,newcomer,pm,architect`),
send all N dispatches in a single message to run concurrently:

[For each audience]
Dispatch `arch-wiki-narrator` with audience="<audience>" via Task tool with
subagent_type="arch-wiki-narrator".

The user must see N subagent tabs in Claude Code.
Each version writes to a separate file `wiki/ARCHITECTURE.{audience}.md`.
```

#### 5.2.4 `arch-audit` 三大 check 并行

当前:cards-check → constraint-check → decision-extractor 兜底 → suspicious-findings 复查,串行。

改造(数据依赖梳理后,后三项互不依赖,可并行):

```text
## Phase 5b — Validation Checks (Parallel)

After cards-check completes, send these three dispatches in a single message:

1. Run `constraint-check.mjs` (deterministic Node, async).
2. Dispatch `arch-decision-extractor` for backfill (Task tool with subagent_type).
3. Dispatch `arch-suspicious-recheck` for stale finding review (Task tool with subagent_type).

The first is deterministic (Node), the latter two are LLM subagents in their own
tabs in Claude Code. Do not inspect any of them inline.
After all three return, aggregate findings into audit report.
```

### 5.3 静态检测 `engine/arch/dispatch-lint.mjs`

确定性 Node,无 LLM。扫所有 `skills/*/SKILL.md`,验证每个 dispatch 段含必要关键词。

#### 5.3.1 检测规则

| 规则 | 描述 |
|---|---|
| R1 | 凡含 `Dispatch ` / `dispatch ` 单词且后接 subagent 名的段落,必须含 `Task` 关键词(允许 `Task tool`、`Task or Agent`、`Task/Agent`) |
| R2 | 上述段落必须含 `Do not inline` 或 `do not inspect ... inline` 措辞 |
| R3 | 上述段落必须含 `subagent_type` 或 `subagent_type=` 措辞 |
| R4 | 文件头部必须有「Subagent Dispatch Is Mandatory」或等价声明段(允许重定向到外部公共片段) |
| R5(并行场景) | 含 `concurrently` / `in parallel` 措辞的段落,必须有 `Send these ... dispatches in a single message` 或等价并行编排指令 |
| R6(兜底) | 任何含「inline」「主对话内嵌」「自行模拟」等违规措辞的 dispatch 段直接 fail |

#### 5.3.2 豁免

- `vendor/fireworks-tech-graph/PROMPT.md`:upstream 文件,豁免
- `skills/arch-dashboard/SKILL.md`:无 LLM phase,豁免(它只调静态 Node 工具)
- `skills/arch-onboard/SKILL.md`:仅编排,自身不直接 dispatch subagent,豁免主体扫描但检查它对 `arch-analyze` / `arch-enrich` 的 Task 调用约定

#### 5.3.3 调用方式

```bash
node engine/arch/dispatch-lint.mjs            # 扫所有 skills,输出 JSON
node engine/arch/dispatch-lint.mjs --strict   # 任何违规 exit 1
```

加入 `npm run verify` 链路:T1 必须让 strict 模式 exit 0。

### 5.4 不动清单(再次明示)

- 任何 `agents/*.md`(已是 subagent prompt)
- 任何 `engine/*.mjs`(确定性工具)
- 任何 `internal/schemas/*.json`
- `skills/arch-analyze/SKILL.md`(UA 范式,本身就是标杆)
- `skills/arch-dashboard/SKILL.md`(无 LLM phase)
- `skills/arch-onboard/SKILL.md` 主体逻辑(仅在末尾加 Task 调用约定声明,确保它对 analyze / enrich 的调用也走 Task)
- `vendor/fireworks-tech-graph/*`(upstream 文件)
- 任何用户感知的命令 / 参数 / 输出位置

---

## 6. 文件清单

### 6.1 新增

- `engine/arch/dispatch-lint.mjs`(确定性,无 LLM)
- `engine/arch/__tests__/dispatch-lint.test.mjs`
- `docs/spec-v3.5.md`(本文档)
- `docs/audit-v3.5-impl.md`(实现后写)

### 6.2 修改(只改 dispatch 段措辞)

| 文件 | 改造范围 |
|---|---|
| `skills/arch-enrich/SKILL.md` | Phase 7 / 8 / 9 / **9.5(双 miner 并行硬指标)** / 9.6 / 11 / 12 全部规范化 |
| `skills/arch-audit/SKILL.md` | senior-reviewer + 兜底 extractor + cards-check 段规范化;**5b 三大 check 并行硬指标** |
| `skills/arch-design/SKILL.md` | pre-grill / impact-analyzer / solution-designer / senior-reviewer 全部规范化;**CR-OPTION 3 候选并行硬指标** |
| `skills/arch-interview/SKILL.md` | 主访谈循环 dispatch 规范化 |
| `skills/arch-wiki/SKILL.md` | reviewer 规范化;**多受众并行硬指标**(用户指定多受众时) |
| `skills/arch-diagram/SKILL.md` | fireworks 翻译 dispatch 规范化 |
| `skills/arch-improve/SKILL.md` | RFC 起草 dispatch 规范化 |
| `skills/arch-onboard/SKILL.md` | 末尾加约定声明:对 analyze / enrich 也通过 Task 调用 |
| `package.json` | 加 `dispatch:lint` 脚本;`verify` 链路加 dispatch-lint --strict |
| `.claude-plugin/plugin.json` / `marketplace.json` | 版本 → `3.5.0-rc1` |

### 6.3 不动

- 任何 `agents/*.md`
- 任何 `engine/*.mjs`(除新增 dispatch-lint)
- 任何 `internal/schemas/*.json`
- `skills/arch-analyze/SKILL.md`(UA 范式标杆)
- `skills/arch-dashboard/SKILL.md`
- `vendor/*`
- `README.md` / `README.zh.md`(无用户感知变化)

---

## 7. 依赖

无新增依赖。

---

## 8. 验收

### 8.1 确定性层

- [ ] `dispatch-lint.mjs --strict` exit 0(7 个 SKILL 全部通过 R1~R6)
- [ ] `dispatch-lint.test.mjs` 单测:
  - 给一段含 `Dispatch xxx with this template` 但无 `Task` 关键词的 fixture → 准确报错
  - 给一段含 `Task` + `Do not inline` + `subagent_type` 完整三件套的 fixture → 通过
  - 给一段含「inline simulate」违规措辞的 fixture → 准确报错
  - 并行场景 fixture(有 `concurrently` 但无 `single message`)→ 准确报错
- [ ] `npm run verify` exit 0
- [ ] 所有 v3.4 测试不破坏(10 个测试文件,26+ case)

### 8.2 文本规范

- [ ] 7 个 SKILL 文件头部均含「Subagent Dispatch Is Mandatory」声明段
- [ ] 每个 dispatch 点均含 `Task` + `subagent_type` + `Do not inline`
- [ ] 4 处真并行机会均含「Send these N dispatches in a single message」措辞
- [ ] arch-onboard 末尾加 Task 调用约定声明

### 8.3 回归保护

- [ ] v3.0~v3.4 产物路径 / 字段 / 行为完全一致
- [ ] v3.3 CR 14 段 + pre-grill + CR-OPTION 流程结构未改(只改 CR-OPTION 内部 dispatch 措辞)
- [ ] v3.2 fireworks 出图能力不破坏
- [ ] v3.4 cards 派生层 / 增量 onboard / 决策回流不破坏

### 8.4 文档

- [ ] `docs/audit-v3.5-impl.md` 三层验收报告齐全(确定性 / 文本规范 / 回归)
- [ ] README 主体不改(本轮无用户感知)
- [ ] 版本 3.5.0-rc1

---

## 9. 不做的事(v3.6 候选)

| # | 能力 | 推后理由 |
|---|---|---|
| 1 | 集成视图层 schema(topic / integration / contract 节点) | v3.6 主线候选 |
| 2 | 行为视图层 schema(state-machine / business-rule) | v3.6 主线候选 |
| 3 | 数据深度(config-mapping / ER 基数 / DTO-DO) | v3.6 主线候选 |
| 4 | 任务级端到端效果评估 | v3.6.5 候选 |
| 5 | cards 向量召回 | 视效果再决定 |
| 6 | git-history 作者维度 | v3.6+ 评估 |

---

## 10. 交付节奏

由于纯文本改写工作,1 个 T 收口:

| T | 产出 | 复用 / 新增 |
|---|---|---|
| T1 | 7 个 SKILL dispatch 段全部规范化 + 4 处并行硬指标落地 + dispatch-lint + 单测 + audit 报告 + 版本 3.5.0-rc1 | 复用 UA 范式 + 新增 lint 工具 |

工期估 1-2 天,适合 codex 一轮交付。

---

## 11. 风险

| 风险 | 缓解 |
|---|---|
| Claude 是否真的遵守「Use Task tool」指令 | UA arch-analyze 已被验证真并行,有先例;若个别 runtime 不支持,SKILL 末尾的 fallback 报告语句生效 |
| 并行 dispatch 引起节点 id 冲突 | 已有 cards-deriver / arch-layer-writer / constraint-writer 等做确定性合并,id 唯一性已经在 v3.4 层保证 |
| 静态文本检测无法测 LLM 实际行为 | 接受边界 —— 静态检测保证「指令格式正确」,实际是否真调 Task 由 runtime 决定;若 dogfood 发现仍内嵌,加强措辞或运行时探测 |
| 改写引入笔误 / phase 编号错位 | T1 实施时按 phase 顺序逐个改,每改一个 phase 跑一次 dispatch-lint;最后跑全量回归 |
| dispatch-lint 误报 | T1 用现有 arch-analyze(标杆)作为「应通过」fixture,验证规则不误报 |
