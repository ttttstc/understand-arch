# understand-arch v3.4 Spec(知识自迭代:Agent 检索层 + 决策回流 + 历史考古 + 真增量)

> Version: 3.4 · Status: Draft · 基于:`docs/spec-v3.3.md`(增量 delta,不重写 v3.0/v3.1/v3.2/v3.3)
> 主题:让知识库从「一次性 onboard + 人工触发刷新」升级为「随 commit / CR / ADR 自动增长 + 真正增量更新」,并给 Agent 一份检索优化的中间层。

---

## 0. 摘要

v3.0 解决架构理解底座,v3.1 补规格约束层,v3.2 补生产级出图能力,v3.3 补 CR 设计质量。v3.4 解决最后一块短板:

> 知识库目前是**一次性凝练 + 全量重跑**模式 —— 不会从日常 commit / CR / ADR 自动学习,onboard 之后每次刷新都得重推全图,贵且慢。Agent 拿到的还是给人看的叙事产物,检索效率有上限。

本轮借鉴 Qoder 知识引擎 2.0 的核心理念:**两步凝练 + 双轮自迭代**(原文:`https://qoder.com/blog/qoder-llm`),并把已经写好却没装配的 UA 底座增量原语完整接通。

v3.4 四个增量(对应高 ROI 4 项):

1. **A1 Agent-cards 派生层**:从 arch-layer / graph / constraints 派生 8 类高密度检索单元,**给 Agent 用,不给人看**;commit 共享。
2. **A2 决策回流约束层**:CR.md / ADR **合入主干后**自动抽 proposed-constraint,沉淀到约束层,等人确认;无需再跑一次 `/arch-interview`。
3. **A3 git-history 维度考古**:接 `arch-enrich` Phase 9.5(与 v3.1 constraint-miner 并列),挖 temporal coupling / hotspot / revert pattern,补「老员工脑子里的踩坑历史」。
4. **A4 真增量 onboard**:接通已写好却零调用的 UA 增量原语(`isStale` / `classifyUpdate` / `mergeGraphUpdate`),改 1 个文件只重跑受影响的 1-3 个节点,不再全量重推。

v3.4 用户入口数量不变(仍 7 个)。**所有增量 / 派生能力在默认路径下自动运行,用户无需感知任何新参数或新命令**。本 spec 后续提到的 `--incremental` / `--since` / `--full` 等参数仅作为高阶用法暴露在文档脚注,不进 README 主体;cards 派生层属于内部装配,**不暴露任何用户命令**(刷新 / 校验由 onboard / audit 自动触发)。

---

## 1. 全局规约(继承)

v3.4 继承以下铁律,本 spec 不复述详情:

1. LLM 语义推断只在 Skill / subagent 内执行,Node/Python 只做确定性读写/校验/合并/派生
2. 不推翻 v3.0 hard fork UA 底座 —— **本轮反过来更深地复用底座,严禁重复造轮子**
3. 不修改 v3.2 图能力路线
4. 不修改 v3.3 CR 写作合同 / pre-grill / CR-OPTION 流程
5. 所有面向人的产物默认中文,代码标识符/命令/schema 字段保留英文
6. confirmed 约束 + 规范层 仍是硬约束;proposed 约束仍是软阻塞,允许 override 并留痕
7. AI-mined 条目永不自标 confirmed,只有人能确认(v3.1 铁律)

新增铁律:

8. **优先复用 `engine/core` 已实现的增量原语**(`fingerprint.ts` / `staleness.ts` / `change-classifier.ts`)。任何新写「文件指纹 / git diff / 改动分类 / 节点合并」逻辑视为违规,需先证明底座不可用。

---

## 2. 需求来源

### 2.1 Qoder 知识引擎 2.0 对照

Qoder 核心理念是「两步凝练 + 双轮自迭代」:原始信号编译成 **Knowledge Card**(给 Agent),再凝练成 **RepoWiki**(给人);代码侧 commit 驱动增量,对话侧 plan/spec 驱动 Memory。

把 Qoder 公开框架与我们当前能力逐项对照,得出的高 ROI 借鉴清单:

| Qoder 能力 | 我们对应 | 缺口 → v3.4 项 |
|---|---|---|
| Knowledge Card(给 Agent 的高密度结构化检索单元) | graph + arch-layer + rules/constraints(同一份给人和给 Agent) | **A1 Agent-cards 派生层** |
| 对话侧 plan/spec 自动 Memory | `/arch-interview` 用户主动批量访谈(离线) | **A2 决策回流约束层** |
| commit message 隐性知识 + 代码侧自迭代 | 完全没接 git history | **A3 git-history 考古** |
| commit diff 级增量更新 | UA 底座有,架构层零调用 | **A4 真增量 onboard** |

故意不抄:

- 个人 vs 团队 Memory 分层 —— Claude Code 本身是个人工具,价值小
- repo+branch 上传锁 + 版本裁决 —— 我们本地优先,不需要服务端协作
- 六层能力栈营销包装(Knowledge Layer / Agentic Search 等命名) —— 实质能力已有,无需重新包装

### 2.2 UA 底座增量原语调用现状(grep 核实)

| UA 增量能力 | 代码位置 | 架构层调用 |
|---|---|---|
| `buildFingerprintStore`(产基线) | `engine/core/src/fingerprint.ts` | ✅ 唯一接入:`skills/arch-analyze/build-fingerprints.mjs` 调,产 `fingerprints.json` |
| `isStale` / `getChangedFiles`(git diff 找改动) | `engine/core/src/staleness.ts` | ❌ 零调用 |
| `classifyUpdate`(SKIP / PARTIAL_UPDATE / ARCHITECTURE_UPDATE / FULL_UPDATE 4 档) | `engine/core/src/change-classifier.ts` | ❌ 零调用 |
| `mergeGraphUpdate`(增量合并节点) | `engine/core/src/staleness.ts` | ❌ 零调用 |
| 比对 fingerprint 新旧 | `engine/core` 已实现 | ❌ 零调用 |

结论:**能力 100% 写好,装配率约 15%**。基线产完没人读,audit 只校验 `.fingerprint.json` 存在与否,enrich 全量重跑。v3.4 A4 主要工作是「装配 + 串接」,不是「实现」。

### 2.3 用户决策(讨论纪要)

| # | 决策 | 来源 |
|---|---|---|
| 1 | v3.4 同时做 A1+A2+A3+A4(不再拆 v3.4.5) | 用户拍板 |
| 2 | A2 触发时机:**合并主干后**(post-merge hook 自动 + audit 兜底,双保险) | 用户拍板 |
| 3 | A1 cards 默认 **commit 共享**(出 `intermediate/`,移到 `cards/`,git 跟) | 用户拍板 |
| 4 | A4 「改 1 文件只重跑相关节点」**进硬验收**,不达标返工 | 用户拍板 |
| 5 | 严禁重复造 UA 底座已有能力,优先装配复用 | 用户拍板 |

---

## 3. 目标 & 非目标

### 3.1 目标

1. `/arch-onboard --incremental`:接通 UA 4 档分类,SKIP / PARTIAL / ARCHITECTURE / FULL 各自正确处理,**改 1 个源文件 → enrich 只重推受影响的 ≤3 个 arch 节点**(硬指标)
2. `cards/agent-cards.json` 派生层产出,8 类卡(Component / Capability / Interface / DataModel / Flow / Risk / Constraint / Decision),`anchors` 字段双向可解析
3. `arch-design` / `arch-impact` / `arch-solution-designer` / `arch-senior-reviewer` 优先读 cards,raw layer 兜底
4. CR.md 合入 main 后自动跑 `arch-decision-extractor`,产 proposed-constraint(source: cr-derived),沉淀 `rules/constraints/`,等人 confirm
5. `arch-history-miner` 接 `arch-enrich` Phase 9.5(与 v3.1 `arch-constraint-miner` 并列),产 temporal coupling / hotspot / revert pattern → suspicious-findings + 候选 proposed-constraint
6. `npm run verify` exit 0,v3.0~v3.3 全部行为不破坏
7. 版本号 → `3.4.0-rc1`

### 3.2 非目标

- 修改 v3.3 CR 14 段结构或 pre-grill / CR-OPTION 流程
- 新增「集成视图层」/「行为视图层」/「数据深度」schema 维度 → **v3.5**(独立大改)
- 新写文件指纹算法 / git diff / 改动分类(UA 底座已实现,任何新写视为违规)
- 新写 LLM 子图召回算法(本轮派生层只做结构变换 + summary,不做向量检索)
- 任务级端到端效果评估(给 PRD 看 design 质量打分)→ **v3.4.5 候选**
- 个人 vs 团队 Memory 分层(Claude Code 本身是个人工具,不抄)

---

## 4. 用户视角变化

### 4.1 命令与默认行为

**用户感知:命令清单完全不变,仍是 7 个,所有 v3.0~v3.3 命令行为保留**:

```text
/arch-onboard   /arch-audit   /arch-design   /arch-wiki
/arch-diagram   /arch-dashboard   /arch-interview
```

**用户什么也不用学**。增量、派生、决策回流、历史考古全部在默认路径下自动发生:

| 用户做的事 | 内部自动发生 |
|---|---|
| 第二次跑 `/arch-onboard` | 自动走增量(对比 `fingerprints.json` 基线 → UA classifier 给 4 档动作)。首跑无基线时回退全量 |
| 第二次跑 `/arch-audit` | 自动跑 cards-check(anchor / source_hash 校验)+ 兜底跑 decision-extractor(扫上次 audit 以来合入 main 的 CR/ADR)|
| commit 到 main(若 `hooks_enabled: true`) | post-merge hook 自动跑 decision-extractor,产 proposed-constraint |
| `/arch-design` 跑 impact / solution | LLM 优先读 cards(高密度)而非 raw graph + layer,token 用量降、命中率升 |

### 4.2 高阶用法(脚注级,不进 README 主体)

仅在 `docs/` 或 `--help` 里出现的高阶参数,主流用户永远用不到:

```bash
/arch-onboard --full                # 强制全量重建(覆盖默认增量)
/arch-onboard --since=<git-ref>     # 显式指定增量起点 commit(默认读 state.yaml 上次记录)
```

`--incremental` **不作为参数暴露** —— 它就是默认行为。

### 4.3 内部装配,用户不感知

以下能力存在但不暴露任何命令 / 参数 / 用户操作:

- **cards 派生层**:无 `/arch-cards` 命令。刷新由 onboard / audit 自动 trigger,校验由 audit 自动跑。用户**最多在 `git status` 里看到 `.understand-arch/{p}/cards/` 这个目录被 commit**,默认不需要读
- **subset_mode / 4 档分类 / 反向索引 / decision-extractor / history-miner** —— 全部内部细节
- 唯一向用户呈现的「自迭代」证据是:audit 报告新增一段「自上次 audit 以来新增 proposed-constraint(来自 N 个 CR / M 个 history 信号)」,用户看到后可选择性 confirm

### 4.4 README 描述基调

只用**一句话**呈现自迭代能力,不展示任何命令:

> 知识库会从你日常的 commit、CR 和 ADR 自动学习,而不只是一次性 onboard。你写的方案、踩过的坑、改过的代码,都会沉淀回知识库供后续使用。

---

## 5. 实施要点

### 5.1 A1 Agent-cards 派生层

#### 5.1.1 路径与目录

```
.understand-arch/{project}/
├── cards/                          ← 新增,git 跟(默认 commit 共享)
│   ├── agent-cards.json            ← 派生主产物(8 类卡)
│   ├── index.json                  ← 文件路径 → card_ids + arch_node_ids 反向索引(供 A4 使用)
│   └── pinned.json                 ← 人工 pin 的卡片清单(不被覆盖)
```

注意:`cards/` 出 `intermediate/`(本来归 gitignore),改到 `.understand-arch/{project}/cards/`,从 .gitignore 拿掉。

#### 5.1.2 八类卡片定义

| 卡片类型 | 派生自 | 单卡覆盖 |
|---|---|---|
| `ComponentCard` | graph `component` 节点 + arch-layer `components[i]` | 一个组件:职责 / 关键接口 / 依赖 / 所属能力 |
| `CapabilityCard` | arch-layer `business_capabilities[i]` | 一项业务能力:实现组件 / 关联流程 / 对应风险 |
| `InterfaceCard` | graph `interface` / `endpoint` 节点 | 一个对外契约:协议 / 入参出参 / 调用方 |
| `DataModelCard` | graph `data-model` 节点 | 一个实体:字段 / 关键约束 / 使用方 |
| `FlowCard` | arch-layer `flows[i]` | 一条端到端流程:步骤 / 参与组件 / 错误路径 |
| `RiskCard` | arch-layer `risks[i]` + `debt[i]` | 一条风险/债务:位置 / 影响面 / 缓解状态 |
| `ConstraintCard` | `rules/constraints/*.md` 中 `状态: confirmed` 的条目 | 一条已确认约束:依据 / 违反检测 / 影响范围(**proposed 不进 cards**,等同 wiki 规则) |
| `DecisionCard` | `decisions/*.md`(ADR) | 一条架构决策:背景 / 选项 / 采纳理由 |

#### 5.1.3 卡片字段(JSON schema)

```json
{
  "$schema": "internal/schemas/agent-card.schema.json",
  "id": "card:component:auth-service",
  "type": "ComponentCard",
  "title": "Auth Service",
  "focused_summary": "<= 200 字高密度摘要,给 Agent 用,无叙事,无客套",
  "anchors": {
    "graph_node_ids": ["repo-a::component::auth-service"],
    "file_paths": ["src/auth/service.ts"],
    "line_ranges": [[12, 280]]
  },
  "semantic_tags": ["authentication", "jwt", "rate-limit"],
  "related_card_ids": ["card:capability:user-login", "card:constraint:CON-014"],
  "evidence_level": "observed",
  "source_artifact": "arch-layer.json#components[3]",
  "source_hash": "sha256:..."
}
```

新建 schema:`internal/schemas/agent-card.schema.json`(8 类卡共用,通过 `type` 区分)

#### 5.1.4 派生器与 summarizer

| 文件 | 类型 | 职责 |
|---|---|---|
| `engine/arch/cards-deriver.mjs` | 确定性 Node,无 LLM | 读 arch-layer / graph / constraints / ADR → 派生 8 类卡的结构 + anchors + tags + source_hash;`focused_summary` 字段先留空 |
| `agents/arch-card-summarizer.md` | LLM subagent | 输入空 summary 的卡片 + 其源材料,产出 ≤200 字 focused_summary;严禁叙事 / 客套 / 重复 title |
| `engine/arch/cards-check.mjs` | 确定性 Node | 校验所有 anchor 可解析(graph node id 存在 / 文件存在 / 约束 id 存在);source_hash 与源 actual hash 比对,不一致标 stale |

派生流程:

1. cards-deriver.mjs 跑一次 → 产卡片结构(summary 空)
2. arch-card-summarizer 跑一次 → 填 summary
3. cards-check.mjs 验收

#### 5.1.5 人工 pin 机制(高阶,不暴露命令)

参考 v3.1 约束保护机制:

- 用户在 `cards/pinned.json` 写 `["card:component:auth-service"]`(手工编辑)
- 派生器读 pinned.json,**pin 的卡片永不被自动覆盖**(包括 summary 和 anchors)
- 强制覆盖路径:直接删除 `pinned.json` 后下次 audit / onboard 会按默认派生

不提供任何强制刷新命令(`/arch-cards refresh --force` 在 v3.4 中不存在)。pin 是高阶能力,只在 `docs/advanced/cards-pinning.md` 单独说明。

#### 5.1.6 反向索引 `cards/index.json`

```json
{
  "src/auth/service.ts": {
    "card_ids": ["card:component:auth-service", "card:interface:auth-login"],
    "arch_node_ids": ["repo-a::component::auth-service"],
    "constraint_ids": ["CON-014"]
  }
}
```

供 A4 用:给定 changed files,O(1) 查到所有受影响的 cards / arch 节点 / 约束 ids。

### 5.2 A2 决策回流约束层(`arch-decision-extractor`)

#### 5.2.1 触发时机(双保险)

| 路径 | 实现 | 默认 |
|---|---|---|
| **a. post-merge hook** | `hooks/post-merge`:检测 main 合入 → 找最近 N 个 commit 引用的 CR.md / ADR → 跑 extractor | 用户开 `hooks_enabled: true` 时自动 |
| **b. audit 兜底** | `/arch-audit` 跑完扫 main 自上次 audit 以来新合入的 CR/ADR → 批量抽 | 始终启用 |

不依赖单一路径;hook 实时 + audit 兜底。

#### 5.2.2 抽取来源(CR.md 内)

- §4 详细设计(尤其 §4.6 约束符合性表 —— v3.1 引入)
- §5 替代方案对比(已被否决的设计取舍)
- §6 风险与缓解
- §11 关联(ADR 链接)

#### 5.2.3 产物

新建 source 类型:

```yaml
source: cr-derived         # 新增,与 ai-mined / interview / human 并列
```

更新 `internal/schemas/constraint.schema.json` 的 `source` enum + `engine/arch/constraint-check.mjs` 的 VALID_SOURCE 集合。

`cr-derived` 与 `ai-mined` 同等地位:不可自标 confirmed,只能 proposed(if/then 规则照搬 v3.1)。

#### 5.2.4 文件

| 文件 | 类型 |
|---|---|
| `agents/arch-decision-extractor.md` | 新 subagent prompt |
| `engine/arch/decision-extractor-runner.mjs` | 确定性 Node:扫 CR/ADR → 调 subagent → 合并入 `rules/constraints/`(走现有 constraint-writer 保护机制) |
| `hooks/post-merge` | 新 hook 脚本 |

### 5.3 A3 git-history 维度考古(`arch-history-miner`)

#### 5.3.1 接入点

`skills/arch-enrich/SKILL.md` Phase 9.5 CONSTRAINT-MINE 当前调 `arch-constraint-miner`;v3.4 改为**并列调用** `arch-constraint-miner` + `arch-history-miner`,产出合并写盘。

#### 5.3.2 三类产出

| 维度 | 信号 | 输出 |
|---|---|---|
| **temporal coupling** | 多文件经常一起改(同一 commit / 时间窗) | 候选 constraint:「这两个模块改动总是配套」+ 怀疑可能是隐式耦合 |
| **hotspot** | 高频变更 + 高复杂度 | suspicious-finding:可疑度高,可能是架构腐化点 |
| **revert pattern** | 历史 revert / hot-fix commit message | 候选 constraint:「这里改动需特别小心,曾被 revert N 次」 |

不实现:作者维度 / knowledge map(单人独占改动) —— 个人维度对单团队价值小,延后到 v3.5 评估。

#### 5.3.3 数据源

- `git log --numstat --format=...` 读 N 周历史(默认 26 周,可配置)
- commit message 文本 → LLM 抽取意图(refactor / fix / hotfix / revert)

#### 5.3.4 文件

| 文件 | 类型 |
|---|---|
| `agents/arch-history-miner.md` | 新 subagent prompt |
| `engine/arch/history-miner-runner.mjs` | 确定性 Node:跑 git log → 输入子图给 subagent → 合并产物到约束 / 怀疑库 |

### 5.4 A4 真增量 onboard

#### 5.4.1 装配复用(严禁重写)

| 调 UA 的什么 | 在哪里调 |
|---|---|
| `buildFingerprintStore` | 已有(`build-fingerprints.mjs`),不动 |
| `isStale(projectDir, lastCommitHash)` | **新接** `engine/arch/incremental-planner.mjs` |
| `getChangedFiles(projectDir, lastCommitHash)` | **新接** 同上 |
| `classifyUpdate(analysis, totalFilesInGraph, allKnownFiles)` | **新接** 同上,拿 4 档 `UpdateDecision` |
| `mergeGraphUpdate(existing, changedFiles, newNodes, newEdges, hash)` | **新接** 增量节点合并 |

任何新写以上能力的 PR 视为违规返工。

#### 5.4.2 增量计划器 `engine/arch/incremental-planner.mjs`

输入:`fingerprints.json` 基线 + 当前 HEAD
输出:执行计划 JSON

```json
{
  "action": "PARTIAL_UPDATE",
  "files_to_reanalyze": ["src/auth/service.ts", "src/auth/types.ts"],
  "rerun_architecture": false,
  "rerun_tour": false,
  "affected_arch_nodes": ["repo-a::component::auth-service"],
  "affected_card_ids": ["card:component:auth-service", "card:interface:auth-login"],
  "affected_constraint_ids": ["CON-014"],
  "reason": "2 files have structural changes: src/auth/service.ts (function signature changed), src/auth/types.ts (export added)"
}
```

`affected_*` 三个字段通过 `cards/index.json` 反向索引 O(1) 查出。

#### 5.4.3 4 档执行映射

| classifier action | 架构层执行 |
|---|---|
| `SKIP` | 不调 LLM;仅刷新 cards source_hash;cards-check 跑一遍 |
| `PARTIAL_UPDATE` | enrich 各 phase **subset_mode**:只重推 `affected_arch_nodes`;重派生受影响的卡 |
| `ARCHITECTURE_UPDATE` | 重 enrich 全 phase + 重派生全部卡 |
| `FULL_UPDATE` | 等同重新 onboard(用户提示「改动过大,建议全量重 onboard」,人确认后执行) |

#### 5.4.4 enrich phase subset_mode 接口

每个 phase(arch-layer / capabilities / quality / risk / cross-repo-link / constraint-mine / history-mine)新增可选输入:

```json
{
  "subset_mode": true,
  "subset_arch_node_ids": ["..."],
  "previous_arch_layer": "<merge target>"
}
```

LLM phase 拿到 subset 时,只对该子集 emit 新值,其他保持 `previous_arch_layer` 不动;Node 合并器(`arch-layer-writer.mjs`)按 id 替换。

各 phase 默认全量(向后兼容),subset_mode 是新增能力。

#### 5.4.5 命令入口(默认增量,参数对用户隐藏)

`skills/arch-onboard/SKILL.md` 内部增加 4 档分类调度与起点 commit 解析逻辑,**不向用户暴露 `--incremental` 参数**:

- **第一次跑(无 `fingerprints.json` 基线)**:全量(同 v3.3)
- **第二次起(基线存在)**:**自动走增量**,读 `.understand-arch/{p}/state.yaml` 上次 commit_hash
- 高阶参数(仅 `--help` 和 `docs/advanced/onboard-flags.md` 出现):
  - `--full`:强制全量,覆盖默认增量
  - `--since=<git-ref>`:显式指定起点 commit
  - `--incremental`:显式增量(等同默认行为,保留为 alias 方便脚本指定)

`/arch-cards` 命令在 v3.4 中**不存在**。cards 派生 / 校验 / 刷新全部由 onboard / audit 自动 trigger。

### 5.5 design/impact/senior 改读 cards

| Skill / Subagent | 改造 |
|---|---|
| `skills/arch-design/SKILL.md` | impact 阶段优先读 `cards/agent-cards.json`(按 semantic_tags 召回);raw graph + arch-layer 兜底 |
| `agents/arch-impact-analyzer.md` | 输入约定改为 cards id 列表;Rule 105 输出 shape 不变,内部检索路径走 cards |
| `agents/arch-solution-designer.md` | Rule 100~110 不动;在 §4 详细设计参考材料里增「Agent-cards 列表」一行 |
| `agents/arch-senior-reviewer.md` | 验收时校验「设计引用的 card_id 在 anchors 范围内」(避免设计引用了不存在的节点) |

不动 raw graph / arch-layer 任何 schema。

---

## 6. 文件清单

### 6.1 新增

#### Schema
- `internal/schemas/agent-card.schema.json`

#### engine/arch(确定性,无 LLM)
- `engine/arch/cards-deriver.mjs`
- `engine/arch/cards-check.mjs`
- `engine/arch/incremental-planner.mjs`
- `engine/arch/decision-extractor-runner.mjs`
- `engine/arch/history-miner-runner.mjs`
- `engine/arch/__tests__/cards-deriver.test.mjs`
- `engine/arch/__tests__/cards-check.test.mjs`
- `engine/arch/__tests__/incremental-planner.test.mjs`
- `engine/arch/__tests__/decision-extractor-runner.test.mjs`

#### agents(LLM subagent)
- `agents/arch-card-summarizer.md`
- `agents/arch-decision-extractor.md`
- `agents/arch-history-miner.md`

#### hooks
- `hooks/post-merge`

#### docs
- `docs/spec-v3.4.md`(本文档)
- `docs/audit-v3.4-impl.md`(实现后写)
- `docs/advanced/onboard-flags.md`(高阶:`--full` / `--since` / `--incremental` 说明,README 不引用)
- `docs/advanced/cards-pinning.md`(高阶:pinned.json 用法,README 不引用)

### 6.2 修改

- `internal/schemas/constraint.schema.json`:`source` enum 加 `cr-derived`
- `engine/arch/constraint-check.mjs`:VALID_SOURCE 加 `cr-derived`,if/then 规则:cr-derived 同 ai-mined 不得 confirmed
- `engine/arch/arch-layer-writer.mjs`:支持 subset_mode 合并(按节点 id 替换)
- `skills/arch-onboard/SKILL.md`:加默认增量调度 + 4 档执行 + 高阶参数(`--full` / `--since` / `--incremental` 仅 `--help` 暴露)
- `skills/arch-enrich/SKILL.md`:Phase 9.5 并列调用 constraint-miner + history-miner;各 phase 支持 subset_mode 透传
- `skills/arch-audit/SKILL.md`:加步骤「cards-check」+「decision-extractor 兜底扫合入 main 的 CR/ADR」+ 报告增段「自上次 audit 以来新增 proposed(N 条来自 CR / M 条来自 history)」
- `skills/arch-design/SKILL.md`:impact / solution 引用 cards 优先;senior 校验 card_id 引用合法
- `skills/arch-wiki/SKILL.md`:wiki 渲染保持不动(cards 不入 wiki)
- `agents/arch-impact-analyzer.md` / `agents/arch-solution-designer.md` / `agents/arch-senior-reviewer.md`:接 cards 输入
- `.gitignore`:`.understand-arch/*/cards/` **不忽略**(默认 commit 共享)
- `README.md` / `README.zh.md`:加**一句话**「知识自迭代」描述,**不列任何命令 / 参数 / cards 目录细节**;命令清单保持 7 个不变,正文不出现 `--incremental` / `/arch-cards` / `cards/` 字样
- `.claude-plugin/plugin.json` / `marketplace.json` / `package.json`:版本 → `3.4.0-rc1`

### 6.3 不动

- v3.0~v3.3 全部 schema(除 constraint.source enum 加值,见 6.2)
- v3.3 CR.md 14 段结构 / pre-grill / CR-OPTION 流程
- v3.2 fireworks 图能力 / vendor 目录
- v3.1 约束层全部产物
- v3.0 graph / arch-layer 节点类型

---

## 7. 依赖

无新增运行时依赖。

UA `engine/core` 已是 dependency,本轮深度复用,不升级版本。

---

## 8. 验收

### 8.1 确定性层

- [ ] `cards-deriver.mjs` 单测:8 类卡全产,anchor 解析通过,source_hash 与源一致
- [ ] `cards-check.mjs` 单测:故意断 anchor(删源文件)→ 准确报错;改源 hash → 标 stale
- [ ] `incremental-planner.mjs` 单测:
  - 改 cosmetic-only 文件 → action=SKIP
  - 改 1 文件 1 函数签名 → action=PARTIAL_UPDATE,affected_arch_nodes 长度 ≤ 3 **(硬指标)**
  - 改 11 个文件 → action=ARCHITECTURE_UPDATE
  - 改 31 个文件 → action=FULL_UPDATE
- [ ] `decision-extractor-runner.mjs` 单测:fixture CR.md → 准确产 proposed-constraint(source=cr-derived)
- [ ] `constraint-check.mjs` 更新单测:cr-derived + confirmed → 准确 fail
- [ ] `arch-layer-writer.mjs` subset_mode 单测:只改子集节点,其他保留
- [ ] `pinned.json` 保护机制:pin 的卡片不被覆盖(类比 v3.1 约束 confirmed 保护)
- [ ] `npm run verify` exit 0

### 8.2 LLM 层(本会话或真实 dogfood 抽检)

- [ ] 在已 onboard 项目上跑 `--incremental`,改 1 文件,验证 LLM 只重推受影响节点
- [ ] CR.md 合入 main,post-merge hook 触发 decision-extractor,产 proposed-constraint
- [ ] arch-history-miner 在真实 git history 上跑出 ≥1 条 temporal coupling + ≥1 条 hotspot

### 8.3 集成层

- [ ] **硬指标**:改 1 个源文件 → `/arch-onboard --incremental` 产物 diff 中,arch-layer.json 改动 ≤ 3 个节点;cards/agent-cards.json 改动 ≤ 3 张卡
- [ ] 不破坏 v3.3 CR 流程:跑一次 `/arch-design` 完整 flow,pre-grill / CR-OPTION / CR.md 全部正常
- [ ] 不破坏 v3.2 出图:跑一次 `/arch-diagram architecture --format=png`,正常出图
- [ ] cards 进 git:`git status` 显示 `.understand-arch/{p}/cards/` 是 tracked

### 8.4 文档

- [ ] README.md / README.zh.md「知识自迭代」段落完整,用户视角不暴露内部细节
- [ ] **README 零参数泄露**(硬指标):grep README.md / README.zh.md 不出现 `--incremental` / `--since` / `--full` / `/arch-cards` / `agent-cards` / `pinned.json` 字样
- [ ] `docs/advanced/onboard-flags.md` + `docs/advanced/cards-pinning.md` 写好,从 docs 索引可达,README 不引用
- [ ] `docs/audit-v3.4-impl.md` 三层验收报告齐全

---

## 9. 不做的事(v3.5 / v3.4.5 候选)

| # | 能力 | 推后到 | 理由 |
|---|---|---|---|
| 1 | 集成视图层 schema(topic / integration / contract 节点) | v3.5 | schema 大改,独立大轮次 |
| 2 | 行为视图层 schema(state-machine / business-rule) | v3.5 | 同上 |
| 3 | 数据深度(config-mapping / ER 基数 / DTO-DO) | v3.5 | 同上 |
| 4 | 任务级端到端效果评估 | v3.4.5 | 需构造典型任务测试集,独立 |
| 5 | 个人 Memory 维度 | 不做 | Claude Code 本身是个人工具,价值小 |
| 6 | git-history 作者维度 / knowledge map | v3.5+ 评估 | 单团队价值小,先观察 |
| 7 | LLM 子图召回 / 向量检索 | v3.5+ 评估 | cards 已经显著提升检索效率,先看效果再决定 |

---

## 10. 交付节奏

| 阶段 | 产出 | 复用 / 新增 |
|---|---|---|
| T1 | A1.1 cards-deriver + agent-card.schema + 8 类卡结构 + reverse index | 全新增 |
| T2 | A1.2 arch-card-summarizer + cards-check + pinned.json 保护 | 全新增 |
| T3 | A4.1 incremental-planner(装配 UA isStale / getChangedFiles / classifyUpdate)+ 4 档映射 | **装配复用 UA** |
| T4 | A4.2 enrich phase subset_mode + arch-layer-writer 子集合并 + `--incremental` 入口 | 改造 |
| T5 | A2 decision-extractor + post-merge hook + audit 兜底 + constraint.source 扩 cr-derived | 全新增 + 微改 schema |
| T6 | A3 history-miner + 接 enrich Phase 9.5 并列 | 全新增 |
| T7 | design/impact/senior 改读 cards 优先 | 改造 |
| T8 | README 双语 + 版本 3.4.0-rc1 + 三层验收报告 | — |

每 T 完成由 Claude 验收,T8 完成后整体 Codex 终审 → PR(目标分支:`feat/v3.3-impl`)。

---

## 11. 风险

| 风险 | 缓解 |
|---|---|
| 重复造 UA 已有能力 | 铁律 §8 + spec §2.2 grep 核实表 + Codex 终审时硬否决任何新写指纹/分类逻辑 |
| subset_mode 导致 arch-layer 一致性破坏(子集 enrich 后整体语义跑偏) | T4 单测覆盖:子集后 arch-layer schema 仍合法;cards-check 验 anchor 不断 |
| cards commit 后引入合并冲突(多人改约束 / pin) | pinned.json 设计成「id 列表」非「卡片副本」,合并冲突概率低;cards-deriver 设计为确定性输出,理论上同源同输出 |
| post-merge hook 跨平台兼容(Windows / WSL / Mac) | 沿用 v3.0 现有 hooks 框架;hook 失败不阻断 commit,只 warn |
| decision-extractor 抽取质量(CR.md 段落多杂质) | 限定从 §4.6 / §5 / §6 / §11 四段抽,不全文抽;proposed 状态等人确认才生效,假阳性可容忍 |
| 4 档分类阈值(>30 文件 / >50% 触发 FULL)对小仓不友好 | 当前 UA 阈值是常量;若 dogfood 发现问题,加 `--threshold-files=N` 覆盖,但本轮不动阈值 |
| cards 检索召回质量(semantic_tags 不够准) | 本轮先 LLM 派生 tags,不上向量检索;若效果不达标,v3.4.5 加 embedding |

---

## 12. 与 Qoder 对照后的边界声明(诚实)

- **不抄个人 vs 团队 Memory 分层**:Claude Code 是个人工具,这层价值小
- **不抄上传锁 / 版本裁决**:本地优先,不需要服务端协作
- **不抄六层能力栈营销包装**:实质能力已有,不重新包装
- **本轮 cards 不上向量检索**:semantic_tags 由 LLM 派生,够用即可;真有需要 v3.4.5+
- **不动 schema 大改**:集成 / 行为 / 数据深度三大视图等 v3.5
