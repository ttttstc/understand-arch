# understand-arch v1.0 Spec

> Updated: 2026-05-24  
> Status: REDESIGNED DRAFT  
> Supersedes: 早期原型 spec。

## 一句话定位

`understand-arch` 是面向软件架构师的 **Docs-as-Code 架构知识底座 skill suite**。它维护一个可信、可版本化、可审计、可被 Agent 读取的项目架构基线，并用 Change Request 记录每次变更相对基线的 delta。

核心目标不是“生成更多文档”，而是让团队在任何时候都能回答：

- 当前系统架构是什么？
- 组件、依赖、接口、数据、部署、风险、技术债分别在哪里？
- 这次变更会影响什么？
- 哪些结论有证据？
- 哪些知识已经过期或需要重新验证？

## 设计原则

1. **specs 是稳定事实源**  
   `arch/{project}/specs/` 必须足够完整。只读 specs，不重新扫描全仓，也应该能生成项目架构现状报告、风险与技术债审视、关键架构维度评估。

2. **CR 记录变更 delta**  
   `change-requests/CR-*` 不复制全量架构。它只记录一次变更相对 specs 的目标、影响面、依赖变化、数据变化、回滚策略、评审和 writeback 映射。

3. **Wiki 是人类视图，不是事实源**  
   人看 `overview.md` 和 generated wiki。Agent 看 schema-locked YAML。`overview.md` 是稳定的人类入口；`generated/wiki/` 是可重建的展开视图。长期事实以 YAML、ADR、traceability 为准。

4. **同一事实只维护一次**  
   不把同一个架构事实同时维护在 wiki、设计文档、图、报告、实施方案里。派生文档必须回链 source artifacts。

5. **Governance 即 Moat**  
   证据链、append-only ADR、org KB、traceability、acceptance gate、writeback review 是本套件的核心价值。

6. **用户可见交互中文优先**  
   用户提示、阻塞原因、刷新建议、评审结论默认使用中文。必要时可在括号中保留英文术语，例如“架构基线可能已过期(stale)”。内部 schema key 可以使用英文以保持稳定。

## 边界

允许产物：

- `*.md`
- `*.yaml`
- `*.mmd`
- `*.svg|*.png` 图像渲染

禁止产物：

- Terraform / Helm / Pulumi
- DDL / ORM migration
- `.gitlab-ci.yml` / `.github/workflows/*`
- 服务骨架
- OpenAPI client code
- 业务代码

遇到禁止产物请求时，skill 必须拒绝，并提示用户使用专门的 coding agent、IaC 工具或代码生成工具。

## 用户交互语言

用户可见输出必须优先使用中文，避免让用户先理解英文术语再理解动作。

推荐提示：

```text
当前架构基线可能已过期：上次扫描提交为 abc1234，当前提交为 def5678。
本次变更命中了数据模型和接口契约相关文件，建议刷新 specs 后再继续设计。
```

不推荐：

```text
specs stale, run refresh?
```

语言规则：

- 用户提示、错误、gate、建议动作：中文。
- 首次出现关键英文概念时可保留括号：`架构漂移(drift)`、`写回(writeback)`。
- YAML/schema 字段：使用稳定英文 key。
- 生成的人类文档：中文标题和解释为主，保留必要技术名词。

## 核心信息架构

默认目录：

```text
arch/{project}/
├── specs/                         # 稳定架构基线,长期维护;100% 事实层(yaml + diagram 源)
│   ├── baseline.yaml              # 组件、依赖、接口、数据、部署、外部依赖
│   ├── quality.yaml               # NFR、安全、合规、可观测性、运行约束
│   ├── risks.yaml                 # 风险与技术债台账
│   ├── decisions.yaml             # ADR 索引、key_assumptions、superseded 关系
│   ├── traceability.yaml          # specs / CR / ADR / release 追溯链
│   └── diagrams/                  # 稳定 Mermaid 图源
│       ├── c4-context.mmd
│       ├── c4-container.mmd
│       └── c4-component-*.mmd
├── decisions/                     # append-only ADR markdown(文件本身永不修改)
│   └── ADR-001-*.md
├── change-requests/               # 过程态变更知识
│   └── CR-2026-001-{slug}/
│       ├── cr.md                  # 人类入口:需求、设计、任务、风险摘要
│       ├── impact.yaml            # 影响面、依赖变化、数据变化、回滚策略
│       ├── review.yaml            # gate / findings / readiness
│       ├── traceability.yaml      # 本 CR 内需求→设计→任务→证据→writeback
│       └── options.md             # 条件生成:存在真实方案分歧时
├── generated/                     # 派生人类视图,可删除重建
│   ├── overview.md                # 1 页稳定入口(从 specs/CR/ADR 重组,200 行硬上限)
│   ├── wiki/                      # 默认 5 页 onboarding 展开视图
│   ├── diagrams/                  # 派生展示图(SVG/PNG 渲染输出)
│   └── briefs/                    # 受众化摘要
├── state.yaml                     # workflow 状态机(仅 arch-workflow 可写)
└── .metrics.jsonl                 # 运行埋点
```

**关键约束**:

- **`specs/` 100% 事实层** — 全是 schema-locked yaml + Mermaid diagram 源;**没有**任何 markdown 解释文件
- **`generated/` 是派生视图**(含 `overview.md` 与 5 页 wiki)— 可重建;由 `arch-pack` 单独负责
- **`decisions/ADR-*.md` 文件本身永不修改** — supersede 关系**全部**记录在 `specs/decisions.yaml#superseded[]`,markdown 文件 commit 后永远只读
- **`state.yaml` 唯一可写者是 `arch-workflow`** — 其他 skill 通过返回 `state_delta` 给 workflow 合并写入

## specs 稳定资产标准

`specs/` 是项目架构现状的稳定资产。它必须覆盖足够多的架构维度，支持不扫全仓的架构审视。

### `generated/overview.md`

面向人类的架构入口,内容**完全来自** `specs/*.yaml` + `decisions/ADR-*.md` + 活跃 `change-requests/CR-*/cr.md`。

**定位**:派生视图(在 `generated/`,不在 `specs/`)。由 `arch-pack` 重组事实,不独立维护新事实。可删可重建。
**约束**: ≤ 200 行硬上限,11 段固定结构(详见 `skills/arch-pack/references/overview-template.md`)。

必须包含：

- 系统做什么、边界是什么、当前目标是什么。
- C4 context/container/component 图链接。
- 主要仓库与组件摘要。
- 关键接口与依赖拓扑摘要。
- 关键业务链路摘要。
- 关键数据模型与数据所有权摘要。
- 部署与运行时约束摘要。
- Top 风险与 Top 技术债，且两者分开呈现。
- 重要 ADR。
- 最近活跃 CR。
- specs 新鲜度与 known unknowns。

### `generated/wiki/*`

`generated/wiki/` 是给人看的展开式阅读视图，不是事实源。v1.0 推荐固定为 `1 + 5` 信息架构：

```text
generated/overview.md                 # 稳定入口
generated/wiki/
├── 01-系统全景.md
├── 02-组件与依赖.md
├── 03-数据与关键链路.md
├── 04-质量属性与运行约束.md
└── 05-风险、决策与近期变更.md
```

页面职责：

- `01-系统全景.md`：系统边界、主要仓库、主要组件、C4 总览。
- `02-组件与依赖.md`：组件职责、接口边界、关键依赖关系、主要外部依赖。
- `03-数据与关键链路.md`：关键数据模型、数据所有权、关键业务链路、关键时序。
- `04-质量属性与运行约束.md`：NFR、运行时约束、部署约束、组织红线。
- `05-风险、决策与近期变更.md`：Top 风险、技术债、ADR、近期 CR、已知未知项。

格式要求：

- 每页只回答一类问题，不做“大全页”。
- 不直接转储 YAML 字段。
- 所有关键结论必须能回链 specs / CR / ADR。
- 允许删除重建，不接受手工维护成新的事实源。

### `specs/baseline.yaml`

机器事实源，必须 schema-locked。

必须覆盖：

```yaml
project:
  name:
  description:
  owners:
repositories:
components:
interfaces:
  apis:
  events:
  messages:
data_models:
external_dependencies:
deployment_units:
runtime_configs:
critical_flows:
ownership:
known_unknowns:
last_verified:
last_scanned_commit:
current_commit_at_review:
changed_files_since_scan:
freshness_status:
baseline_commits:
evidence_refs:
```

关键要求：

- 组件、接口、数据模型、部署单元都必须有 owner 或 `unknown_owner` 原因。
- 数据模型必须记录 owner、读写边界、兼容约束、迁移/回滚注意事项。
- 接口契约必须记录兼容策略或变更敏感性。
- 外部依赖必须记录 owner、SLA/风险、替代或降级路径。
- 每条判断必须有 `evidence_refs`。
- `last_scanned_commit` 记录最后一次代码扫描提交。
- `freshness_status` 使用 `fresh|possibly_stale|stale|unknown`。

### `specs/quality.yaml`

记录架构质量属性与运行约束。

必须覆盖：

```yaml
nfrs:
  reliability:
  latency:
  performance:
  cost:
  security:
  compliance:
  observability:
  maintainability:
runtime_constraints:
release_constraints:
rollback_constraints:
org_constraints:
  banned_patterns:
  compliance_redlines:
  network_boundaries:
  naming_conventions:
  tech_radar:
evidence_refs:
```

`org_constraints` 来自用户级或团队级 KB：

- `~/.understand-arch/kb/`
- `<repo>/.arch-kb/`

加载失败行为：

- KB 目录不存在：`not_configured`，继续。
- 文件缺失：对应项 `not_loaded`，继续。
- 文件存在但 schema 不通过：fail-loud，workflow 暂停。

### `specs/risks.yaml`

记录风险与技术债，不是临时审计报告。

每条风险必须包含：

- severity
- category
- affected_scope
- evidence_refs
- mitigation
- owner
- status
- last_reviewed

每条技术债必须包含：

- debt_type
- affected_scope
- cost_of_delay 或 impact
- paydown_strategy
- evidence_refs

### `specs/decisions.yaml`

索引长期架构决策，不替代 ADR。

必须包含：

- accepted ADR index
- proposed/deprecated/superseded ADR index
- key assumptions
- pending decisions
- decision-to-CR links
- evidence_refs

长期、跨 CR、会影响未来方案判断的决策必须写 ADR。局部实现取舍可只留在 CR。

### `specs/traceability.yaml`

追溯链是本套件的核心资产。

必须能回答：

- 某个需求来自哪个 CR？
- 某个设计点写回了哪个 specs 字段？
- 某个 ADR 影响哪些组件、接口或数据模型？
- 某个风险由哪些 CR 或 evidence 支撑？
- 某次 release 包含哪些 CR？

建议结构：

```yaml
links:
  - from:
      type: cr
      id: CR-2026-001
    to:
      type: specs
      path: baseline.yaml#components.payment-service
    relation: updates
    evidence_refs: []
```

### `specs/diagrams/*.mmd`

Mermaid 源是稳定资产。SVG/PNG 渲染结果放入 `generated/diagrams/`。

必须包含：

- C4 context
- C4 container
- 关键服务的 C4 component，按需
- 图源 frontmatter，指向 baseline 或 CR evidence

## CR 变更资产标准

CR 是一次变更的过程态知识包。它不复制 specs，而是记录 delta。

默认 CR 文件数控制在 4 个：

```text
CR-*/
├── cr.md
├── impact.yaml
├── review.yaml
└── traceability.yaml
```

复杂变更才允许生成：

- `options.md`
- CR-local diagrams
- linked ADR
- generated brief/wiki

### `cr.md`

面向人类的一页式变更入口。

必须包含：

- 变更目标与业务背景。
- 验收标准。
- in scope / non-goals。
- 当前选定技术方案摘要。
- 影响面摘要。
- 模块依赖变化摘要。
- 数据模型变化摘要。
- API / event / permission 变化摘要。
- 发布与回滚摘要。
- 风险与缓解。
- 任务拆解摘要。
- writeback 计划。

`cr.md` 可以读起来像技术设计文档，但不能成为唯一事实源。结构化事实写入 `impact.yaml`。

### `impact.yaml`

CR 的机器事实源。

必须覆盖：

```yaml
change_request:
affected:
  services:
  modules:
  apis:
  data_models:
  events_messages:
  permissions:
  deployments:
  configs:
module_dependency_changes:
data_model_changes:
rollback_strategy:
scope_boundary:
  must_change:
  may_change:
  should_not_change:
derived_risks:
writeback_plan:
evidence_refs:
```

四个硬门槛：

- 影响面必须覆盖 services/modules/apis/data/events/permissions/deployments/configs。
- 模块依赖变化必须说明新增、删除、反转、跨层、循环依赖风险。
- 数据模型变化必须说明 owner、迁移、回填、兼容、数据回滚。
- 回滚策略必须覆盖 code/config/data/deploy，不允许只写“revert PR”。

### `review.yaml`

记录 CR 是否可以进入实现或 writeback。

必须包含：

- readiness: `ready|degraded|blocked`
- structural findings
- semantic findings
- org-conformance findings
- unresolved assumptions
- required fixes
- reviewer identity or subagent marker
- evidence_refs

### `traceability.yaml`

记录本 CR 内部链路：

- requirement -> impact
- impact -> design section
- design -> tasks
- tasks -> files or future PR references
- review finding -> fix or override
- CR -> specs writeback
- CR -> ADR

## 代码扫描算法

`arch-analyze` 需要生成本套件自己的 specs 标准产物。v1.0 不强依赖 Understand-Anything，不要求用户安装它，也不把它的目录结构或 JSON 格式作为事实源。

但代码扫描算法参考 Understand-Anything 的思路，吸收其“确定性扫描 + 文件分析 + 架构图谱 + 图审查 + 增量更新”的模式。

### 不强依赖原则

本套件不做以下事情：

- 不要求安装 `Lum1104/Understand-Anything`。
- 不读取 `.understand-anything/` 作为唯一事实源。
- 不把 Understand-Anything 的 UI、CLI、目录结构暴露给用户。
- 不把对方代码直接 vendoring 到本仓，除非后续明确处理 license、attribution 和维护策略。

允许：

- 参考其仓库扫描算法思想。
- 自行实现扫描 pipeline。
- 可选读取其已有 knowledge graph 作为外部输入，再转换为本套件 specs。

### v1.0 扫描 Pipeline

```text
Project Scanner
→ File Analyzer
→ Architecture Analyzer
→ Graph Reviewer
→ Specs Writer
```

#### Project Scanner

确定性扫描：

- 文件树。
- 语言与包管理器。
- 入口文件。
- 构建/测试配置。
- 部署与运行配置。
- API/事件/数据模型线索。
- Git commit 与文件修改历史。

#### File Analyzer

对关键文件输出结构化摘要：

- 文件职责。
- imports/exports。
- 路由与 handler。
- 数据访问。
- 外部调用。
- 事件生产/消费。
- 权限与安全检查。

#### Architecture Analyzer

聚合为 specs 结构：

- repositories。
- components。
- interfaces。
- data_models。
- external_dependencies。
- deployment_units。
- critical_flows。
- runtime_configs。

#### Graph Reviewer

检查架构图谱质量：

- 孤立节点。
- 悬挂边。
- 循环依赖。
- owner 缺失。
- evidence_refs 缺失。
- 命名不稳定。
- 4+1 视图覆盖缺失。

#### Specs Writer

写入本套件标准资产：

- `specs/baseline.yaml`
- `specs/quality.yaml`
- `specs/risks.yaml`
- `specs/diagrams/*.mmd`
- `generated/overview.md`
- `specs/traceability.yaml`

### 多 agent 并行扫描(上下文溢出防护)

v1.0 必须支持大仓的多 agent 切片扫描,避免主上下文一次塞下整个代码仓导致溢出或质量下降。

**启用门槛**(`Project Scanner` 阶段估算后强制分流):

| 项目规模 | 策略 |
|---|---|
| `src 文件数 ≥ 60` 或 `估算 token ≥ 50k` | 必须多 agent |
| 30-60 文件且 < 50k token | 主上下文单跑;撞 token 上限再回退切片 |
| < 30 文件 / `targeted-refresh` / `drift-audit` | 主上下文单跑 |

**切片维度**按项目类型固定:monorepo 按 package;微服务按 service;单仓单应用按顶层 src 子目录;Electron 按进程边界。单片 ≤50 文件且 ≤30k token。

**子任务返回契约**:`internal/schemas/scan-shard.schema.json`(shard_id / shard_scope / components / interfaces / data_models_seen / external_calls / owner_signals / risk_signals / completion_status)。**主上下文永远不读原始代码**,只读子任务返回 yaml,这是上下文洁净度的硬约束。

**并发上限**:同时活跃子任务 ≤5;主上下文 token 余量 <30% 时暂停 spawn。

完整规约见 `skills/arch-analyze/references/subagent-orchestration.md`。

### 增量更新

v1.0 必须支持基于 commit diff 的增量判断：

1. 读取 `specs/baseline.yaml.last_scanned_commit`。
2. 对比当前仓库 commit。
3. 获取中间 changed files。
4. 判断是否命中架构敏感文件。
5. 只重扫受影响文件或建议 refresh。

增量扫描的目标是减少全仓扫描频率，不是隐藏 specs 过期风险。

## Specs 新鲜度与失效防护

specs 不会自动永远有效。v1.0 必须让失效可检测、可解释、可修复。

### Freshness 状态

```yaml
freshness:
  last_scanned_commit: abc1234
  current_commit: def5678
  changed_files_since_scan:
    - src/order/api.ts
    - src/order/model.ts
  freshness_status: fresh|possibly_stale|stale|unknown
  reason: "Changed files include API and data model paths."
```

四档含义：

| 状态 | 中文提示 | 含义 |
|---|---|---|
| `fresh` | 当前 specs 与代码提交一致。 | 无需刷新 |
| `possibly_stale` | 代码有变化，但暂未发现影响架构基线的文件。 | 可继续，但 audit 应提示复核 |
| `stale` | 代码变化命中架构敏感区域，建议刷新 specs。 | 默认建议 refresh |
| `unknown` | 无法判断 specs 是否过期，建议轻量扫描或人工确认。 | Git 不可用或证据不足 |

### 架构敏感文件

命中以下文件变化时，通常应标记 `stale` 或建议 refresh：

- 包依赖：`package.json`、`pyproject.toml`、`go.mod`、`pom.xml`、锁文件。
- 入口/路由：routes、controllers、handlers、bootstrap。
- 数据模型：models、entities、schema、migrations、Prisma、SQL。
- 接口契约：OpenAPI、proto、GraphQL、RPC definitions。
- 消息事件：events、topics、producers、consumers。
- 部署运行：Dockerfile、compose、Helm、K8s、env templates。
- 安全权限：auth、permission、policy、IAM。
- 配置：feature flags、runtime config、model/provider config。
- 架构资产：`arch/{project}/specs/`、ADR、CR writeback。

以下变化通常可标记 `possibly_stale`：

- 纯测试改动。
- 局部业务实现且不改接口、依赖、数据、部署。
- 注释或 README 小修。
- 样式或文案改动。
- 内部算法实现但边界不变。

### 无 Git 或无 Commit 时

如果无法读取 commit，workflow 不能通过 diff 判断 specs 是否过期。此时应提示：

```text
当前项目无法读取 Git 提交历史，因此不能通过代码差异判断 specs 是否过期。
我会改用 specs 内容完整性检查：验证 4+1 视图覆盖、证据链接、风险更新时间和 known_unknowns。
```

检查项：

- `last_verified` 是否存在。
- evidence_refs 是否还能打开。
- 4+1 coverage 是否缺项。
- known_unknowns 是否过多或长期未处理。
- owner 是否大量 unknown。
- risks 是否长期未 reviewed。
- external_dependencies 是否缺 owner/SLA。
- data_models 是否缺 owner/compat/rollback。

### 防失效机制

1. **commit diff freshness**  
   用 `last_scanned_commit` 与当前 commit 对比，并分类 changed files。

2. **evidence_refs closure**  
   evidence 指向的文件、行号、commit 不存在时，specs 标 degraded。

3. **writeback gate**  
   重要 specs 修改必须来自 baseline refresh 或 CR writeback。

4. **known_unknowns 留痕**  
   未知项不能被生成文档润色消失。

5. **audit 建议 refresh**  
   `audit` 发现 stale/incomplete 时，用中文建议用户刷新 specs。

6. **drift audit 按需扫仓**  
   默认 audit 不扫全仓。用户确认后才运行重型漂移扫描。

## Wiki 与人类可读材料

本套件同时服务人和 Agent，但维护对象必须分离。

推荐关系：

```text
Agent facts: specs/*.yaml + CR/*.yaml
Human baseline: generated/overview.md
Human generated views: generated/wiki/01-05
```

规则：

- Wiki 是从 specs、CR、ADR 生成的人类视图。
- Wiki 不作为事实源。
- `generated/overview.md` 是稳定入口，用户可以编辑，但新增事实必须回写 YAML 或引用 YAML。
- `generated/wiki/` 只做展开解释，不承担“唯一入口”职责。
- `generated/wiki/` 可以删除并重建。
- `arch-pack` 只做按需导出，不在默认 workflow 强制生成大包文档。

## Skill 套件

保留 10 个 skill 名称，收敛职责。

| Skill | v1.0 职责 |
|---|---|
| `arch-workflow` | baseline / CR / review / writeback 状态机 |
| `arch-analyze` | 创建或刷新 specs baseline |
| `arch-frame` | 创建 CR，澄清目标、范围、non-goals、验收、NFR |
| `arch-diff-judge` | 基于 specs 生成 CR impact |
| `arch-options` | 仅在存在真实架构分歧时生成 options |
| `arch-adr` | 仅 durable decision 写 append-only ADR |
| `arch-review` | specs review、CR review、writeback gate、可选 drift audit |
| `arch-diagram` | 从 specs/CR 生成 Mermaid 与可选渲染图 |
| `arch-pack` | 按需生成 wiki/brief/report |
| `arch-radar` | 按需外部调研与选型，不进入默认链路 |

用户可见入口第一版只暴露 4 个：

```text
/arch:onboard
/arch:design
/arch:audit
/arch:brief
```

`arch-review` 不作为第一版用户入口暴露，而是收敛进 `onboard`、`design`、`audit`、`brief` 的内部 gate。

内部 skill 可由 workflow 调度，用户不必直接理解全部 skill。

## Workflow

### 1. Baseline Init / Refresh

用于首次接手项目或刷新架构基线。

```text
/arch:onboard
/arch:baseline refresh

arch-analyze
→ write specs/baseline.yaml
→ write specs/quality.yaml
→ write specs/risks.yaml
→ write specs/diagrams/*.mmd
→ update generated/overview.md
→ update specs/decisions.yaml
→ update specs/traceability.yaml
→ arch-review --mode=specs
```

验收目标：

- 只读 specs 可以生成架构现状报告。
- 组件、依赖、接口、数据、部署、NFR、风险、技术债、决策、追溯链闭合。
- 每条关键判断有 evidence_refs。
- `known_unknowns` 明确列出。

用户可见提示示例：

```text
架构基线已生成，但发现 2 个未知 owner 和 1 个缺失的部署视图。
建议先补齐这些 known_unknowns，再把 specs 作为团队基线使用。
```

### 2. Specs Review 内置于 Audit

用于不扫全仓的架构审视。第一版不单独暴露 `/arch:review`，而是通过 `/arch:audit` 默认执行。

```text
/arch:audit

read specs/*
→ check schema
→ check coverage
→ check evidence closure
→ check freshness
→ check risk/debt quality
→ suggest refresh when stale or incomplete
→ output audit result
```

它回答：

- 当前 specs 是否足以支撑架构判断？
- 哪些维度缺失？
- 哪些 evidence 过期？
- 哪些风险无人负责？
- 哪些 known unknowns 阻塞设计？

不扫全仓的 review 不能证明代码没有漂移。它只能审视当前 specs 的质量。

中文提示示例：

```text
当前 specs 可以支持架构审视，但可能已过期：上次扫描提交 abc1234，当前提交 def5678。
变更文件命中了接口契约和数据模型，建议运行 /arch:onboard --refresh。
```

### 3. Drift Audit

用于验证 specs 与代码现实是否偏离。

```text
/arch:audit --drift

arch-analyze --depth=manifest/risk
→ compare code facts with specs
→ report drift findings
→ propose specs refresh or CR
```

它可以扫仓，成本更高，应按需运行。

当默认 audit 发现 `freshness_status=stale` 时，应先建议 refresh；只有用户确认需要验证代码漂移时，才运行 `--drift`。

### 4. Change Request Design

用于一次需求或架构变更。

```text
/arch:design "<PRD or change request>"

arch-frame
→ create change-requests/CR-*/
→ check specs freshness
→ arch-diff-judge based on specs
→ write cr.md + impact.yaml
→ arch-options if real alternatives exist
→ arch-adr if durable decision exists
→ arch-review --mode=cr
→ writeback proposal
```

默认 CR 控制在 4 个核心文件(cr.md / impact.yaml / review.yaml / traceability.yaml),不强制 ADR、不强制图、不强制 wiki — 只在确有需要时按需追加。

如果 specs stale 或 incomplete，design 应先提示：

```text
当前 specs 可能无法可靠支撑本次设计：缺少数据模型 owner，且上次扫描提交已落后当前代码。
建议先 refresh specs；如果你确认继续，我会把该风险写入 CR review。
```

### 5. Writeback

CR 通过 review 后，才能写回 specs。

Writeback 必须说明：

- 更新哪些 specs 字段。
- 为什么更新。
- 来自哪个 CR。
- 是否新增 ADR。
- 是否关闭或新增风险。
- traceability 如何更新。

禁止直接随意改 specs 基线。所有重要 specs 变更应来自 CR 或 baseline refresh。

### 6. Brief / Wiki Generation

用于人类阅读与汇报。

```text
/arch:brief --audience=management
/arch:brief --audience=onboarding

read specs + CR + ADR
→ update generated/overview.md
→ generate generated/wiki or generated/briefs
```

生成内容必须带 source artifacts。派生文档不是事实源。

## 用户暴露面

v1.0 第一版只向用户暴露四个主入口：

| 入口 | 用户理解 | 内部调用 |
|---|---|---|
| `/arch:onboard` | 建立或刷新项目架构基线 specs | `arch-analyze` + `arch-diagram` + internal review |
| `/arch:design` | 为一次需求创建 CR 并做架构设计 | `arch-frame` + `arch-diff-judge` + conditional `arch-options`/`arch-adr` + internal review |
| `/arch:audit` | 审视 specs 是否完整、可信、过期；必要时建议 refresh | internal `arch-review`; optional `arch-analyze --drift` |
| `/arch:brief` | 从 specs/CR/ADR 生成给人看的 wiki/report/brief | `arch-pack` + `arch-diagram` |

不直接暴露：

- `arch-review`：作为内部 gate。
- `arch-options`：仅当存在真实方案分歧时运行。
- `arch-adr`：仅当存在 durable decision 时运行。
- `arch-radar`：高级按需能力，后续可作为显式 expert mode。
- `arch-diagram` / `arch-pack`：由 brief/onboard/design 内部触发。

这样用户心智保持为：

```text
onboard：建立 specs。
design：创建 CR。
audit：检查 specs 是否还可信，必要时提示 refresh。
brief：生成给人看的材料。
```

## Acceptance

### specs acceptance

必须通过：

- schema validation
- required architecture dimension coverage
- 4+1 view coverage: logical / development / process / physical / scenarios
- evidence_refs closure
- known_unknowns present
- last_verified present
- last_scanned_commit present or git unavailable reason present
- freshness_status present
- baseline_commits present or `git_unavailable`
- C4 Mermaid sources exist
- risks have severity / owner / mitigation / evidence
- decisions index links to ADRs
- traceability links are not dangling

### CR acceptance

必须通过：

- `cr.md` exists and has scope/non-goals/acceptance.
- `impact.yaml` covers all impact dimensions.
- module dependency changes are explicit.
- data model changes include migration/backfill/compat/rollback.
- rollback covers code/config/data/deploy.
- org KB violations are marked.
- review.yaml readiness is not blocked.
- traceability links CR to specs writeback.

### generated view acceptance

必须通过：

- generated view lists source artifacts.
- no new facts absent from specs/CR/ADR.
- links resolve.
- generated_at present.
- degradation reason present when renderer unavailable.

## Schema Strategy

v1.0 schema set should match the reduced fact model:

Project-scoped:

- `spec-baseline.schema.json`
- `spec-quality.schema.json`
- `spec-risks.schema.json`
- `spec-decisions.schema.json`
- `spec-traceability.schema.json`
- `cr-impact.schema.json`
- `cr-review.schema.json`
- `cr-traceability.schema.json`

Org-scoped:

- `banned-patterns.schema.json`
- `compliance-redlines.schema.json`
- `network-boundaries.schema.json`
- `naming-conventions.schema.json`
- `tech-radar.schema.json`

Existing earlier schemas may be migrated or superseded, but v1.0 should not maintain both old and new contract families long term.

## Metrics

Every skill run appends:

```json
{"ts":"ISO-8601","skill":"arch-review","mode":"specs","inputs_summary":"specs review only","outputs_paths":["arch/foo/generated/briefs/spec-review.md"],"duration_s":12,"token_estimate":8000,"overrides_used":false,"verify_passed":true}
```

Metrics support 90-day validation of governance value:

- specs review frequency
- drift findings
- ADR reuse
- CR writeback count
- traceability closure rate
- generated wiki usage

## Build Order

New v1.0 build order:

1. Rewrite schemas around specs/CR model.
2. Rewrite `arch-workflow` around four user-visible entries: onboard / design / audit / brief.
3. Rewrite `arch-analyze` to produce specs baseline.
4. Implement Understand-Anything-inspired scanner pipeline without external hard dependency.
5. Implement specs freshness checks based on commit diff and architecture-sensitive paths.
6. Rewrite `arch-frame` to create CR and hard-gate unclear PRD.
7. Rewrite `arch-diff-judge` to produce `cr-impact.yaml` from specs.
8. Rewrite `arch-review` as an internal gate for onboard/design/audit/brief.
9. Rewrite `arch-adr` to link ADRs into specs decisions and traceability.
10. Rewrite `arch-diagram` to treat Mermaid as stable specs diagram source.
11. Rewrite `arch-pack` as generated-view exporter only.
12. Keep `arch-options` and `arch-radar` conditional.
13. Add `arch/{project}/` template and sample.
14. Add acceptance YAML for specs / CR / generated views.

## Non-Goals for v1.0

- No automated code modification.
- No CI/IaC/DDL generation.
- No full LLM wiki or RAG system.
- No platform-specific PR integration requirement.
- No mandatory PPTX/HTML renderer.
- No deep external research in default workflow.

## v1.1 Candidates

- `arch-review --mode=fitness` for ADR fitness specs.
- Drift audit automation against PR diffs.
- LLM wiki over specs/CR/ADR after traceability is stable.
- Domain-specific specs extensions for data platform, edge, IoT, or AI eval-heavy systems.
- Release writeback automation.
