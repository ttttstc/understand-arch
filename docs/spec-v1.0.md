# 架构师 Workflow Skill 套件 — 完整方案(v1.0 spec)

> **Updated: 2026-05-24** | **Status: APPROVED**, ready to build
> Diagnostic record: `./architect-skill-suite-office-hours-2026-05-24.md`
> Supersedes: 2026-05-22 原 draft(15 skill 设计已废,关键洞察合并入本文)

---

## 一句话定位

> **面向高级软件架构师的 evidence-driven workflow skill suite,以「架构交付件」为中心,而不是又一个 coding agent。**

具体差异化:

- **不是给建议,而是给交付件**(描述类:wiki / ADR / 设计文档 / 实施方案 / 图,不含 src/IaC)
- **不是做搜索,而是做证据链**(5+1 YAML schema-locked 契约层,每条判断回链 `evidence_refs`)
- **不是只看代码,而是把业务驱动力 + 系统演进放一起**(architecture_profile LLM 自动识别)
- **不是单次对话,而是可复用 workflow + append-only 架构史**

---

## 设计三大支柱

1. **以交付件为中心** —— workflow 输出是可验收的产物组合(5 yaml + 6 wiki + diagrams + ADR + design-docs + 实施方案),不是"聊天对话有用结论"
2. **5+1 YAML schema-locked 契约层** —— subagent 与主上下文之间**不通过自然语言**传递,而是结构化 yaml + 强制 evidence_refs
3. **Governance 即 Moat** —— append-only ADR + 反合理化清单 + 企业知识库 + 验收 loop,**LLM 越能"乱产"越需要 governance**,这是套件**随 LLM 加宝**的关键

---

## 1. 架构师工作四层(理论框架)

高级架构师日常工作不只是"画图",分四层。每层映射到对应 skill:

| 层 | 内容 | 映射 skill |
|---|---|---|
| **洞察(Insight)** | "这事为什么现在做"/"业务驱动是什么"/"哪些约束不可谈判"。把"表面诉求"翻译成"架构问题定义" | `arch-frame`、`arch-radar` |
| **代码工程分析** | "现有系统怎么跑"/"真实模块边界"/"关键路径+脆弱点+耦合源"/"CI/CD 是否支持目标演进" | `arch-analyze`(4 档深度) |
| **技术架构分析** | "current state"/"目标状态与演进原则"/"多备选+权衡"/"容量/可靠/安全/一致/可观测/可维护"/"迁移路径" | `arch-diff-judge`、`arch-options`、`arch-adr`、`arch-diagram` |
| **架构交付件输出** | 架构师价值不在脑内模型,在可执行交付件 | `arch-pack`、`arch-review` |

---

## 2. 业界对标(为什么这套件值得做)

截至 2026-05-22 GitHub 现状:

| 仓库 | ⭐ | 与架构的关系 |
|---|---|---|
| hesreallyhim/awesome-claude-code | 44.5k | 总清单,架构无独立分区 |
| **wshobson/agents** | **35.8k** | **最值钱对标**。架构能力**散在各 plugin**(十几个 `*-architect` agent + c4-architecture plugin + ADR skill) |
| VoltAgent/awesome-claude-code-subagents | 20.3k | 100+ subagent,架构 agent 散落各分类 |
| 0xfurai/claude-code-subagents | 907 | 100+ dev subagent,同样散 |
| LerianStudio/ring | 189 | 89 skill + 38 agent,工程实践强制,非架构专用 |
| arango1988/ai-software-architect-agent-and-skills | 0 | 单 senior 架构师 subagent,强制 SOLID |

**关键空白**:**没有人把架构师的完整工作流(洞察→代码工程分析→技术架构→交付件)做成 workflow 套件**。市场要么是角色 agent(act as architect),要么是孤立 point skill(ADR / C4 单干)。**差异化空间真实存在。**

**已被验证的点 skill 形态**:ADR(wshobson)、C4(wshobson c4-architecture)。**借鉴形态,不重复造**——本套件复用 `fireworks-tech-graph` 渲染,参考 wshobson ADR 范式。

---

## 3. v1.0 完整规格

### 3.1 Skill 总数

**9 个 = 8 MVP + 1 按需**

- MVP 必装:`arch-workflow / arch-frame / arch-analyze / arch-diff-judge / arch-options / arch-adr / arch-diagram / arch-review / arch-pack`
- 按需(MVP 不必):`arch-radar`

### 3.2 命名与定位

- 前缀 **`arch-*`**(无 ni- 前缀,与 harness track `agent-legible` 同款)
- 目录 **`skills/`**,ni-skill 第 3 track(article / harness / architect)

### 3.3 边界(只产描述类)

| 类型 | 例 | 产? |
|---|---|---|
| 描述类 | `*.md`(ADR / RFC / wiki / 实施方案)、`*.yaml`(5+1 资产)、`*.mmd`、`*.svg/.png` | ✅ |
| 可执行/可消费 | Terraform / Helm / DDL 迁移脚本 / `.gitlab-ci.yml` / `.github/workflows/*` / 服务骨架 / OpenAPI 客户端代码 / 业务代码 | ❌ |

**判定原则**:「这产物是描述/解释架构,还是用来生成/运行系统?」前者产,后者不产。

---

## 4. 9 个 Skill 详细定义

### 4.1 `arch-workflow` —— 编排器

- **角色**:纯调度,不做业务
- **4 modes**:`onboard / audit / design / brief`
- **触发**:`/arch` 主入口 / `/arch:onboard|audit|design|brief` 直接 mode / 自然语言

| Mode | 自然触发 | 用途 |
|---|---|---|
| `onboard` | 接手 / 摸熟 / 全景 / 给个 overview / 这是个什么系统 | 新接手系统完整测绘 |
| `audit` | 架构审计 / 体检 / 健康度 / 该不该重构 / **审视当前项目 / 审视架构** | 现状评估 + 改造建议 |
| `design` | 这需求怎么设计 / 根据 PRD 设计架构 / 出 RFC / 出实施方案 / 迁移方案 | 需求/变更架构设计 |
| `brief` | 准备汇报 / 给 CTO 一份 / 整理 PPT | 受众适配汇报材料 |

- **职责**:状态机 + integrity check + prereq check + 验收 loop + 反合理化清单 + KB 加载 + architecture_profile 路由

### 4.2 `arch-frame` —— 问题界定(forward-looking)

- **回答**:"我们想干什么"
- **输入**:brief / PRD / user story / change request + 用户对话
- **输出**:`项目总览.yaml`(含 `design_intent` + `architecture_profile` + `org_constraints`)
- **subagent**:否(对话型)
- **核心机制**:
  - **PRD HARD GATE**:命中 ≥3 个具体未答问题 → 产 `PM问题清单.md` → workflow 暂停在 `awaiting-pm-confirmation`,等用户填文件或对话回答
  - **architecture_profile**:LLM 从代码 + 描述自动识别架构风格 + 主要关切 + 推荐加载的 references + 推荐插入的 phase(`internal/phases/` 里选)
  - **加载企业 KB**(Gap A 落地):从 `~/.understand-arch/kb/` 读 banned-patterns 等 → 塞进 `org_constraints`

### 4.3 `arch-analyze` —— 全面分析架构现状(backward-looking)

- **回答**:"这系统是什么样、哪儿不对"
- **输入**:代码库
- **输出**:仓库清单 + 依赖图 + C4 现状 + 风险台账(按 depth 不同)
- **subagent**:**必须**(整个代码库是输入)
- **4 档深度**:

| depth | 产出 | 何时用 |
|---|---|---|
| `manifest` | 仓库与组件清单.yaml + 依赖与链路图谱.yaml | 接手 baseline、design 前缀步 |
| `model` | + C4 现状视图(.mmd) | onboard 完整、画现状架构 |
| `risk` | + 风险与技术债台账.yaml | 审计、找耦合/热点 |
| `full` | manifest + model + risk 全做 | onboard mode 默认 |

- **mode 选择**:workflow 内部显式指定(80% 场景)/ 触发词推断 / 默认起 manifest;**所有深度 mode 启动前必须显式预算预告**

### 4.4 `arch-diff-judge` —— 变更影响识别(假设性分析)

- **回答**:"改 X 会动什么"
- **输入**:变更诉求(**强制**) + analyze baseline
- **输出**:`影响面.yaml`(受影响 services / modules / apis / data_models / events / permissions / deployments / configs)
- **subagent**:**必须**
- **特殊性**:必须有 change request 输入;没给就拒绝跑,要求先 frame

### 4.5 `arch-options` —— 方案探索 + 权衡

- **输入**:frame 输出 + analyze baseline + judge 影响面(design mode)
- **输出**:`options.md`(≥2 方案 OR 单方案需说明"为什么不拆第二方案")+ 决策矩阵
- **强制 4 列**:**影响面 / 模块依赖变化 / 数据模型变化 / 回滚策略**(模板硬约束,缺一拒绝交付)
- **对照企业 KB**(Gap A):违反 banned-patterns → 方案降级或拒绝,标记冲突
- **subagent**:可选

### 4.6 `arch-adr` —— 决策记录

- **输入**:决策 + 上下文(可独立用,可被 options 接力)
- **输出**:`ADR-NNN-xxx.md`,**append-only,永不修改**
- **7 段强制**:Status / Date / Context / Decision / Consequences(正反) / Alternatives(≥1) / Evidence
- **v1.1**:加 optional `fitness_spec` 字段(可执行检查规格)
- **subagent**:否

### 4.7 `arch-diagram` —— 建模渲染

- **输入**:设计描述 / 代码库 / analyze 模型产物
- **输出**:Mermaid 文本 + 可选 SVG/PNG
- **后端**:**fireworks-tech-graph 主,Mermaid 降级**(见 §8.3)
- **图类型**:C4 context/container/component、deployment、sequence、data flow
- **subagent**:否

### 4.8 `arch-review` —— 评审(双模式)

- **doc mode**:评设计文档质量 / readiness(主上下文)
- **code mode**:评 PR / 架构漂移(**必须 subagent**)
- **输入**:design doc 或 代码库/PR
- **输出**:`arch-review.md`(风险按严重度排序 + 漂移偏差 + ATAM 权衡点 + **org-conformance 检查结果**)
- **v1.1**:加 `fitness` mode(主动跑所有 ADR 的 `fitness_spec`)

### 4.9 `arch-pack` —— 受众适配交付

- **输入**:全部上游产物(汇编,不重新发明)
- **输出**:audience × format 矩阵适配
- **audience**:`onboarding / decision / dev-implementation / management`
- **format**:`wiki / md / html / pptx`
- **design mode 强制 9 产物**:4 强制 md + options + ADR + design-doc + **实施方案.md(SE 细化设计)** + 图规格
- **`实施方案.md` 17 章固定结构**:需求摘要+验收 / 目标实现架构 / 受影响服务 / 接口设计 / 数据模型 / 权限安全 / 关键流程时序 / 错误降级 / 配置发布 / 数据迁移回填 / 测试计划 / 可观测性 / 实施任务拆解 / 联调发布顺序 / 兼容性 / 风险清单 / 研发注意事项
- **subagent**:否

### 4.10 (按需) `arch-radar` —— 行业对标

- **触发场景**:新平台选型 / 大重构 / 现代化改造 / 行业 benchmark
- **subagent**:**必须**(联网递归研究)
- **输出**:外部研究摘要 yaml + 对标矩阵 + 推荐结论

---

## 5. 5+1 YAML 资产契约

### 5.1 Project-scoped(5 类)

| Yaml | 谁产 | 内容 |
|---|---|---|
| 项目总览.yaml | `arch-frame` | 业务目标 / NFR / 约束 / 范围 / design_intent / architecture_profile / org_constraints |
| 仓库与组件清单.yaml | `arch-analyze --depth=manifest` | 多仓清单 / owner / 入口 / 构建 / 部署 |
| 依赖与链路图谱.yaml | `arch-analyze --depth=manifest` | 仓间 / 服务间 / 外部依赖 / 关键业务链路 |
| 风险与技术债台账.yaml | `arch-analyze --depth=risk` | 风险 / 债务 / 影响范围 / 严重度 / 处置建议 |
| 决策与证据索引.yaml | `arch-adr` + `arch-options` | ADR 索引 / 决策矩阵 / 待决策问题 / 假设 |
| (design 专属)影响面.yaml | `arch-diff-judge` | 受影响 services/modules/apis/data/permissions/deployments |

**所有 yaml 强制 `evidence_refs` 字段**(证据可追溯)。详细 schema 见 `internal/schemas/` + office-hours doc Appendix A。

### 5.2 Org-scoped(第 6 类,Gap A 落地)

位置:`~/.understand-arch/kb/`(用户级)或 `<org>/.arch-kb/`(团队级)

| Yaml | 内容 |
|---|---|
| `banned-patterns.yaml` | 禁用模式 / 规则 / 严重度 |
| `compliance-redlines.yaml` | 合规红线 |
| `network-boundaries.yaml` | 网络边界规则 |
| `naming-conventions.yaml` | 命名规范 |
| `tech-radar.yaml` | 已批准 / 试验中 / 弃用的技术栈 |

**加载机制**:`arch-frame` 启动时读 → 塞进 `项目总览.yaml.org_constraints`。`arch-options` 选方案时强制对照。`arch-review` 加 org-conformance 检查。

**加载失败行为**:
- 目录不存在 → degrade-with-warning,标 `not_configured`(让首次用户能跑通)
- 文件 schema 不过 → **fail-loud**,暂停 workflow,告诉用户哪个文件哪行错
- 部分缺失 → 加载存在的,缺的标 `not_loaded`,继续

---

## 6. `arch/{项目名}/` 目录与生命周期

**两个顶层 bucket,边界清晰**:`agent/` = 引擎契约(人不需要看),`user/` = 给人看的全部交付件。

```
arch/{项目名}/
│
├── agent/                            🤖 引擎契约,人不需要看
│   ├── 状态.yaml                     workflow 状态机 + baseline_commits + overrides 索引 + integrity history
│   ├── 证据/                         5+1 yaml 事实源(LLM 回链用)
│   │   ├── 项目总览.yaml             arch-frame 产
│   │   ├── 仓库与组件清单.yaml       arch-analyze 产
│   │   ├── 依赖与链路图谱.yaml       arch-analyze 产
│   │   ├── 风险与技术债台账.yaml     arch-analyze 产
│   │   ├── 决策与证据索引.yaml       arch-adr / arch-frame 产
│   │   └── 影响面-{change}.yaml      (design 模式时每次变更一份)
│   ├── 覆盖记录/                     人工 acceptance override 审计(append-only)
│   │   └── OVR-NNN-{topic}.yaml
│   ├── PM问题清单.md                 (HARD GATE 时产出,等用户/PM 答;清单本质是引擎状态)
│   └── 指标.jsonl                    每个 skill 跑完 append 一行(Premise 2 验证依赖)
│
└── user/                             ★ 给人看的全部在这里
    ├── README.md                     ★ 入口:健康度 + 当前 workflow 状态 + 全部产物导航
    │
    ├── 知识库/                       (mutable,持续更新,7 页)
    │   ├── 首页.md
    │   ├── 01-系统全景.md            仓库 + 组件 + ownership + 业务能力地图 + 演进史
    │   ├── 02-现状架构.md            Container + Deployment + 协议矩阵 + 边界
    │   ├── 03-关键业务链路.md        3-5 详细 flow + 数据资产清单
    │   ├── 04-质量与风险.md          NFR 当前水位 + 风险 + 技术债 + 漂移
    │   ├── 05-决策与待办.md          ADR 时间线 + 待答问题 + 治理
    │   └── 06-能力雷达.md            业务能力矩阵 + 技术能力评分 + 演进规划
    │
    ├── 架构图/                       (mutable,Mermaid 源 + 可选 SVG/PNG)
    │   └── *.mmd
    │
    ├── 决策史/                       (append-only,ADR 国际通用术语保留)
    │   └── ADR-NNN-xxx.md
    │
    ├── 设计变更/                     (append-only,每次 design 一目录,3 文件)
    │   └── {change}/
    │       ├── 设计文档.md           合并:变更请求 + 影响面摘要 + 方案权衡 + 回滚方案
    │       ├── 实施方案.md           SE 细化设计 17 章
    │       └── 评审报告.md           workflow-end self review
    │
    ├── 审计/                         (append-only,扁平,date+topic 区分文件)
    │   ├── {date}-体检.md            audit mode 产
    │   ├── {date}-评审-{topic}.md    /arch-review --mode=doc 单独调用产
    │   └── {date}-PR评审-{pr-id}.md  /arch-review --mode=code 产
    │
    └── 汇报/                         (append-only,单文件 + audience-stamped)
        └── {date}-{audience}.md
```

### 设计原则

- **agent/ 与 user/ 严格分**:agent/ 是机器契约 + 结构化事实,人极少需要直接读;user/ 是人类可读交付件,从 README.md 开始即可
- **文件数最小化**:每个 change 收敛到 3 文件(原 10);每次审计 1 文件;每份汇报 1 文件
- **产物中文化**:agent/ 内已是 5+1 yaml 中文名;user/ 内全部交付件中文名;ADR 国际通用保留;Mermaid 文件名英文(文件名是 ID-like)
- **append-only 标识更显式**:决策史 / 设计变更 / 审计 / 汇报 全部 append-only,人为不允许改

`agent/指标.jsonl` 字段:`ts / skill / mode / inputs_summary / outputs_paths / duration_s / token_estimate / overrides_used / verify_passed`。**Premise 2 验证依赖此**,v1.0 必埋。

### 生命周期管理

- **首次运行**:建工作目录(从 `arch/_template/` copy)+ 跑 mode pipeline + 落产物
- **二次运行**:
  - `integrity check`:`agent/状态.yaml` + 文件完整性
  - 缺失自动恢复:`agent/证据/`、`user/知识库/`、`user/架构图/` 派生产物静默重建;`user/决策史/`、`user/设计变更/`、`user/审计/`、`user/汇报/` 缺失停止,要求 git restore(append-only 不允许悄悄消失)
  - `prereq check`:audit 无 baseline → 默认自动接 onboard
  - manifest commit hash 漂移检测 → 提示是否刷新 baseline
- **过期检测**:产物 frontmatter 记录 `baseline_commits`,与当前对比

---

## 7. 工程不变量

| 不变量 | 体现 |
|---|---|
| 只产描述类 | markdown / yaml / mermaid / svg,不产 IaC/DDL/pipeline/骨架/src |
| 5+1 yaml 是事实源 | 任何 LLM 判断必须回链 yaml 条目 |
| 主上下文洁净 | 4 必/3 条件 heavy skill 用 subagent 隔离 |
| 关键路口前预告 | 重操作前显式预算 + 等用户确认或中断 |
| 整体性优先 | integrity check 不过就停,绝不在残缺 baseline 上跑 |
| append-only 史 | ADR/design-docs/audits/briefs 永不改 |
| 显式降级 | fireworks 没装 → mermaid + 标注;验收失败 → degraded + 原因 |
| HARD GATE 量化 | ≥N 具体未答问题 = gate,evidence = `PM问题清单.md` |

---

## 8. 关键机制详细

### 8.1 Goal-Driven Acceptance Loop

两层验收:

- **Structural**(脚本 / JSON Schema,秒级):字段完整 / 引用闭合 / schema 通过 → **每 phase 结束跑**
- **Semantic**(LLM 评分 subagent,**强制 rubric checklist 而非自由判断**,**review subagent ≠ 原产 subagent**避免自证)→ **workflow 结束跑**

不达标行为:
- 自动 retry ≤ 2 次
- 第 3 次仍不过 → 显式用户裁判(retry with hints / manual fix / override skip / abort)
- **不让 retry 进入空转**

每 mode 的 acceptance checklist 存 `internal/acceptance/{mode}.yaml`。

#### 各 mode acceptance 要点

| Mode | Structural | Semantic 阈值 |
|---|---|---|
| onboard | 5 yaml + 6 wiki + 3+ diagrams + state.yaml | 10 验收问题(基于研究 §13.7 思路)通过 7/8(允许 1 项 degraded) |
| design | 4 强制 md + ADR 7 段齐 + 实施方案 17 章齐 | 全过(高风险输出,不允许 degraded)|
| audit | 风险台账 + 技术债清单 + 评审报告 + 改造路线图 | 全过 |
| brief | 汇报包 + 管理层摘要 ≤ 1 页 | 全过 |

### 8.2 PRD HARD GATE(量化触发)

`arch-frame` 解析 PRD 后,**命中 ≥3 个具体未答问题就 block**:

- 必填字段缺失(业务目标 / 验收标准 / 范围)
- 验收标准不可量化("低延迟"无数字)
- NFR 关键维度未表态
- non-goals 模糊
- 检测到歧义句
- 关键依赖未明

产 `PM问题清单.md`(分 🔴 BLOCKING / 🟡 WARNING 两级),`state.yaml.phase=awaiting-pm-confirmation`。

两种返回路径:
- 用户编辑文件填答案 → 用户说"继续" → frame 重读文件 → 重检
- 用户对话直接答 → workflow 写答案到清单留底 → 同样重检

未全答完 → 重生成精简清单(只列剩余)→ 再等。

### 8.3 `arch-diagram` backend 选择

| 场景 | 默认 backend | 理由 |
|---|---|---|
| 汇报 / Wiki / 管理层摘要 | **fireworks** | publication-ready |
| 设计文档 / RFC 正式版 | **fireworks** | 同 |
| PR review / 代码库内 diff-able | **Mermaid** | 文本可 diff |
| 设计中快速迭代 | **Mermaid** | 改 yaml 重生成 |
| fireworks 不可用 | **Mermaid** | 降级,显式标注 |

**style 映射**:
- C4 Context / 系统全景 → fireworks style 1 (Flat Icon) 或 6 (Claude Official)
- C4 Container / 微服务拓扑 → **style 3 (Blueprint)**(用户主战场)
- Deployment 部署图 → style 3
- Sequence → fireworks UML 或 Mermaid sequence
- **Agent / LLM 架构 → style 5 (Glassmorphism)**(fireworks 强项域)

### 8.4 反合理化清单(workflow 硬规则)

封住 LLM 常见捷径:

| 捷径 | workflow 反驳 |
|---|---|
| 「先出报告,证据后补」 | 没证据 = 没产物。reject |
| 「这仓看起来不重要」 | 没进 manifest 不许排除 |
| 「图可以凭描述画」 | 必来自依赖图或目标设计资产 |
| 「风险先写几个典型」 | 必有影响范围 / 严重度 / 证据 |
| 「PPT 只是汇报,不严格」 | 必记录来源资产 + 生成时间 |
| 「先帮我改 src 业务代码」 | 拒绝,提示用 Cline / aider 等 coding agent |

### 8.5 `architecture_profile` LLM 路由(非 keyword)

`arch-frame` 在分析阶段输出 architecture_profile 字段。**不靠 keyword 路由**(僵化、过时),靠 **LLM 读 `arch-library/MANIFEST.md` 自选** + 读 `internal/phases/MANIFEST.md` 自选 phase。

profile 示例:
```yaml
architecture_profile:
  identified_styles: [微服务, REST API, LLM 应用 + RAG]
  primary_concerns: [可靠性, 成本, RAG 召回质量]
  recommended_references:
    - microservices-patterns/service-decomposition.md
    - agent-architecture/rag-patterns.md
    - nfr-checklists/reliability.md
  recommended_phases: [eval-design]
  recommended_diagram_style: blueprint
  user_override: null
```

workflow 展示 profile 等用户确认/调整(关键路口),改完写回 `项目总览.yaml`,workflow 用最终版执行。

**未来扩展机制**:加新技术栈(如数据架构 / 边缘 / IoT)= **加一份 reference 到 MANIFEST**,workflow 不用改。

---

## 9. 触发关键词全集(用户视角速查)

```
# 整套用(workflow)
接手 / 摸熟 / 全景 / 给个 overview         → /arch:onboard
架构审计 / 体检 / 审视当前项目/架构        → /arch:audit
根据 PRD 设计 / 出 RFC / 实施方案 / 迁移   → /arch:design
准备汇报 / 给 CTO 一份 / 整理 PPT          → /arch:brief
不确定 / 模糊                              → /arch(交互式问)

# 零散调用(原子 skill)
写 ADR / 记个决策                          → /arch-adr
画 C4 / 出架构图 / 拓扑图                  → /arch-diagram
测绘 / manifest / 服务清单                 → /arch-analyze --depth=manifest
找风险 / 找耦合 / 找技术债                 → /arch-analyze --depth=risk
画现状 C4                                   → /arch-analyze --depth=model
影响面 / 改 X 会动什么                     → /arch-diff-judge
评审设计 / 这设计能用吗                    → /arch-review --mode=doc
PR review / 是不是偏离架构                 → /arch-review --mode=code
业界都怎么做 / 选型调研                    → /arch-radar
评估几个方案 / 技术选型                    → /arch-options
界定一下 / 我们到底要解决什么              → /arch-frame
```

---

## 10. 5 个借鉴模式(业界提炼,已落地)

1. **Research → Review → Revise → Publish**(GPT Researcher)→ `arch-radar` 递归研究
2. **Plan → Act 分离**(aider / Cline)→ `arch-workflow` 编排 vs 原子 skill 执行
3. **Role-specialized subagents**(Claude Code / OpenHands / Roo Code)→ heavy skill subagent 隔离
4. **Trigger-based reusable micro-skills**(OpenHands microagents)→ 企业 KB(`~/.understand-arch/kb/`)的灵感来源
5. **Architecture as code**(ADR / C4 / Structurizr)→ append-only ADR + Mermaid + 5+1 yaml + v1.1 fitness_spec

---

## 11. v1.1 Roadmap

- **ADR `fitness_spec` 字段**(architecture-as-policy 闭环)
- **`arch-review --mode=fitness`**(主动跑所有 ADR 的可执行约束)
- **ADR 语义检索**(累积后召回相似旧决策)
- **`arch-library/` 深度扩展**(超过 200 行/域,做成真正的架构手册)
- **`internal/phases/` 库扩展**(capacity-planning / threat-modeling / migration-planning / data-governance)
- **多模型 review subagent**(用别的模型评 Claude 产出,缓解自证问题)

---

## 12. Build Order(立即开工)

1. ⭐ **`arch-workflow` SKILL.md 提纲** ← 立刻
2. 5+1 yaml 资产 JSON Schema(`internal/schemas/`)
3. `arch-frame` SKILL.md(含 PRD hard gate + 加载 KB + architecture_profile)
4. `arch-analyze` SKILL.md(4 档 + subagent 触发阈值)
5. `arch-diff-judge` SKILL.md
6. `arch-options` SKILL.md(对照 KB)
7. `arch-adr` SKILL.md
8. `arch-diagram` SKILL.md(fireworks 集成 + Mermaid 降级)
9. `arch-review` SKILL.md(doc/code 双模式 + org-conformance)
10. `arch-pack` SKILL.md(audience × format 矩阵 + 实施方案 17 章模板)
11. `arch-library/` **v1.0 seed**(每域 ≤200 行;深度扩展放 v1.1)
12. `internal/phases/eval-design.md`(其它 phase 按 dogfood 反馈扩)
13. `arch/{project}/` template + sample(可用 office-hours assignment #1 的 prototype 当 sample)

---

## 13. Premises(v1.0 必须验证)

来自 office-hours 诊断:

1. **Premise 1**:v1.0 发布后 30 天内拉到 5 个 first user 真用并反馈 — 否则 OSS 模式崩
2. **Premise 2**:Governance 价值随 LLM 能力提升而加宝 — 跑 90 天靠 `.metrics.jsonl` 数据验证(决策追溯次数 / 漂移命中 / ADR 复用率)
3. **Premise 3**:**Gap A(企业知识库 first-class)必须做进 v1.0**,Gap B(fitness function)v1.1 延后

---

## 14. 文档关系

| 文档 | 用途 |
|---|---|
| 本文件(`architect-skill-suite-research.md`)| **v1.0 完整规格,长期维护** |
| `architect-skill-suite-office-hours-2026-05-24.md` | 诊断记录(Q&A + Premises + 8 founder signals + Assignment + Appendix A YAML schema sketch),不再更新 |
| `internal/schemas/*.json` | yaml 资产的可执行 JSON Schema |
| 每个 `arch-*/SKILL.md` | skill 实现规格 |
| `arch-library/MANIFEST.md` | references 索引(LLM 用来挑) |
| `internal/phases/MANIFEST.md` | phases 库索引 |
| `internal/acceptance/{mode}.yaml` | 每 mode 的验收 checklist |

---

## 附录:Supersedes 历史

- **2026-05-22**:原 `architect-skill-suite-research.md` v1 draft —— 15 skill 设计、5 用户可见 + 10 内部、`ni-arch-*` 命名、无 architecture_profile 机制、无 HARD GATE、无 6+ yaml org KB
- **2026-05-22 → 2026-05-24**:15+ 轮深度迭代:
  - form 选型(skill / workflow / agent → skill 主体 + subagent 隔离)
  - subagent 分类(4 必 + 3 条件 + 8 主上下文)
  - skill 收敛(15 → 9)
  - `arch-recover` 拆 survey+assess 再合并为 analyze+judge(轴心从"描述 vs 评估"改为"现状 vs 变更")
  - 移除 keyword routing 改 LLM-judged `architecture_profile`
  - 加 PRD HARD GATE
  - 加 prereq check
  - 加 audit→onboard auto-chain
  - 整理 PRD → 实施方案 17 章路径
  - 触发词扩展(含「审视当前项目/架构」)
- **2026-05-24**:office-hours 诊断 → APPROVED Approach 1 + Gap A in v1.0 + Gap B in v1.1 → **本文是当前完整方案**
