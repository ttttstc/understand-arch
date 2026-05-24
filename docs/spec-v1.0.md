# understand-arch v1.0 Spec

> Updated: 2026-05-24  
> Status: REDESIGNED DRAFT  
> Supersedes: the earlier deliverable-factory v1.0 spec.

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
   人看 `overview.md` 和 generated wiki。Agent 看 schema-locked YAML。Wiki 可以生成、删除、重建；长期事实以 YAML、ADR、traceability 为准。

4. **同一事实只维护一次**  
   不把同一个架构事实同时维护在 wiki、设计文档、图、报告、实施方案里。派生文档必须回链 source artifacts。

5. **Governance 即 Moat**  
   证据链、append-only ADR、org KB、traceability、acceptance gate、writeback review 是本套件的核心价值。

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

## 核心信息架构

默认目录：

```text
arch/{project}/
├── specs/                         # 稳定架构基线，长期维护
│   ├── overview.md                # 人类入口，解释系统全景与关键结论
│   ├── baseline.yaml              # 组件、依赖、接口、数据、部署、外部依赖
│   ├── quality.yaml               # NFR、安全、合规、可观测性、运行约束
│   ├── risks.yaml                 # 风险与技术债台账
│   ├── decisions.yaml             # ADR 索引、关键假设、待决策项
│   ├── traceability.yaml          # specs / CR / ADR / release 追溯链
│   └── diagrams/                  # 稳定 Mermaid 图源
│       ├── c4-context.mmd
│       ├── c4-container.mmd
│       └── c4-component-*.mmd
├── decisions/                     # append-only ADR
│   └── ADR-001-*.md
├── change-requests/               # 过程态变更知识
│   └── CR-2026-001-{slug}/
│       ├── cr.md                  # 人类入口：需求、设计、任务、风险摘要
│       ├── impact.yaml            # 影响面、依赖变化、数据变化、回滚策略
│       ├── review.yaml            # gate / findings / readiness
│       ├── traceability.yaml      # 本 CR 内需求→设计→任务→证据→writeback
│       └── options.md             # 条件生成：存在真实方案分歧时
├── generated/                     # 派生视图，可删除重建
│   ├── wiki/
│   ├── diagrams/
│   └── briefs/
├── state.yaml                     # workflow 状态机
└── .metrics.jsonl                 # 运行埋点
```

## specs 稳定资产标准

`specs/` 是项目架构现状的稳定资产。它必须覆盖足够多的架构维度，支持不扫全仓的架构审视。

### `specs/overview.md`

面向人类的架构入口，内容来自 YAML 与 ADR，不独立维护新事实。

必须包含：

- 系统做什么、边界是什么。
- C4 context/container/component 图链接。
- 主要仓库与组件。
- 关键业务链路。
- 关键数据模型与数据所有权摘要。
- Top 风险与技术债摘要。
- 重要 ADR。
- 最近活跃 CR。
- specs 新鲜度与 known unknowns。

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
baseline_commits:
evidence_refs:
```

关键要求：

- 组件、接口、数据模型、部署单元都必须有 owner 或 `unknown_owner` 原因。
- 数据模型必须记录 owner、读写边界、兼容约束、迁移/回滚注意事项。
- 接口契约必须记录兼容策略或变更敏感性。
- 外部依赖必须记录 owner、SLA/风险、替代或降级路径。
- 每条判断必须有 `evidence_refs`。

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

## Wiki 与人类可读材料

本套件同时服务人和 Agent，但维护对象必须分离。

推荐关系：

```text
Agent facts: specs/*.yaml + CR/*.yaml
Human baseline: specs/overview.md
Human generated views: generated/wiki/*
```

规则：

- Wiki 是从 specs、CR、ADR 生成的人类视图。
- Wiki 不作为事实源。
- 用户可以编辑 `specs/overview.md`，但新增事实必须回写 YAML 或引用 YAML。
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

用户高频入口：

```text
/arch:onboard
/arch:design
/arch:review
/arch:audit
/arch:brief
```

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
→ update specs/overview.md
→ update specs/decisions.yaml
→ update specs/traceability.yaml
→ arch-review --mode=specs
```

验收目标：

- 只读 specs 可以生成架构现状报告。
- 组件、依赖、接口、数据、部署、NFR、风险、技术债、决策、追溯链闭合。
- 每条关键判断有 evidence_refs。
- `known_unknowns` 明确列出。

### 2. Specs Review

用于不扫全仓的架构审视。

```text
/arch:review specs

read specs/*
→ check schema
→ check coverage
→ check evidence closure
→ check freshness
→ check risk/debt quality
→ output review.yaml or generated report
```

它回答：

- 当前 specs 是否足以支撑架构判断？
- 哪些维度缺失？
- 哪些 evidence 过期？
- 哪些风险无人负责？
- 哪些 known unknowns 阻塞设计？

不扫全仓的 review 不能证明代码没有漂移。它只能审视当前 specs 的质量。

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

默认不生成 9 文件，不强制 ADR，不强制图，不强制 wiki。

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
/arch:pack --audience=onboarding

read specs + CR + ADR
→ generate generated/wiki or generated/briefs
```

生成内容必须带 source artifacts。派生文档不是事实源。

## Acceptance

### specs acceptance

必须通过：

- schema validation
- required architecture dimension coverage
- evidence_refs closure
- known_unknowns present
- last_verified present
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
2. Rewrite `arch-workflow` around baseline / CR / review / writeback.
3. Rewrite `arch-analyze` to produce specs baseline.
4. Rewrite `arch-frame` to create CR and hard-gate unclear PRD.
5. Rewrite `arch-diff-judge` to produce `cr-impact.yaml` from specs.
6. Rewrite `arch-review` to support specs review, CR review, and drift audit.
7. Rewrite `arch-adr` to link ADRs into specs decisions and traceability.
8. Rewrite `arch-diagram` to treat Mermaid as stable specs diagram source.
9. Rewrite `arch-pack` as generated-view exporter only.
10. Keep `arch-options` and `arch-radar` conditional.
11. Add `arch/{project}/` template and sample.
12. Add acceptance YAML for specs / CR / generated views.

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
