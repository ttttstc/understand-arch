# understand-arch v3.0 Spec

> Version: 3.0
> Status: Draft(设计评审)
> Supersedes: v2.0(同为 breaking change;v3.0 改变实现底座)
> Last Updated: 2026-05-28

---

## 0. 摘要

`understand-arch` v3.0 是一套**专注高级架构师的代码与架构分析 Claude Code plugin**,支撑单仓/多仓业务系统的架构决策与方案设计。

### v3.0 相对 v2.0 的根本变化

v2.0 试图"提取 Understand-Anything(UA)的零件重新组装",结果丢掉了 UA 最关键的资产 —— 那套**已验证能在 Claude 会话里 dispatch subagent 的多 phase 扫描编排**,导致真实项目(Typola)跑出来只有确定性骨架,LLM 推断层整个断裂。

v3.0 纠正方向:**Hard fork 整个 UA 仓库作为底座**,UA 的扫描编排一行不重写,我们只在其上叠加"架构师层"。

```
understand-arch v3.0 = UA(代码 → 知识图谱,继承不重写) + 架构师层(图谱 → 决策/方案/风险/能力/合规,我们的核心竞争力)
```

### v3.0 铁律(违反 = 架构错误,非 bug)

> **任何 LLM 语义推断必须是 SKILL 里的 subagent dispatch(Claude 会话内执行)。Node/Python 脚本只允许做确定性的事(扫文件、tree-sitter 抽取、算 fingerprint、合并/校验 JSON、渲染模板)。绝不允许把多 phase 的 LLM 编排压进一个脚本。**

这是 v2.0 失败的根因,v3.0 最高优先级不变量。

### v3.0 关键决策一览(实施合同摘要)

| 决策 | 结论 |
|---|---|
| Fork 策略 | Hard fork 整个 UA 仓,改名 understand-arch,从此独立维护 |
| 数据模型 | **双层**:UA graph(代码事实层)+ 架构师层(独立文件,引用 graph node id) |
| 多仓 | 每仓独立 graph + **自建 cross-repo linker**(借鉴 UA 去重逻辑,但保留跨仓边) |
| 架构师层 | **重,核心竞争力**;扫描期追加 phase + 设计期独立 skill |
| 命令 | `arch-*` 系列(6 用户入口);UA `/understand` 编排逻辑继承但不暴露命令 |
| Dashboard | **升级**显示架构师层;独立 `/arch-dashboard` 入口 |
| Agent 命名 | UA 原生 agent 保留原名(底层引擎标识);架构师层用 `arch-*` 前缀 |
| 删除 | UA 的 knowledge / chat / tour / language-lesson 模式 |
| 验收 | 三层:代码层继承 UA graph-reviewer / 架构师层扩展 / wiki+dashboard 新建,统一"脚本+LLM"范式 |
| 空缺判别 | 严格:onboard 扫完架构师层必须有内容,否则 onboard fail |
| 目录侵入面 | 用户项目根只放 `.understand-arch/` 一个目录 |

---

## 1. 第一性原理与产品定位

### 1.1 产品本质

```
代码理解(UA 已做到 31K star 成熟度) + 架构师工作流(我们的差异化)
```

- UA 把"代码 → 知识图谱"做到成熟:多语言、增量、并行、subdomain merge、dashboard 可视化
- 我们的价值在"图谱 → 架构师决策":能力地图、NFR/风险/技术债推断、方案设计(CR)、决策留底(ADR)、团队约束(rules)、多仓拓扑

### 1.2 工程姿势(第一性原理结论)

> **绝不重新发明 UA 已经做好的扫描/图谱层。100% 新增工作量投入架构师层。**

v2.0 在错误的层(扫描编排)重造轮子,这是失败根因。v3.0 让 UA 做它最擅长的,我们专注上层。

### 1.3 服务目标(按优先级)

1. **架构决策与方案设计**(`/arch-design`):基于 PRD/需求产出影响面、改动点、实战级方案文档
2. **完整系统架构、功能、风险、技术债分析**(`/arch-onboard` / `/arch-audit`)
3. **多仓统一架构视图**(跨仓事实集成)
4. **架构可视化**(`/arch-dashboard`:升级版 dashboard 显示架构师层)
5. **新同事快速接手**(`/arch-wiki`:14 页人类视图)
6. **4+1 视图**(`/arch-diagram`:v3.0 占位,v3.1 实现图片生成)

---

## 2. 总体架构(三层)

```
understand-arch  (hard fork of understand-anything)
│
├─【底座层】继承 UA,几乎不改 ────────────────────────────────
│   • 扫描编排:scan → batch → 并行 file-analyzer → assemble → architecture → domain → graph-review
│     (UA skills/understand/SKILL.md 的 7-phase 编排,原样继承,改名为 arch-analyze)
│   • 多语言 extractor / 增量更新(fingerprint + staleness)
│   • 代码知识图谱(16 node + 29 edge,UA 原生 schema)
│   • subdomain merge 的去重/dangling 逻辑(借鉴,不直接用于多仓)
│
├─【架构师层】我们的核心竞争力,重 ★★★ ──────────────────────
│   • 能力地图(capability × maturity × importance × gaps)
│   • 质量层(NFR / risk / technical_debt 推断,强制 confidence + evidence)
│   • 决策层(ADR append-only)
│   • 变更层(CR.md 方案设计 + senior-reviewer 质量门)
│   • 约束层(rules 团队规范)
│   • 多仓 + cross-repo 拓扑(cross-repo linker)
│
├─【可视化层】继承 UA dashboard + 扩展 ─────────────────────────
│   • UA 原有:代码图谱可视化
│   • 新增:能力地图 / 风险热力 / 多仓拓扑 / CR 影响面视图
│
└─【交付层】───────────────────────────────────────────────
    • wiki 14 页(人类视图,可 commit,可 diff)
    • dashboard(交互可视化)
```

---

## 3. Fork 策略与仓库结构

### 3.1 Hard fork

- 一次性 fork `understand-anything` 整个仓,改名 `understand-arch`
- **不保留上游 rebase 通道**(我们要深改内部,rebase 不现实)
- 保留 UA MIT license + NOTICE 归属(`Copyright (c) Yuxiang Lin`)

### 3.2 仓库目录(plugin 侧)

```
understand-arch/
├── .claude-plugin/
│   ├── marketplace.json              # 极简(让 Claude Code 自动发现 skill)
│   └── plugin.json                   # 极简(只 name/version/description)
├── skills/                           # 自动发现为 slash command
│   ├── arch-onboard/SKILL.md
│   ├── arch-design/SKILL.md
│   ├── arch-audit/SKILL.md
│   ├── arch-wiki/SKILL.md
│   ├── arch-diagram/SKILL.md
│   ├── arch-dashboard/SKILL.md       # ★ v3.0 新增用户入口
│   ├── arch-analyze/SKILL.md         # 内部:UA understand 编排(Phase 0-6),只产代码层 graph
│   ├── arch-enrich/SKILL.md          # 内部:架构师层(Phase 7-12),产 arch-layer.json
│   ├── arch-frame/SKILL.md           # 内部:PRD HARD GATE
│   ├── arch-adr/SKILL.md             # 内部:ADR append-only
│   └── arch-review/SKILL.md          # 内部:CR review + 调 senior-reviewer
├── agents/                           # 自动发现为 subagent
│   ├── project-scanner.md            # UA 原生保留(原名)
│   ├── file-analyzer.md              # UA 原生保留
│   ├── architecture-analyzer.md      # UA 原生保留
│   ├── domain-analyzer.md            # UA 原生保留
│   ├── graph-reviewer.md             # UA 原生保留
│   ├── assemble-reviewer.md          # UA 原生保留
│   ├── tour-builder.md               # UA 继承 + 改造为架构导览(删 languageLesson)
│   ├── arch-capability-analyzer.md   # ★ 新增(架构师层)
│   ├── arch-quality-analyzer.md      # ★ 新增
│   ├── arch-impact-analyzer.md       # ★ 新增
│   ├── arch-solution-designer.md     # ★ 新增
│   └── arch-senior-reviewer.md       # ★ 新增
├── engine/                           # UA packages/core fork + 我们的确定性工具
│   ├── core/                         # UA core 原样(tree-sitter / fingerprint / staleness / parsers / extractors)
│   ├── tools/                        # UA 脚本(scan-project / compute-batches / extract-* / merge-batch-graphs)
│   └── arch/                         # ★ 我们的确定性工具
│       ├── cross-repo-linker.(mjs)   # 多仓:保留跨仓边(替代 UA merge)
│       ├── arch-layer-writer.(mjs)   # 架构师层 JSON 读写 + schema 校验
│       ├── cr-md-editor.(mjs)        # CR.md 段级编辑(防覆盖)
│       ├── wiki-projection-check.(mjs) # wiki 投影完整性 + 占位扫描
│       └── fingerprint-multi-repo.(mjs)
├── dashboard/                        # UA dashboard fork + 架构师层视图扩展
├── hooks/                            # git commit 自动刷新(默认关闭)
├── templates/rules/                  # 6 份团队约束中文模板
├── samples/                          # 单仓 + 多仓 dogfood 样例
├── internal/
│   ├── schemas/                      # graph schema(继承 UA)+ 架构师层 schema
│   ├── acceptance/                   # 验收 gate
│   └── rubrics/                      # 验收 rubric
└── docs/
```

### 3.3 删除的 UA 资产

| UA 资产 | v3.0 |
|---|---|
| `skills/understand-knowledge` + `article-analyzer` agent | ❌ 删(文档知识图谱模式) |
| `skills/understand-chat` | ❌ 删(RAG 问答) |
| `tour-builder` agent + tour 渲染 | ✅ **保留改造**为架构导览(决策 13,见 §9.4),非删除 |
| `language-lesson` + TourStep.languageLesson 字段 | ❌ 删(语言教学;tour 改造时一并删此字段) |
| `knowledge-graph-guide` agent | ❌ 删 |
| `skills/understand-onboard / -explain / -domain / -diff / -dashboard` | 能力并入我们的 arch-* skill,命令删(dashboard 升级为 /arch-dashboard) |

---

## 4. 数据模型(双层)

### 4.1 工作区结构

```
用户项目根/
└── .understand-arch/                          # ★ 唯一侵入目录
    ├── .gitignore                             # 自动生成(排除 intermediate/ + 埋点)
    └── {project}/
        ├── specs/
        │   ├── repos.yaml                      # 多仓注册表(单仓 = N=1)
        │   ├── repos/{repo_id}/
        │   │   ├── knowledge-graph.json        # ★ UA 原生 graph(代码事实层,基本不动)
        │   │   └── .fingerprint.json
        │   └── arch-layer.json                 # ★ 架构师层(我们的核心,引用 graph node id)
        ├── wiki/                               # 14 页(进 git)
        ├── rules/                              # 团队约束(用户编辑)
        ├── decisions/ADR-*.md                  # append-only(进 git)
        ├── change-requests/CR-*/CR.md          # 方案设计(进 git)
        ├── state.yaml                          # workflow 状态
        ├── dashboard/                          # 渲染后的 dashboard 产物(可选 commit)
        └── intermediate/                       # 扫描中间产物(gitignored)
```

### 4.2 双层关系

| 层 | 文件 | 内容 | 谁产 | 改 UA 吗 |
|---|---|---|---|---|
| 代码事实层 | `specs/repos/{repo}/knowledge-graph.json` | UA 原生 16 node + 29 edge + layers | UA 编排(继承) | 几乎不改,仅加 `repo_id` 前缀 |
| 架构师层 | `specs/arch-layer.json` | capability / quality_attributes / risks / technical_debt / cross_edges / architecture_decisions / change_requests / traceability / known_unknowns | 我们的架构师 phase + skill | 全新 |

**关键设计**:架构师层**引用** graph 的 node id(`{repo_id}::{ua-node-id}`),不复制节点。UA graph 升级不破坏架构师层。

### 4.3 Node ID 命名

- UA 原生 node id 形如 `file:src/app.ts`
- v3.0 多仓加 repo 前缀:`{repo_id}::file:src/app.ts`
- 架构师层所有 `*_node_ids` 字段引用此全局唯一 id

### 4.4 架构师层 schema(`arch-layer.json`)

顶层结构(详细字段定义见 `internal/schemas/arch-layer.schema.json`):

```typescript
interface ArchLayer {
  version: "3.0"
  project: { name, description, repos: RepoMeta[], analyzed_at }
  cross_edges: CrossEdge[]              // 跨仓边(cross-repo linker 产)
  capabilities: Capability[]            // 能力地图(arch-capability-analyzer 产)
  quality_attributes: QualityAttribute[]// NFR(arch-quality-analyzer 产)
  risks: Risk[]                         // 风险(同上)
  technical_debt: TechnicalDebt[]       // 技术债(同上)
  architecture_decisions: ADRRef[]      // ADR 索引(arch-adr 产)
  change_requests: CRRef[]              // CR 索引(arch-design 产)
  traceability: TraceLink[]             // CR ↔ node ↔ ADR
  known_unknowns: KnownUnknown[]        // 诚实层
  freshness: FreshnessMeta              // 多仓 fingerprint 汇总
}
```

字段 enum/约束沿用 v2.0 已定义(capability maturity/importance、NFR 8 类、risk 5 类、debt 5 类、全部 LLM 推断字段强制 `confidence` + `evidence_refs`)。

---

## 5. 扫描流程(继承 UA 编排 + 架构师 phase)

### 5.1 双 skill 拆分:arch-analyze(代码层)+ arch-enrich(架构师层)

扫描流程按双层数据模型拆成两个内部 skill,职责清晰:

- **`arch-analyze`** = **直接继承 UA `skills/understand/SKILL.md` 的 844 行编排**(连 subagent dispatch 模板一起搬,仅改输出路径到 `.understand-arch/` + node id 加 repo 前缀)。只跑 Phase 0-6,产代码层 graph。**UA 编排一行不重写。**
- **`arch-enrich`** = v3.0 全新,跑 Phase 7-12,消费代码层 graph 产架构师层 `arch-layer.json`。

`arch-onboard` 编排顺序:每仓 `arch-analyze` → `cross-repo-linker` → `arch-enrich`(跨仓维度)。

```
【arch-analyze:UA 原生 phase(继承,不重写)】
Phase 0  Pre-flight
Phase 1  SCAN            → project-scanner subagent
Phase 1.5 BATCH          → compute-batches(确定性)
Phase 2  ANALYZE         → file-analyzer subagent ×N 并行
Phase 3  ASSEMBLE        → merge-batch-graphs(确定性)+ assemble-reviewer
Phase 4  STRUCTURE       → architecture-analyzer subagent
Phase 5  DOMAIN          → domain-analyzer subagent
Phase 6  GRAPH-REVIEW    → graph-reviewer subagent(代码层验收)
         ↓ 产出 UA 代码 graph(每仓一份)
【arch-enrich:架构师 phase(v3.0 新增)★】
Phase 7  CAPABILITY      → arch-capability-analyzer subagent   → arch-layer.capabilities
Phase 8  QUALITY         → arch-quality-analyzer subagent      → arch-layer.{quality_attributes,risks,technical_debt}
Phase 9  CROSS-REPO LINK → cross-repo-linker(确定性)+ 必要时 LLM 辅助 → arch-layer.cross_edges
Phase 10 ARCH-TOUR       → tour-builder(改造为架构导览)subagent → arch-layer.tour(串 graph + capability/risk/ADR)
Phase 11 ARCH-REVIEW     → graph-reviewer(扩展 mode)+ arch-layer 投影检查 + tour 引用检查 → 架构师层验收
Phase 12 FINALIZE        → 写 specs/arch-layer.json + 多仓 fingerprint
```

**铁律落地**:Phase 7/8/10 的 LLM 推断**全部是 SKILL 内 subagent dispatch**,不进任何 node 脚本(Phase 9 确定性为主,模糊跨仓判断走 dispatch)。

### 5.2 大项目分片(吸取 Typola P0-B 教训)

- 继承 UA 的 BATCH 分片(`compute-batches`),file-analyzer 按 batch 处理,**绝不一次性序列化全量文件**
- 确定性工具处理单文件时流式,不把所有文件全文塞进一个 JSON.stringify

---

## 6. 多仓与 cross-repo

### 6.1 多仓编排(arch-onboard 层)

```
/arch-onboard
  → 读 repos.yaml(N 个仓)
  → 对每个仓:跑 arch-analyze 的 UA phase 0-6(产该仓 knowledge-graph.json,带 repo_id 前缀)
  → cross-repo-linker:跨仓关系抽取(见 6.2)
  → 架构师 phase 7-11(跨仓维度:capability/quality 可跨仓)
  → arch-wiki 渲染 + dashboard 渲染
```

单仓 = N=1,走同一路径,无分叉。

### 6.2 cross-repo-linker(不用 UA merge,自建)

**为什么不用 UA `merge-subdomain-graphs.py`**:它把所有仓合并成扁平 graph,**会丢 repo 归属、误合并同名节点、且把跨仓边当 dangling 删掉** —— 跨仓边恰是我们最值钱的部分。

**cross-repo-linker 的职责**:
- 各仓 graph **保持独立**(不合并),节点带 `repo_id` 前缀
- 扫描跨仓引用(import 跨仓包、`@repo/...`、服务名调用、共享 schema 等)
- 跨仓边写入 `arch-layer.cross_edges`,标 `cross_repo: true`,保留 source/target/evidence
- **借鉴** UA merge 的去重逻辑(同 key 去重、weight 取大)+ dangling 检测,但 dangling 跨仓边**不删,标 known_unknown**
- 确定性可判的直接写;模糊的(服务名动态调用)交 LLM 辅助判断(SKILL dispatch,不进脚本)

---

## 7. Subagent 套件(7 继承 + 5 新增 = 12)

### 7.1 UA 原生继承(保留原名,不重写)

| Subagent | 职责 | v3.0 改动 |
|---|---|---|
| `project-scanner` | 项目扫描 | 仅输出路径 → `.understand-arch/` |
| `file-analyzer` | 文件级 LLM 抽取(并行主力) | 仅 node id 加 repo 前缀 |
| `architecture-analyzer` | 架构分层 | 不改 |
| `domain-analyzer` | 业务领域 | 不改 |
| `graph-reviewer` | 代码图谱验收 | 加 arch-layer 投影检查 + tour 引用检查 mode |
| `assemble-reviewer` | 装配审 | 不改 |
| `tour-builder` | 引导式导览 | **改造为架构导览**:串 graph + capability/risk/ADR,架构师视角(全景→能力→链路→风险→决策),删 languageLesson,受众化联动(详见 §9.4) |

### 7.2 架构师层新增(arch-* 前缀)

| Subagent | 职责 | 输出 | 强约束 |
|---|---|---|---|
| `arch-capability-analyzer` | 能力地图(capability × maturity × importance × gaps) | arch-layer.capabilities | confidence + evidence_refs |
| `arch-quality-analyzer` | NFR / risk / technical_debt 推断 | arch-layer.{quality_attributes,risks,technical_debt} | confidence + evidence_refs |
| `arch-impact-analyzer` | CR 影响面 + 改动清单(分 core / adjacent 两组,堵 Typola F5) | CR.md frontmatter#impact + § 8 | 命中权重分级 |
| `arch-solution-designer` | CR.md 14 段方案撰写 | CR.md § 1-7 + § 9-13 | 引用 graph/rules/ADR/CR 证据 |
| `arch-senior-reviewer` | 高级架构师终审(design + wiki + arch-layer) | JSON verdict + findings + retry_hints | 反占位、反弱化词、反骨架 |

---

## 8. Skill 套件(6 用户入口 + 5 内部 = 11)

### 8.1 用户入口

| Skill | 触发 | 内部 |
|---|---|---|
| `/arch-onboard` | 接手项目 | 多仓编排 → arch-analyze(每仓)→ cross-repo-linker → 架构师 phase → wiki + dashboard |
| `/arch-design` | 设计 PRD | arch-frame → arch-impact-analyzer → arch-solution-designer → arch-review(senior) |
| `/arch-audit` | 基线可信吗 | 多仓 fingerprint freshness + drift(借鉴 UA understand-diff)+ 架构师层完整性 |
| `/arch-wiki` | 出 wiki / 汇报 | 渲染 14 页 + 受众化(cto/newcomer/pm/architect)+ wiki-reviewer |
| `/arch-diagram` | 画 4+1/C4 | v3.0 占位(wiki 已含 Mermaid),v3.1 出图 |
| `/arch-dashboard` ★ | 看可视化 | 启动升级版 dashboard(代码图谱 + 架构师层视图) |

### 8.2 内部 skill

| Skill | 职责 |
|---|---|
| `arch-analyze` | UA 编排(Phase 0-6,继承不重写),产代码层 graph |
| `arch-enrich` | 架构师层(Phase 7-12),消费 graph 产 arch-layer.json |
| `arch-frame` | PRD HARD GATE(≥3 未答问题 block) |
| `arch-adr` | ADR append-only + 写 arch-layer.architecture_decisions[] |
| `arch-review` | CR review + 调 arch-senior-reviewer |

---

## 9. 架构师层详细

### 9.1 CR.md(方案设计,单文件 14 段)

沿用 v2.0 §4.1.2.1 标准 14 段(背景/现状/方案概述/详细设计/替代方案/NFR/风险/改动清单/实施步骤/回滚/测试/待定/关联/Review)。

- 多 subagent 协作写同一 CR.md,段级写权限 + cr-md-editor 防覆盖(沿用 v2.0 §4.1.2.3)
- frontmatter:cr_id / title / status / owner / created / prd_link / affects_repos / impact{added/modified/removed/estimated_files_changed}

### 9.2 影响面分级(堵 Typola F5)

arch-impact-analyzer 输出**两组**,不混在一起:
- **core impacted set**:graph id 精确命中 + PRD 明确提到的文件(confidence=high)
- **adjacent review set**:文本弱命中、文档(design.md 等)(confidence=medium/low)

CR.md § 8 改动清单分组呈现,研发先看 core。

### 9.3 ADR / rules / capability / quality

- ADR:append-only md + arch-layer 索引(沿用 v2.0)
- rules:`rules/*.md` 6 份模板(banned-patterns/compliance/network-boundaries/naming/tech-radar/dependencies),LLM 现读
- capability/quality:arch-capability-analyzer / arch-quality-analyzer 推断,强制 confidence + evidence

### 9.4 架构导览(arch-tour,决策 13)

继承 UA `tour-builder` + `TourStep` 结构 + dashboard tour 渲染 + graph-reviewer tour 检查,**改造为架构师视角的交互导览**。

**与 UA 原 tour 的差异**:

| 维度 | UA 原 tour | v3.0 架构导览 |
|---|---|---|
| 视角 | 教新人读代码(语法/模块) | 架构师视角:全景 → 核心能力 → 关键链路 → 风险点 → 关键决策 |
| 数据 | 只 graph | graph + **arch-layer**(capability / risk / ADR) |
| languageLesson 字段 | 教语法 | **删除** |
| 渲染 | dashboard 导览 | dashboard 交互导览(步进 + 高亮节点)+ wiki onboarding 静态投影 |
| 受众 | 单一 | **受众化联动**:newcomer 走全景路径,cto 走能力+风险路径,architect 走全路径 |

**数据落点**:`arch-layer.tour`(TourStep[],step 的 nodeIds 引用 graph node + arch-layer 节点)。

**导览步骤示例**(架构师视角,而非代码学习):
> 步骤 3「核心能力:实时协同编辑」→ 高亮支撑节点(graph: editor module / sync service)→ 关联能力卡(arch-layer.capability,maturity=growing)→ 提示关联风险(arch-layer.risk: 并发冲突,severity=high)→ 关联决策(ADR-005)

**渲染双投影**:
- dashboard:交互式(点步进 + graph 高亮 + 能力/风险卡片)
- wiki:`01-overview` 的"设计阅读顺序"段 + `13-pending-changes` 之外,可在 onboarding 视角生成 tour 的静态文本版

**验收**:tour 每个 step 的 nodeIds 必须引用存在的 graph/arch-layer 节点(graph-reviewer tour 检查,UA 已有,继承扩展)。

---

## 10. Wiki + Dashboard

### 10.1 Wiki(14 页,沿用 v2.0 结构)

01-overview / 02-components / 03-interfaces / 04-data-models / 05-capabilities / 06-quality / 07-risks-and-debt / 08-deployments / 09-flows-and-scenarios / 10-decisions / 11-changes / 12-rules / 13-pending-changes / 14-diagrams + README。

### 10.2 Dashboard(升级,决策 8/10）

- fork UA dashboard
- **新增架构师层视图**:能力地图、风险热力、多仓拓扑、CR 影响面
- **架构导览**(arch-tour,§9.4):交互式步进 + graph 高亮 + 能力/风险卡片;继承 UA dashboard 的 tour 渲染改造
- 独立 `/arch-dashboard` 启动
- 事实源与 wiki/graph 一致(同一 arch-layer.json + graph)

---

## 11. 验收(三层,统一"脚本 + LLM"范式)

### 11.1 范式(继承 UA graph-reviewer)

UA graph-reviewer 的范式:**先写确定性脚本跑检查 → 再 LLM 渲染 approve/reject 决策**。三层验收全照此范式。

### 11.2 三层验收

| 层 | 验收器 | 确定性脚本检查 | LLM 检查 |
|---|---|---|---|
| 代码层 | `graph-reviewer`(UA 继承) | schema / 引用完整性 / layer 覆盖 / 唯一性 / 质量 9 类 | approve/reject 决策 |
| 架构师层 | `graph-reviewer` 扩展 + `arch-quality-analyzer` 自检 | capability/risk/NFR 字段完整 + confidence/evidence 必填 + node id 引用存在 | maturity/severity 判断合理性 |
| wiki + dashboard | `wiki-reviewer`(新建)+ `arch-senior-reviewer` | **投影完整性**(graph 有的 wiki 必须呈现)+ **占位扫描**(待补充/TODO/默认 Mermaid)+ **空缺合法性**(读 graph 判断空是否合法) | 实质判断(讲透没/maturity 反映没) |

### 11.3 关键验收规则(堵 Typola F3/F4/F6)

1. **投影完整性**:`arch-layer.capabilities` 非空 → wiki/05 必须覆盖;risks 非空 → 07 必须覆盖;缺 = finding
2. **占位 vs 合法空缺**:graph 该层有内容但 wiki 写"待补充" = finding;graph 该层确实空 + wiki 诚实声明 + 记 known_unknowns = pass
3. **严格空缺(决策 11=B)**:`/arch-onboard` 跑完,arch-layer 的 capability/quality/risk **至少要有内容**,否则 onboard 本身 fail(架构师工具扫完一片空白 = 没干活)
4. **CR 实质性(堵 F6)**:senior-reviewer 对满是占位的 CR 不得 pass;占位词计 finding
5. **wiki-lite / wiki-full 二级**:日常刷新 lite(占位扫描+投影);首次/cto/architect full(加 senior 实质判断)

### 11.4 验收 gate

| Gate | 对应 |
|---|---|
| `onboard.yaml` | 代码层 + 架构师层 + wiki 投影 + 严格空缺 |
| `design.yaml` | CR.md 14 段 + senior design review |
| `audit.yaml` | fingerprint freshness + drift |
| `wiki.yaml` | wiki 投影 + 占位 + senior wiki review |
| `dashboard.yaml` ★ | dashboard 视图与 graph/arch-layer 一致(独立 gate,决策 12=A) |

---

## 12. 实施合同(给 codex /goal)

### 12.1 不变量(违反 = 架构错误)

1. **LLM 推断必须 SKILL dispatch**:Node/Python 脚本只做确定性事,绝不压多 phase LLM 编排进脚本(v2.0 死因)
2. **UA 编排不重写**:arch-analyze 继承 UA understand 844 行编排,连 dispatch 模板一起搬,只改输出路径 + repo 前缀
3. **双层不混**:UA graph 是代码层(几乎不动),架构师层独立文件引用 node id
4. **跨仓边不丢**:cross-repo-linker 保留跨仓边,不用 UA merge(它会删边)
5. **目录侵入面**:用户项目根只放 `.understand-arch/` 一个目录
6. **架构师层强证据**:capability/quality/risk 全部带 confidence + evidence_refs
7. **严格空缺**:onboard 扫完架构师层为空 = onboard fail
8. **Append-only**:ADR md + CR.md § 14 Review + state.history 仅追加
9. **单仓 N=1 退化无分叉**
10. **manifest 极简**:marketplace.json / plugin.json 不列 skills/agents/hooks 数组,让 Claude Code 自动发现(否则 slash command 不出现)

### 12.2 实施顺序

```
Impl-1  Hard fork UA 仓 → 改名 understand-arch → 删 knowledge/chat/tour/lesson → 跑通 UA 原生测试(确保底座没坏)
Impl-2  改输出路径 .understand-anything/ → .understand-arch/{project}/;node id 加 repo 前缀;UA 6 agent 保留
Impl-3  arch-analyze SKILL = 继承 understand 编排 + 占位架构师 phase 框架
Impl-4  engine/arch/ 确定性工具:cross-repo-linker / arch-layer-writer / cr-md-editor / wiki-projection-check / fingerprint-multi-repo
Impl-5  5 个架构师 subagent prompt(capability/quality/impact/solution/senior,每个完整 prompt 非占位)
Impl-6  arch-layer.schema.json + 架构师 phase 7-11 接入 arch-analyze
Impl-7  多仓编排(arch-onboard)+ cross-repo-linker 落地
Impl-8  6 用户入口 + 4 内部 skill 全部 SKILL.md(含 dispatch 模板)
Impl-9  wiki 14 页渲染 + wiki-reviewer + senior wiki review
Impl-10 dashboard fork + 架构师层视图 + /arch-dashboard
Impl-11 验收 5 gate + rubric + hooks(默认关闭)
Impl-12 e2e:单仓 + 真实多仓(Typola 级)dogfood,全链路 LLM 推断必须真跑
```

### 12.3 验收 checkpoint

| Impl | checkpoint |
|---|---|
| 1 | UA 原生测试全 pass(`pnpm test`),证明 fork 没破坏底座 |
| 3 | arch-analyze 能在 Claude 会话里跑通 UA 7-phase 产 graph(真 dispatch subagent) |
| 5 | 5 个架构师 subagent prompt 每个 ≥100 行,非占位 |
| 7 | 真实多仓 onboard 产出每仓 graph + cross_edges 非空 |
| 9 | wiki 投影完整性脚本能挡住骨架 wiki(Typola F4 场景测试) |
| 12 | 真实项目跑完:graph 有 module/service、arch-layer 有 capability/NFR/risk(非空白),wiki 无占位,senior-review 对真实 CR 给出实质 findings |

### 12.4 禁止行为

- 重写 UA 扫描编排(必须继承)
- 把 LLM 推断写进 node 脚本
- 用 UA merge 合并多仓(会丢跨仓边)
- 让 onboard 产出空白架构师层还报 pass
- manifest 列 skills/agents/hooks 数组(破坏自动发现)
- 自行修改本 spec 的核心决策

---

## 13. 删除清单(UA → v3.0)

| 删除 | 原因 |
|---|---|
| knowledge 模式(article/entity/topic/claim/source + article-analyzer + understand-knowledge) | 文档知识图谱,不在架构师范围 |
| chat(understand-chat) | RAG 问答,v3.0 不做 |
| tour(tour-builder + tour 渲染) | 学习路径,wiki 代替 |
| language-lesson | 语言教学 |
| knowledge-graph-guide agent | 使用引导 |

---

## 14. v2.0 → v3.0 变化

| 维度 | v2.0 | v3.0 |
|---|---|---|
| 底座 | fork UA core 重组装(丢了编排) | hard fork 整仓,继承编排不重写 |
| LLM 层接入 | ❌ 压进 node 脚本,断裂 | ✅ SKILL dispatch,铁律 |
| 数据模型 | 扩展 UA graph 塞字段 | 双层(graph + arch-layer 独立) |
| 多仓 | 自己拼 | 每仓独立 + cross-repo-linker |
| 用户入口 | 5 | 6(加 /arch-dashboard) |
| Subagent | 9(含复刻改造,易丢功能) | 11(6 UA 原生继承 + 5 新增) |
| dashboard | 无 | 升级显示架构师层 |
| 验收 | 只验形状(Typola F4 翻车) | 投影完整性 + 占位 + 严格空缺 |

---

## 15. 未进 v3.0(v3.1+ 候选)

- `/arch-diagram` 真实图片生成(C4 + 4+1)
- RAG 问答(基于 graph + arch-layer + wiki + CR/ADR)
- AI/agent 架构 KB
- UA 上游更新的可选 cherry-pick(hard fork 后非自动)

---

## 附录 A:与 v2.0 spec 的关系

`docs/spec-v2.0.md` 完整废弃(其"fork core 重组装"路线被证明会断裂)。v3.0 是新事实源。v2.0 的**产品需求层**(多仓 / CR.md 14 段 / wiki 14 页 / rules / senior-reviewer / 目录侵入面)全部保留并继承到 v3.0;**实现底座**从"fork core"改为"hard fork 整仓继承编排"。

Typola 真实验证报告(`.understand-arch/typola/test-validation-report.md`)的 F1-F6 是 v3.0 设计的直接动因,对应解决:
- F1(JSON 爆)→ §5.2 继承 UA BATCH 分片
- F3(LLM 层断)→ §0 铁律 + §5.1 架构师 phase SKILL dispatch
- F4(验收太松)→ §11.3 投影完整性 + 严格空缺
- F5(影响面虚高)→ §9.2 core/adjacent 分级
- F6(骨架 CR 放行)→ §11.3 占位检测 + senior 实质判断
