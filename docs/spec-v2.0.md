# understand-arch v2.0 Spec

> Version: 2.0
> Status: Draft
> Supersedes: v1.0 (Breaking Change,不向后兼容)
> Last Updated: 2026-05-26

---

## 0. 摘要

`understand-arch` v2.0 是一套**专注于架构师的代码与架构分析 Claude Code plugin**,用于支撑**单仓或多仓**业务系统的架构决策与方案设计。

**核心定位**:
- 服务对象:**高级架构师**(不是普通开发者,不是新人学习工具)
- 核心场景:**架构决策 + 方案设计**(给研发的可执行方案,不是科普性介绍)
- 项目范围:**单仓 / 多仓统一模型**(单仓是多仓的 N=1 退化)
- 一等产物:`/arch-design` 产出**实战级方案设计文档**(13 段 RFC 风格 markdown)

**v2.0 核心变更**(对比 v1.0):
- 砍掉对 `Understand-Anything` 的外部依赖,**fork 其完整三层扫描架构**(MIT)作为内置引擎(orchestrator + subagents + tools)
- **事实层从 5 份 yaml 收敛为分仓 `knowledge-graph.json` + 跨仓 `cross-repo.json`**
- **人类视图层从 generated/ 升级为 wiki/**(LLM 渲染,16 页,单页无字数限制)
- **配置目录从全局 `~/.understand-arch/kb/` 改为项目内 `rules/*.md`**
- **Skill 套件从 13 个收敛到 9 个**(5 用户入口 + 4 内部 + 6 个 subagent + 2 个 v2.0 新增 subagent)
- **多仓原生支持**:repos.yaml + node id 加 `repo_id::` 前缀,跨仓 edges 独立维护

**v2.0 服务目标**(按优先级):

1. **架构决策与方案设计**(`/arch-design`):基于 PRD 或用户需求,产出影响面分析、改动点清单、实战级方案设计文档
2. **完整系统架构、功能、风险、技术债**分析(`/arch-onboard` / `/arch-audit`)
3. **多仓统一架构视图**(跨仓事实集成)
4. **4+1 视图**绘制(v2.0 占位,v2.1 实现图片生成)
5. **新同事快速接手**项目(`/arch-wiki`)
6. **变更管理(CR)与决策留底(ADR)**

---

## 1. 工作区数据模型(单仓/多仓统一)

> **核心抽象**:workspace 按**业务系统**(`.understand-arch/{project}/`)组织,不按代码仓库。一个业务系统包含 N 个 git 仓库(N≥1)。单仓是 N=1 的退化情形,目录结构跟多仓**完全一致**。

```
.understand-arch/{project}/                                  # 业务系统 workspace
├── specs/
│   ├── repos.yaml                               # ★ 多仓注册表(单仓时只 1 条)
│   ├── repos/                                   # ★ 每仓独立 graph
│   │   ├── {repo_id}/
│   │   │   ├── knowledge-graph.json             # 仓内事实(nodes/edges/layers)
│   │   │   └── .fingerprint.json
│   │   └── ...
│   └── cross-repo.json                          # ★ 跨仓事实(decisions/CR/NFR/risks/debt/cross_edges)
├── wiki/                                        # ★ 人类视图层(LLM 渲染,14 页,v2.0 优化收敛)
│   ├── README.md                                # 索引
│   ├── 01-overview.md
│   ├── 02-components.md                         # Logical + Development view(合并原 02 + 10)
│   ├── 03-interfaces.md
│   ├── 04-data-models.md
│   ├── 05-capabilities.md                       # 业务能力地图(跨仓)
│   ├── 06-quality.md                            # NFR
│   ├── 07-risks-and-debt.md
│   ├── 08-deployments.md                        # Physical view
│   ├── 09-flows-and-scenarios.md                # Process + Scenarios view(合并原 09 + 11)
│   ├── 10-decisions.md                          # ADR 索引(原 13)
│   ├── 11-changes.md                            # CR 索引(原 14)
│   ├── 12-rules.md                              # rules/*.md 摘要(原 15)
│   ├── 13-pending-changes.md                    # 架构师 dashboard(原 16)
│   └── 14-diagrams.md                           # 4+1 视图占位(v2.1 实现,v2.0 保留占位)
├── rules/                                       # ★ 团队/项目约束(用户编辑)
│   ├── banned-patterns.md
│   ├── compliance.md
│   ├── network-boundaries.md
│   ├── naming.md
│   └── tech-radar.md
├── decisions/                                   # append-only ADR(项目级,跨仓)
│   └── ADR-NNN-*.md
├── change-requests/                             # 变更工作区(项目级,跨仓)
│   └── CR-YYYY-NNN-{slug}/
│       └── CR.md                                # ★ v2.0 单文件大一统:YAML frontmatter(机器读) + 14 段正文(人读)
├── state.yaml                                   # workflow 状态机
└── .metrics.jsonl
```

### 1.1 repos.yaml(多仓注册表)

```yaml
# .understand-arch/{project}/specs/repos.yaml
version: "1.0"
repos:
  - id: web
    path: ../../myapp-web                       # 相对 workspace 的路径
    git_remote: github.com/me/myapp-web
    primary_language: typescript
    description: "前端应用"
  - id: api
    path: ../../myapp-api
    git_remote: github.com/me/myapp-api
    primary_language: go
    description: "后端 API"
  - id: infra
    path: ../../myapp-infra
    git_remote: github.com/me/myapp-infra
    primary_language: hcl
    description: "Terraform 基础设施"
```

**单仓退化**(N=1):

```yaml
version: "1.0"
repos:
  - id: myapp
    path: .
    git_remote: github.com/me/myapp
    primary_language: typescript
    description: ""
```

### 1.2 多仓注册流程

`/arch-onboard` 首次启动时:
1. 扫描**当前目录及一层子目录**寻找 `.git/` 目录
2. 引导用户确认要纳入哪些仓
3. 自动生成 `.understand-arch/{project}/specs/repos.yaml`(用户可手动编辑)
4. 后续 skill 启动时读 `repos.yaml`,不再问

### 1.3 v1.0 → v2.0 数据模型对照

详细对照见 §1.4(原表保留),核心变化:
- `specs/baseline.yaml` → 拆到各仓 `specs/repos/{repo_id}/knowledge-graph.json#nodes/edges/layers`
- `specs/quality.yaml / risks.yaml / decisions.yaml / traceability.yaml` → 合入 `specs/cross-repo.json`
- 新增 `specs/repos.yaml` + `specs/cross-repo.json` 两个文件

### 1.4 v1.0 → v2.0 数据模型对照(详细)

| v1.0 | v2.0 |
|---|---|
| `specs/baseline.yaml` | 合入 `specs/knowledge-graph.json#nodes / edges / layers` |
| `specs/quality.yaml` | 合入 `specs/knowledge-graph.json#quality_attributes[]` |
| `specs/risks.yaml` | 合入 `specs/knowledge-graph.json#risks[] / technical_debt[]` |
| `specs/decisions.yaml` | 合入 `specs/knowledge-graph.json#architecture_decisions[]` |
| `specs/traceability.yaml` | 合入 `specs/knowledge-graph.json#traceability[]` |
| `specs/diagrams/*.mmd` | wiki/12-diagrams.md 内嵌 (v2.0 占位) |
| `~/.understand-arch/kb/*.yaml` | `.understand-arch/{project}/rules/*.md` |
| `generated/overview.md` + `generated/wiki/*` | `.understand-arch/{project}/wiki/*` |
| `generated/audit/*` | wiki 各对应页 + `arch-review` 临时报告 |
| `generated/briefs/*` | `/arch-wiki` 受众化输出 mode |

### 1.5 目录侵入面策略(v2.0)

#### 1.5.1 用户项目根目录只放 1 个目录

```
用户项目根/
├── src/                                        # 用户的代码
├── package.json                                # 用户的
├── .git/                                       # 用户的
├── .gitignore                                  # 用户的(需加 1 行排除 intermediate)
└── .understand-arch/                           # ★ 我们整个 plugin 的唯一入口
    ├── .gitignore                              # 自动生成,排除 intermediate/ 和 .metrics.jsonl
    ├── {project-name}/                         # 业务系统 workspace
    │   ├── specs/                              # ✅ 进 git
    │   ├── wiki/                               # ✅ 进 git
    │   ├── rules/                              # ✅ 进 git
    │   ├── decisions/                          # ✅ 进 git
    │   ├── change-requests/                    # ✅ 进 git
    │   ├── state.yaml                          # ✅ 进 git
    │   ├── .metrics.jsonl                      # ❌ ignored
    │   └── intermediate/                       # ❌ ignored (engine 7-phase 临时产物)
    └── (可能多个 {project-name}/)
```

**侵入面 = 1 个目录**(`.understand-arch/`),无其它污染。

#### 1.5.2 项目级 vs 全局级

- **项目级**(随用户项目走,进 git):`.understand-arch/{project}/` 全套
- **plugin 级**(在 plugin 仓库里,不进用户项目):
  - `templates/rules/` — rules 6 份中文模板
  - `samples/` — 示例 workspace(dogfood 用)
- **全局级**(已废弃):v1.0 的 `~/.understand-arch/kb/` v2.0 全部废弃,改为项目级 `rules/`

#### 1.5.3 .gitignore 自动生成

`/arch-onboard` 首次运行时,在 `.understand-arch/.gitignore` 写入:

```text
# .understand-arch/.gitignore (自动生成)
*/intermediate/
*/.metrics.jsonl
```

并提示用户在自己的 `.gitignore` 加 1 行(若希望整体忽略本目录):

```text
# 仅当用户不希望提交架构基线时,可加:
# .understand-arch/
```

#### 1.5.4 intermediate/ 用途

engine 跑 7 phases 时,每个 phase 把输出写到 `intermediate/`,下一个 phase 读它继续加工:

```
Phase 1 SCAN          → intermediate/scan-result-{repo_id}.json
Phase 1.5 BATCH       → intermediate/batches-{repo_id}.json
Phase 2 ANALYZE       → intermediate/batch-1.json ... batch-N.json(并行写)
Phase 3 ASSEMBLE      → intermediate/assembled-graph-{repo_id}.json
Phase 4 STRUCTURE     → intermediate/layers-{repo_id}.json
Phase 5 DOMAIN        → intermediate/domain-{repo_id}.json
Phase 6 QUALITY       → intermediate/quality-{repo_id}.json
Phase 7 REVIEW        → intermediate/review-{phase}-{repo_id}.json
Phase 8 FINALIZE      → 合成最终 specs/repos/{repo_id}/knowledge-graph.json + specs/cross-repo.json
```

**保留意义**:
- `--resume` 续跑:任何 phase 失败后,intermediate 产物保留,下次接着跑
- 跨仓合并:Phase 8 需要读所有仓的 intermediate 才能合并 cross-repo.json
- 调试追溯:出问题时可以看 intermediate 定位是哪个 phase 出错

**单仓产物量**:中等仓(500 文件)约 4MB;5 仓项目约 20MB。所以必须 ignored。

### 1.6 删除的概念

- ❌ `freshness_status` 启发式("命中文件数 ≤ 5" 等)→ 改用 fingerprint
- ❌ 全局 KB 目录
- ❌ 5 个 KB schema(banned-patterns / compliance-redlines / network-boundaries / naming-conventions / tech-radar yaml)
- ❌ `ownership` 字段 / `OwnershipEntry[]`
- ❌ wiki 单页 ≤200 行硬上限

---

## 2. 事实层结构(分仓 graph + 跨仓 cross-repo.json)

> **核心切分**:每仓一份 `knowledge-graph.json`(仓内事实)+ 一份全局 `cross-repo.json`(跨仓事实)。

### 2.0 文件分工总览

| 文件 | 内容 | 谁写 |
|---|---|---|
| `specs/repos/{repo_id}/knowledge-graph.json` | 仓内 nodes + 仓内 edges + layers + freshness + scan_meta | arch-analyze 调 engine 跑出来 |
| `specs/repos/{repo_id}/.fingerprint.json` | 仓内 fingerprint store | engine |
| `specs/cross-repo.json` | repos[] + architecture_decisions + change_requests + quality_attributes + risks + technical_debt + known_unknowns + cross_edges + capabilities_cross_repo + traceability + project_meta | arch-analyze / arch-adr / arch-design |

### 2.1 仓内 graph 结构(`repos/{repo_id}/knowledge-graph.json`)

```typescript
interface RepoKnowledgeGraph {
  version: string                            // "2.0"
  kind: "codebase"
  repo_id: string                            // ★ 仓 id,与 repos.yaml 一致
  repo_meta: RepoMeta                        // 仓级元信息(语言、框架、git commit)
  nodes: GraphNode[]                          // 21 种类型 + v2.0 扩展字段,id 加 ::repo 前缀
  edges: GraphEdge[]                          // ★ 仅含仓内 edges(source 和 target 都在本仓)
  layers: Layer[]                             // 架构分层
  tour: TourStep[]                            // 兼容字段,不主用
  freshness: FreshnessMeta                   // 本仓 fingerprint 算
  scan_meta: ScanMeta                         // 本仓扫描元数据
  known_unknowns_repo: KnownUnknown[]        // 仅本仓扫描发现的 unknowns
}
```

### 2.2 跨仓 graph 结构(`specs/cross-repo.json`)

```typescript
interface CrossRepoGraph {
  version: string                            // "2.0"
  project: ProjectMeta                        // 业务系统元信息
  repos: RepoMeta[]                          // ★ 所有仓的注册信息镜像(从 repos.yaml 同步)

  // 跨仓 edges(source 和 target 不在同一仓)
  cross_edges: GraphEdge[]                   // ★ 跨仓的 35 种 edge

  // 业务能力(可跨仓)
  capabilities: CapabilityCrossRepo[]        // 业务能力,可关联多仓 nodes

  // 架构决策与变更(项目级,跨仓)
  architecture_decisions: ArchitectureDecision[]
  change_requests: ChangeRequestRef[]
  traceability: TraceabilityLink[]

  // NFR / 风险 / 技术债(可跨仓)
  quality_attributes: QualityAttribute[]
  risks: Risk[]
  technical_debt: TechnicalDebt[]

  // 已知未知(跨仓视角)
  known_unknowns: KnownUnknown[]
}
```

**注**: `constraints[]` 数组**不存在**(rules/*.md 由 `arch-wiki` 现读 + 整理进 `wiki/15-rules.md`)。

### 2.3 Node ID 命名规范

**全局唯一**:所有 node id **必须**用 `{repo_id}::{node-local-id}` 前缀格式。

例:
```
web::svc-UserService
web::ep-GET-api-users
api::svc-OrderService
api::tbl-orders
infra::res-k8s-deployment-web
```

**好处**:
- 跨仓 edge 可直接引用,如 `source: "web::svc-UserService" target: "api::ep-POST-orders"`
- 单仓时仍带前缀(如 `myapp::svc-xxx`),代码路径统一,无分叉
- 容易识别归属

**分隔符**:用 `::`(双冒号),不用 `/`(避免与文件路径混淆)、不用 `.`(避免与代码符号混淆)。沿用 UA `::` 习惯。

### 2.4 ProjectMeta + RepoMeta

```typescript
interface ProjectMeta {
  name: string                                // 业务系统名(如 "myapp")
  description: string                         // 业务系统描述
  languages_overall: string[]                 // 所有仓的语言并集
  frameworks_overall: string[]
  analyzed_at: string                         // ISO 8601
}

interface RepoMeta {
  id: string                                  // "web" / "api" / ...
  path: string                                // 仓在本地的路径
  git_remote: string                          // git remote URL
  git_commit_hash: string                     // 上次扫描时的 commit
  languages: string[]                         // 本仓语言
  frameworks: string[]                        // 本仓框架
  primary_language: string                    // 主语言
  description: string
}
```

### 2.5 GraphNode(UA 原生 + v2.0 扩展字段)

```typescript
interface GraphNode {
  // UA 原生
  id: string                                  // ★ {repo_id}::{local-id} 格式
  type: NodeType                              // 21 种,见 2.6
  name: string
  filePath?: string                           // 仓内相对路径
  lineRange?: [number, number]
  summary: string
  tags: string[]
  complexity: "simple" | "moderate" | "complex"
  languageNotes?: string
  domainMeta?: DomainMeta
  knowledgeMeta?: KnowledgeMeta

  // v2.0 扩展(全部 optional)
  repo_id: string                             // ★ 必填,与 id 前缀一致
  criticality?: "critical" | "high" | "medium" | "low"
  maturity?: "experimental" | "growing" | "stable" | "deprecated"
  importance?: "core" | "supporting" | "edge"
  boundary?: "internal" | "public" | "external"
  communication?: "sync" | "async" | "event"           // 接口节点用
  data_sensitivity?: "public" | "internal" | "pii" | "secret"   // 数据节点用
  sla?: { availability?: string; latency_p99_ms?: number }
  linked_adrs?: string[]
  linked_crs?: string[]
  linked_risks?: string[]
  evidence_refs?: EvidenceRef[]
  confidence?: "high" | "medium" | "low"
}

interface EvidenceRef {
  repo_id: string                             // ★ v2.0 新增,标 evidence 所在仓
  file: string                                // 仓内相对路径
  line_range?: [number, number]
  source: "engine" | "llm" | "human"
  extracted_at: string                        // ISO 8601
}
```

### 2.6 NodeType (21 种,沿用 UA)

### 2.2 ProjectMeta

```typescript
interface ProjectMeta {
  name: string
  languages: string[]                         // 检测到的语言
  frameworks: string[]                        // 检测到的框架
  description: string                         // LLM 产
  analyzedAt: string                          // ISO 8601
  gitCommitHash: string
}
```

### 2.3 GraphNode(UA 原生 + v2.0 扩展字段)

```typescript
interface GraphNode {
  // UA 原生
  id: string
  type: NodeType                              // 21 种,见 2.4
  name: string
  filePath?: string
  lineRange?: [number, number]
  summary: string
  tags: string[]
  complexity: "simple" | "moderate" | "complex"
  languageNotes?: string
  domainMeta?: DomainMeta                     // domain/flow/step 节点用
  knowledgeMeta?: KnowledgeMeta               // 知识层节点用(我们不主用)

  // v2.0 扩展(全部 optional)
  criticality?: "critical" | "high" | "medium" | "low"
  maturity?: "experimental" | "growing" | "stable" | "deprecated"
  importance?: "core" | "supporting" | "edge"
  boundary?: "internal" | "public" | "external"
  communication?: "sync" | "async" | "event"           // 接口节点用
  data_sensitivity?: "public" | "internal" | "pii" | "secret"   // 数据节点用
  sla?: { availability?: string; latency_p99_ms?: number }
  linked_adrs?: string[]                      // ["ADR-001"]
  linked_crs?: string[]                       // ["CR-2026-003"]
  linked_risks?: string[]                     // ["R-001"]
  evidence_refs?: EvidenceRef[]
  confidence?: "high" | "medium" | "low"      // 扩展字段的抽取置信度
}

interface EvidenceRef {
  file: string                                // 仓库相对路径
  line_range?: [number, number]
  source: "engine" | "llm" | "human"
  extracted_at: string                        // ISO 8601
}
```

| 分类 | 类型 | v2.0 主用 |
|---|---|---|
| 代码层 | file / function / class / module / concept | ✅ |
| 非代码层 | config / document / service / table / endpoint / pipeline / schema / resource | ✅ |
| 业务领域 | domain / flow / step | ✅(capabilities) |
| 知识层 | article / entity / topic / claim / source | ❌ 不主用,保留兼容 |

### 2.7 GraphEdge

```typescript
interface GraphEdge {
  source: string                              // node id ({repo_id}::{local-id})
  target: string                              // node id
  type: EdgeType                              // 35 种(沿用 UA)
  direction: "forward" | "backward" | "bidirectional"
  description?: string
  weight: number                              // 0-1
  cross_repo?: boolean                        // ★ v2.0:跨仓 edge 标记(写在 cross-repo.json 时为 true)
}
```

EdgeType 8 大类:Structural / Behavioral / Data flow / Dependencies / Semantic / Infrastructure / Domain / Knowledge。

**仓内 vs 跨仓 edges 切分规则**:
- `source.repo_id == target.repo_id` → 写入 `repos/{repo_id}/knowledge-graph.json#edges`
- `source.repo_id != target.repo_id` → 写入 `cross-repo.json#cross_edges`,`cross_repo: true`

### 2.8 CapabilityCrossRepo(跨仓业务能力)

```typescript
interface CapabilityCrossRepo {
  id: string                                  // 例:"cap-user-auth"
  name: string
  description: string
  supporting_node_ids: string[]               // 跨仓 node ids,例:["web::svc-LoginUI", "api::svc-AuthService"]
  maturity: "experimental" | "growing" | "stable" | "deprecated"
  importance: "core" | "supporting" | "edge"
  gaps: string[]                              // 该能力的缺口
  evidence_refs: EvidenceRef[]
  confidence: "high" | "medium" | "low"
}
```

### 2.9 ArchitectureDecision

```typescript
interface ArchitectureDecision {
  id: string                                  // "ADR-001"
  title: string
  status: "proposed" | "accepted" | "deprecated" | "superseded"
  date: string                                // ISO 8601
  context: string                             // 简短,< 300 字
  decision: string                            // 简短,< 300 字
  consequences: string                        // 简短,< 300 字
  superseded_by?: string                      // "ADR-005"
  supersedes?: string[]
  affected_node_ids: string[]
  md_path: string                             // "decisions/ADR-001-xxx.md"
  evidence_refs: EvidenceRef[]
}
```

### 2.10 ChangeRequestRef

```typescript
interface ChangeRequestRef {
  id: string                                  // "CR-2026-003"
  title: string
  status: "draft" | "in_review" | "ready" | "merged" | "rolled_back"
  date: string
  impact_node_ids: string[]
  introduced_adrs: string[]
  dir_path: string                            // "change-requests/CR-2026-003-xxx/"
}
```

### 2.11 QualityAttribute

```typescript
interface QualityAttribute {
  id: string                                  // "NFR-perf-001"
  category: "performance" | "availability" | "security" | "scalability"
          | "maintainability" | "observability" | "compliance" | "cost"
  statement: string                           // "API p99 ≤ 200ms"
  target: string                              // "200ms"
  measurement: string                         // 如何度量
  applies_to_node_ids: string[]
  status: "met" | "at_risk" | "violated" | "unknown"
  evidence_refs: EvidenceRef[]
  confidence: "high" | "medium" | "low"       // ★ 强制
}
```

### 2.12 Risk

```typescript
interface Risk {
  id: string                                  // "R-001"
  title: string
  category: "technical" | "operational" | "security" | "compliance" | "organizational"
  likelihood: "low" | "medium" | "high"
  impact: "low" | "medium" | "high"
  severity: "low" | "medium" | "high" | "critical"
  affected_node_ids: string[]
  mitigation?: string
  status: "open" | "mitigated" | "accepted" | "transferred"
  evidence_refs: EvidenceRef[]
  confidence: "high" | "medium" | "low"       // ★ 强制
}
```

### 2.13 TechnicalDebt

```typescript
interface TechnicalDebt {
  id: string                                  // "D-001"
  title: string
  category: "code" | "architecture" | "infra" | "test" | "docs"
  affected_node_ids: string[]
  cost_estimate?: string                      // "2 sprints"
  business_impact?: string
  introduced_in?: string                      // "CR-2026-001"
  status: "acknowledged" | "scheduled" | "in_progress" | "resolved"
  evidence_refs: EvidenceRef[]
  confidence: "high" | "medium" | "low"       // ★ 强制
}
```

### 2.14 KnownUnknown

```typescript
interface KnownUnknown {
  id: string                                  // "U-001"
  category: "missing_evidence" | "ambiguous_boundary" | "untraced_dependency"
          | "unverified_assumption" | "scan_gap"
  statement: string                           // "组件 X 的接口契约未在代码中体现"
  affected_node_ids: string[]
  suggested_action: string                    // "人工 confirm 或补充注释"
}
```

### 2.15 FreshnessMeta

```typescript
interface FreshnessMeta {
  last_scanned_commit: string
  last_scanned_at: string
  current_commit: string
  status: "fresh" | "possibly_stale" | "stale" | "unknown"
  fingerprint_diff: {
    added: string[]                           // 新节点 id
    removed: string[]
    modified: string[]
  }
  per_node_freshness: Record<string, "fresh" | "possibly_stale" | "stale">
}
```

判定规则见 §6.2。

### 2.16 TraceabilityLink

```typescript
interface TraceabilityLink {
  cr_id: string
  affected_node_ids: string[]
  adr_ids: string[]
  release?: string
}
```

### 2.17 ScanMeta

```typescript
interface ScanMeta {
  engine_version: string                      // "@understand-arch/scanner@2.0.0"
  scanned_at: string
  duration_ms: number
  files_scanned: number
  languages_detected: string[]
  frameworks_detected: string[]
  scan_mode: "full" | "incremental"
  shards?: number                             // 并行扫描分片数
  warnings: string[]
}
```

### 2.18 13 类架构问题覆盖度

| # | 架构师问题 | v2.0 graph 覆盖 |
|---|---|---|
| 1 | 组件构成与边界 | nodes(module/service/file) + boundary |
| 2 | 组件交互 | nodes(endpoint) + communication + edges |
| 3 | 数据流 | nodes(table/schema) + data_sensitivity + edges |
| 4 | 部署拓扑 | nodes(resource/service/pipeline) + boundary |
| 5 | 业务链路 | nodes(flow/step) + edges |
| 6 | 能力地图 | nodes(domain/flow) + maturity / importance |
| 7 | NFR | quality_attributes[] |
| 8 | 风险/技术债 | risks[] + technical_debt[] |
| 9 | ADR | architecture_decisions[] |
| 10 | CR 变更 | change_requests[] + traceability[] |
| 11 | ~~ownership~~ | ❌ v2.0 主动舍弃 |
| 12 | 约束/反模式 | rules/*.md(graph 外,wiki/15-rules.md 现渲) |
| 13 | evidence 可信度 | EvidenceRef.source + confidence + known_unknowns[] |

**12/13 cover**(11 ownership 主动舍弃)。

---

## 3. 扫描架构(三层:Orchestrator + Subagents + Engine)

> **重要纠正**(相对早期 outline):UA 的扫描能力不在 packages/core 一层,而是 **三层架构**。v2.0 走"全复刻"(Q-engine-1=A),三层全搬,只调整字段对齐我们 v2.0 specs。

### 3.1 三层概览

```
┌────────────────────────────────────────────────────────────────────┐
│ 1. Orchestrator (skills/arch-analyze/SKILL.md)                     │  编排层
│    - 7 phases: Pre-flight → Scan → Batch → Analyze → Assemble →    │
│      Structure → Domain → Quality → Review                         │
│    - 增量更新决策、subdomain 合并、worktree 处理                    │
│    - 并行控制(file-analyzer up to 5)                             │
│    - state 管理(返 state_delta 给 user-facing skill)              │
└────────────────────────────────────────────────────────────────────┘
              ↓ dispatch
┌────────────────────────────────────────────────────────────────────┐
│ 2. Subagents (agents/arch-*.md, 6 个)                              │  LLM 层
│    - arch-project-scanner       (项目结构扫描)                     │
│    - arch-file-analyzer         (文件级 LLM 抽取,主力,并行)      │
│    - arch-architecture-analyzer (架构分层 + layer 划分)            │
│    - arch-domain-analyzer       (业务能力 = capabilities)          │
│    - arch-quality-analyzer      (NFR / risks / debt,带 confidence) │ ★ v2.0 新增
│    - arch-graph-reviewer        (graph 完整性 review)              │
└────────────────────────────────────────────────────────────────────┘
              ↓ uses tools
┌────────────────────────────────────────────────────────────────────┐
│ 3. Engine (engine/, fork from UA)                                  │  确定性工具层
│    - 工具脚本(Node + Python,esbuild bundle):                    │
│      scan-project / compute-batches / build-fingerprints /          │
│      extract-structure / extract-import-map /                       │
│      merge-batch-graphs / merge-subdomain-graphs                    │
│    - core 库(TS): tree-sitter 解析 / 类型定义 / fingerprint /     │
│      ignore-filter / staleness / schema                             │
└────────────────────────────────────────────────────────────────────┘
```

### 3.2 与 UA 的对应关系

| UA 资产 | v2.0 归宿 | 说明 |
|---|---|---|
| `skills/understand/SKILL.md` (844 行,7 phases) | `skills/arch-analyze/SKILL.md` | 改写编排逻辑,产物对齐 v2.0 graph |
| `skills/understand/*.mjs` 工具脚本 | `engine/tools/*.mjs` | 直接搬,改 import path |
| `skills/understand/*.py` 合并脚本 | `engine/tools/*.py` | 直接搬 |
| `agents/project-scanner.md` | `agents/arch-project-scanner.md` | 改 prompt 产 v2.0 字段 |
| `agents/file-analyzer.md` | `agents/arch-file-analyzer.md` | **重点改造**,加 criticality/maturity 等 |
| `agents/architecture-analyzer.md` | `agents/arch-architecture-analyzer.md` | 适配 v2.0 layer |
| `agents/domain-analyzer.md` | `agents/arch-domain-analyzer.md` | 加 maturity/importance |
| (无对应) | `agents/arch-quality-analyzer.md` | ★ v2.0 新增,产 NFR/risks/debt |
| `agents/graph-reviewer.md` | `agents/arch-graph-reviewer.md` | 加 confidence 闭合检查 |
| `agents/tour-builder.md` | ❌ 不搬 | v2.0 废弃 tour 概念 |
| `agents/article-analyzer.md` | ❌ 不搬 | 文档分析,不在范围 |
| `agents/assemble-reviewer.md` | ❌ 不搬 | 知识图谱合并 |
| `agents/knowledge-graph-guide.md` | ❌ 不搬 | 使用引导 |
| `packages/core/src/**` | `engine/src/core/**` | 直接搬大部分,精简见 3.4 |
| `packages/dashboard/**` | ❌ 不搬 | 我们用 wiki/ 代替 dashboard |

### 3.3 Engine 目录结构

```
understand-arch/
├── engine/                                  # 确定性工具层
│   ├── NOTICE                                # UA MIT copyright(保留)
│   ├── LICENSE                               # MIT(继承)
│   ├── package.json                          # @understand-arch/scanner-engine
│   ├── tsconfig.json
│   ├── bin/                                  # esbuild bundle 后的可执行入口
│   │   ├── scan-project.js
│   │   ├── compute-batches.js
│   │   ├── build-fingerprints.js
│   │   ├── extract-structure.js
│   │   ├── extract-import-map.js
│   │   ├── merge-batch-graphs.py             # python 直接拷
│   │   └── merge-subdomain-graphs.py
│   ├── src/
│   │   ├── core/                             # fork from UA packages/core/src
│   │   │   ├── analyzer/                     # graph-builder / layer-detector / normalize-graph
│   │   │   ├── languages/                    # 10 种语言配置
│   │   │   ├── plugins/                      # tree-sitter + extractors + parsers
│   │   │   ├── ignore-filter.ts
│   │   │   ├── ignore-generator.ts
│   │   │   ├── fingerprint.ts
│   │   │   ├── staleness.ts
│   │   │   ├── search.ts
│   │   │   ├── schema.ts
│   │   │   └── types.ts
│   │   ├── tools/                            # 工具脚本源码(对应 bin/)
│   │   └── extensions/                       # ← v2.0 新增
│   │       ├── arch-schema.ts                # GraphNode 扩展字段 + 顶层数组类型
│   │       ├── arch-validator.ts             # confidence/evidence_refs 闭合校验
│   │       └── output-writer.ts              # 写 specs/knowledge-graph.json + .fingerprint.json
│   └── tests/
├── agents/                                   # 顶级 subagents(Claude Code 规范)
│   ├── arch-project-scanner.md
│   ├── arch-file-analyzer.md
│   ├── arch-architecture-analyzer.md
│   ├── arch-domain-analyzer.md
│   ├── arch-quality-analyzer.md              # ★ v2.0 新增
│   └── arch-graph-reviewer.md
└── skills/
    ├── arch-onboard/
    ├── arch-design/
    ├── arch-audit/
    ├── arch-wiki/
    ├── arch-diagram/
    ├── arch-analyze/                          # ★ 编排层(改写自 UA understand SKILL.md)
    │   ├── SKILL.md                            # 7 phases 编排
    │   └── references/
    ├── arch-frame/
    ├── arch-adr/
    └── arch-review/
```

### 3.4 Engine Fork 范围(packages/core)

**搬**:
- `analyzer/graph-builder.ts / layer-detector.ts / normalize-graph.ts`
- `languages/**`(10 种语言)
- `plugins/tree-sitter-plugin.ts / extractors/** / parsers/**`(包括 Markdown / YAML / JSON / TOML / Env / Dockerfile / SQL / GraphQL / Protobuf / Terraform / Makefile / Shell)
- `ignore-filter.ts / ignore-generator.ts`
- `fingerprint.ts / staleness.ts`
- `search.ts`
- `schema.ts / types.ts`

**不搬**:
- `analyzer/llm-analyzer.ts`(LLM 语义层,我们走 subagent prompt,见 3.5)
- `analyzer/tour-generator.ts`
- `analyzer/language-lesson.ts`
- `embedding-search.ts`
- `change-classifier.ts`(arch-design 自己做)
- `plugins/discovery.ts`(插件发现机制)
- 知识图谱节点抽取(article/entity/topic/claim/source 类型保留兼容,但不抽)

### 3.5 Subagent Fork 范围(6 个 agents/arch-*.md)

每个 agent prompt 改造原则:
1. **保留**:UA 原 prompt 的扫描方法论(file batching、graph 构造规则、validation 规则)
2. **适配**:产物 schema 改为产 v2.0 GraphNode 扩展字段(criticality / maturity / importance / boundary / communication / data_sensitivity / sla / linked_adrs / linked_crs / linked_risks / confidence)
3. **新增 v2.0 字段强约束**:LLM 推断字段必须带 `confidence` + `evidence_refs`,否则 graph-reviewer fail

`arch-quality-analyzer.md`(v2.0 新增)单独写,职责:
- 从代码 + graph + rules/*.md 推断 NFR / risks / technical_debt
- 强制每条产物带 confidence(high/medium/low)与 evidence_refs
- 输出写入 graph 顶层 `quality_attributes[]` / `risks[]` / `technical_debt[]`

### 3.6 Engine 包名 + 入口

- npm 包名: `@understand-arch/scanner-engine` (scoped)
- 多个工具入口(对应 7 phases 中的确定性步骤):
  ```bash
  # Phase 1.5 BATCH
  node ${PLUGIN_ROOT}/engine/bin/compute-batches.js ${PROJECT_ROOT}
  # Phase 3 ASSEMBLE
  python ${PLUGIN_ROOT}/engine/bin/merge-batch-graphs.py ${PROJECT_ROOT}
  # Phase 4 FINGERPRINT
  node ${PLUGIN_ROOT}/engine/bin/build-fingerprints.js ${PROJECT_ROOT}
  ```
- Skill 编排层(`arch-analyze` SKILL.md)按需调用对应 bin

### 3.7 引擎产物 vs Subagent 产物

| 阶段 | 产物 | 责任 |
|---|---|---|
| Phase 0 Pre-flight | 决定 full/incremental + worktree 检测 | orchestrator (skill) |
| Phase 1 SCAN | `intermediate/scan-result.json`(文件清单 + 语言/框架检测) | arch-project-scanner subagent |
| Phase 1.5 BATCH | `intermediate/batches.json`(语义分批) | engine bin (确定性) |
| Phase 2 ANALYZE | `intermediate/batch-N.json[]`(每批 GraphNode + GraphEdge) | arch-file-analyzer subagent ×N 并行 |
| Phase 3 ASSEMBLE | `intermediate/assembled-graph.json` | engine bin (确定性合并) |
| Phase 4 STRUCTURE | `assembled-graph.json#layers + 架构层节点` | arch-architecture-analyzer subagent |
| Phase 5 DOMAIN | `assembled-graph.json#nodes(domain/flow/step)` + maturity/importance | arch-domain-analyzer subagent |
| Phase 6 QUALITY | `assembled-graph.json#quality_attributes/risks/technical_debt` | arch-quality-analyzer subagent ★ v2.0 |
| Phase 7 REVIEW | confidence/evidence 闭合校验 + 修复建议 | arch-graph-reviewer subagent |
| Phase 8 FINALIZE | `specs/knowledge-graph.json + .fingerprint.json` | engine bin (output-writer) |

### 3.8 License 与归属

- `engine/NOTICE` 保留 UA MIT copyright 文本(`Copyright (c) 2026 Yuxiang Lin`)
- `agents/arch-*.md` 每个文件顶部 frontmatter 加 `based_on: agents/<original>.md (from understand-anything, MIT)`
- `skills/arch-analyze/SKILL.md` 顶部加 `based_on: skills/understand/SKILL.md (from understand-anything, MIT)`
- `engine/package.json` 加 `"based-on": "@understand-anything/core (MIT, Yuxiang Lin 2026)"`
- README 致谢段说明 fork 关系

### 3.8.1 默认 ignore 清单(v2.0 扩展 UA)

UA 自带 `.understandignore` 默认清单(node_modules / dist / .git / lock files 等)。v2.0 在此基础上扩展以下默认 ignore 类别(可被项目级 `.understandignore` 用 `!` 反包含):

```text
# v2.0 新增默认 ignore 类别

# 测试文件(架构分析层面测试不算核心事实,沿用 UA 默认)
**/*.test.*
**/*.spec.*
**/__tests__/**
**/tests/**
**/test/**

# Mock / Fixture
**/__mocks__/**
**/mocks/**
**/fixtures/**
**/testdata/**

# 生成代码
**/*.generated.*
**/*.gen.go
**/*.pb.go
**/*.g.dart
**/*-generated.ts
**/*_pb2.py
**/gen/**
**/generated/**
```

**用户需要审视测试或生成代码时**:在 `.understand-arch/{project}/.understandignore` 用 `!**/*.test.*` 反包含即可。

### 3.9 构建

- `pnpm install`(我们仓库根)
- `pnpm --filter @understand-arch/scanner-engine build` → `engine/bin/*.js`
- esbuild bundle 后单文件,**用户安装 plugin 不需要 `npm install` / `pnpm install`**,源码直接带 `engine/bin/*.js`
- Python 工具脚本(`merge-batch-graphs.py / merge-subdomain-graphs.py`)需用户系统已安装 Python 3.x — Phase 0 pre-flight 检测,缺失给中文提示

### 3.10 Hooks 自动更新机制(复刻 UA,v2.0 默认关闭)

UA 用 2 个 hook 实现"代码改了 graph 自动失效 + 增量更新",v2.0 复刻该能力但**默认关闭**,由用户主动启用。

#### 3.10.0 启用控制(v2.0)

- `hooks/hooks.json` 文件随 plugin 安装即存在
- 但 hook command 内部前置条件检查 `state.yaml#hooks_enabled == true`,否则跳过
- 用户启用:`/arch-onboard --enable-hooks` 或手动改 `.understand-arch/{project}/state.yaml#hooks_enabled = true`
- 默认 `hooks_enabled: false`,避免新用户被频繁打扰

#### 3.10.1 Hook 配置

`hooks/hooks.json`(从 UA 复刻 + 改命令):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "[ -f arch/*/state.yaml ] && grep -q 'hooks_enabled.*true' arch/*/state.yaml && printf '%s' \"$TOOL_INPUT\" | grep -qE 'git\\s+(commit|merge|cherry-pick|rebase)' && [ -f arch/*/specs/knowledge-graph.json ] && echo \"[understand-arch] 检测到 git 提交。读取 ${CLAUDE_PLUGIN_ROOT}/hooks/arch-update-prompt.md 并按其指引执行 graph 增量更新,无需用户确认。\" || true"
          }
        ]
      }
    ],
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "[ -f arch/*/state.yaml ] && grep -q 'hooks_enabled.*true' arch/*/state.yaml && [ -f arch/*/specs/knowledge-graph.json ] && [ -f arch/*/specs/.fingerprint.json ] && [ \"$(node -p \"JSON.parse(require('fs').readFileSync('arch/*/specs/knowledge-graph.json','utf8')).freshness.last_scanned_commit\" 2>/dev/null)\" != \"$(git rev-parse HEAD 2>/dev/null)\" ] && echo \"[understand-arch] 架构基线可能已过期。读取 ${CLAUDE_PLUGIN_ROOT}/hooks/arch-update-prompt.md 检查结构性变更并更新基线。\" || true"
          }
        ]
      }
    ]
  }
}
```

#### 3.10.2 `hooks/arch-update-prompt.md`

复刻 UA `hooks/auto-update-prompt.md` 并改造:
- 触发时,提示当前会话以**最小代价**算 fingerprint diff(走 `engine/bin/build-fingerprints.js`)
- 若架构敏感节点(module/service/endpoint/...)有变化 → dispatch `arch-analyze --mode=incremental`
- 若仅 file/function/class 变化 → 标记 `possibly_stale`,等用户下次主动跑
- 用中文反馈用户

#### 3.10.3 触发场景

| 触发 | 行为 |
|---|---|
| `git commit / merge / cherry-pick / rebase` 后 | PostToolUse hook 提示当前会话跑增量更新 |
| 新会话启动且 commit hash 漂移 | SessionStart hook 提示检查 graph 新鲜度 |
| 任何 fingerprint 变化 | 写入 graph.freshness;架构相关变化时进入 `stale` 状态 |

#### 3.10.4 与 v2.0 freshness 模型的对接

- hook 触发的增量分析,完成后**必须更新** `graph.freshness.last_scanned_commit` 与 `.fingerprint.json`
- hook 不直接写 graph,只**提示当前会话**调 `arch-analyze`,由 `arch-analyze` 走正规写流程(write-scope 契约不绕过)

### 3.11 测试资产(复刻 UA)

#### 3.11.1 搬运范围

- UA `packages/core/src/__tests__/` 全量搬到 `engine/src/core/__tests__/`
- UA `packages/core/src/analyzer/*.test.ts` 全量搬到 `engine/src/core/analyzer/*.test.ts`
- UA `vitest.config.ts`(根 + packages/core)搬到我们仓库对应位置,改 path
- UA `tests/`(根级集成测试,如有需要)按需搬

#### 3.11.2 v2.0 新增测试

- `engine/src/extensions/__tests__/`:测 arch-schema / arch-validator / output-writer
- `engine/tests/integration/`:跑全套 7 phases 编排小型 fixture 项目,验证产物结构

#### 3.11.3 测试命令

- `pnpm test`(根级,触发所有 workspaces)
- `pnpm --filter @understand-arch/scanner-engine test`

### 3.12 Monorepo 架子(从 UA 借鉴样式,内容自写)

#### 3.12.1 仓库根

```
understand-arch/
├── .claude-plugin/             # 沿用现有(我们 v1.0 已建)
│   ├── marketplace.json
│   └── plugin.json
├── package.json                # ★ v2.0 新增,从 UA 借鉴 monorepo 样式
├── pnpm-workspace.yaml         # ★ v2.0 新增
├── tsconfig.base.json          # ★ v2.0 新增(共享 TS 配置)
├── vitest.config.ts            # ★ v2.0 新增(共享 vitest 配置)
├── engine/                     # workspace member
│   └── package.json            # @understand-arch/scanner-engine
└── ...
```

`pnpm-workspace.yaml`:

```yaml
packages:
  - "engine"
```

根 `package.json`(样式参考 UA `understand-anything-plugin/package.json`):

```json
{
  "name": "understand-arch",
  "private": true,
  "scripts": {
    "build": "pnpm --filter @understand-arch/scanner-engine build",
    "test": "pnpm -r test"
  },
  "devDependencies": {
    "esbuild": "^0.24.0",
    "typescript": "^5.7.0",
    "vitest": "^3.1.0"
  },
  "engines": {
    "node": ">=22",
    "pnpm": ">=10"
  }
}
```

#### 3.12.2 `.claude-plugin/` 沿用声明

`.claude-plugin/marketplace.json + plugin.json` 我们 v1.0 仓库已有,**不复刻 UA 版本**,但在文件内需要:
- 更新 plugin name + version 到 v2.0
- skills 列表更新为 9 个新 skill
- 加 agents 注册(6 个 arch-* subagents)
- 加 hooks 注册

### 3.13 UA 7 个非主扫描 skill 的处置

| UA skill | 用途 | v2.0 处置 |
|---|---|---|
| `understand` (主扫描) | 7 phases 扫描 | ✅ 复刻为 `skills/arch-analyze/SKILL.md` |
| `understand-onboard` | 新人 onboarding 视图(graph 外的引导) | ❌ 不复刻 — 我们 `wiki/15-onboarding.md` + arch-wiki 已 cover |
| `understand-explain` | 解释单个节点/路径 | ❌ 不复刻 — wiki 已分层呈现 |
| `understand-chat` | RAG 对话 | ❌ v2.0 不做,v2.1 候选 |
| `understand-diff` | 看代码变更的图层影响 | ⚠️ 不复刻 SKILL.md,**方法论吸收**进 arch-audit (drift) + arch-design (impact)。**不复刻 src/diff-analyzer.ts 代码** |
| `understand-domain` | 业务领域视图(独立 skill) | ❌ 不复刻 — 已通过 `agents/arch-domain-analyzer.md` + `wiki/05-capabilities.md` cover |
| `understand-knowledge` | 文档/知识图谱模式 | ❌ 不复刻 — 不在 v2.0 范围 |
| `understand-dashboard` | 启动 HTML dashboard | ❌ 不复刻 — wiki/ 直接替代 |

### 3.15 多仓并行调度方案(策略 C:总并行池)

> 多仓扫描必须并行,否则 5 仓项目耗时线性增长到 40 分钟级,不可接受。v2.0 走"**总并行池**"调度策略 — 仓间任务进全局队列,M 个 worker 跨仓填空。单仓时退化为 UA 单仓行为(M 个 worker 全部填给唯一仓)。

#### 3.15.1 调度拓扑

```
                                 ┌──────────────────────────┐
                                 │ Phase 0 Pre-flight       │ (项目级,1 次)
                                 │ - 读 repos.yaml          │
                                 │ - 检查 python/node       │
                                 │ - 校验各 repo.path 有效  │
                                 └────────┬─────────────────┘
                                          │
            ┌──────────────────┬──────────┴──────────┬──────────────────┐
            │                  │                     │                  │
       ┌────▼────┐        ┌────▼────┐           ┌────▼────┐        ┌────▼────┐
       │ 仓 web  │        │ 仓 api  │           │ 仓 infra│        │ 仓 ...  │
       │ Phase 1 │        │ Phase 1 │           │ Phase 1 │        │ Phase 1 │
       │ ...     │        │ ...     │           │ ...     │        │ ...     │
       │ Phase 7 │        │ Phase 7 │           │ Phase 7 │        │ Phase 7 │
       └────┬────┘        └────┬────┘           └────┬────┘        └────┬────┘
            │                  │                     │                  │
            └──────────────────┴──────────┬──────────┴──────────────────┘
                                          │
                                 ┌────────▼────────────────┐
                                 │ Phase 8 FINALIZE        │ (项目级,1 次,跨仓合并)
                                 │ - 抽 cross_edges        │
                                 │ - dispatch cross domain │
                                 │ - dispatch cross quality│
                                 │ - graph-reviewer cross  │
                                 │ - 写 cross-repo.json    │
                                 └─────────────────────────┘
```

#### 3.15.2 并行预算 M

```
M = 5  (默认,UA 验证安全上限)
```

含义:**同一时间最多并发的 subagent 总数**(跨所有仓 + 所有 phase 统一计数)。

理由:
- UA 单仓验证过 5 file-analyzer 并发能跑通,留 1 个 buffer 给非 file-analyzer subagent
- Claude Code 普遍限流约束:6 并发是稳定可用区间
- 单仓退化:6 个 worker 全填给唯一仓,等价于"6 并发 file-analyzer"(比 UA 5 略激进)

用户可调:`/arch-onboard --parallelism=N`:
- N=1:全串行(调试/限流严环境)
- N=3:保守
- N=6:默认
- N=10+:激进(限流宽松时)

#### 3.15.3 任务模型

```typescript
interface ScanTask {
  task_id: string                  // 例:"web::phase-2::batch-3"
  repo_id: string                  // "web"(项目级任务用 "__project__")
  phase: 1 | 2 | 3 | 4 | 5 | 6 | 7
  task_type: "scan" | "batch-analyze" | "structure" | "domain" | "quality" | "review"
  payload: any                     // phase 特定数据
  blocked_by: string[]             // 前置 task_ids(同仓上一 phase 的 task)
  priority: number                 // 调度优先级(见 3.15.4)
  status: "queued" | "running" | "done" | "failed" | "degraded"
  attempts: number                 // 重试次数(异常处理用,见 3.15.5)
}
```

#### 3.15.4 调度优先级

| 优先级 | 任务类型 | 理由 |
|---|---|---|
| 100 | Phase 2 batch-analyze(file-analyzer) | 主体工作,先跑起来填满 worker |
| 90 | Phase 1 scan(project-scanner) | 必须早完成才能产 batches |
| 80 | Phase 3 assemble(确定性脚本,不占 subagent 预算) | — |
| 70 | Phase 4 structure(architecture-analyzer) | |
| 60 | Phase 5 domain(domain-analyzer) | |
| 50 | Phase 6 quality(quality-analyzer) | |
| 40 | Phase 7 review(graph-reviewer) | 最后,失败可重试 |

仓间优先级:**大仓优先**。Phase 0 完成后,根据初步估算的文件数排序,大仓的 Phase 1 任务先入队。

#### 3.15.5 异常处理(Q-sched-3=a)

任一 task 失败:
1. **重试 1 次**(2 次尝试机会;若是限流错误,先全局暂停 30 秒再重试)
2. **重试仍失败**:
   - 若是仓内 task → 该仓标 `degraded`,该仓后续 phase 跳过,其它仓继续
   - 若是项目级 task(Phase 0 或 Phase 8) → 整体 fail-fast,中文报错给用户
3. 标 `degraded` 的仓:
   - `repos/{repo_id}/knowledge-graph.json` 仍写(基于已完成 phase 的产物)
   - `freshness.status` 标 `unknown`
   - `known_unknowns_repo[]` 加一条 `category: scan_gap` 说明哪个 phase 失败

限流侦测(429 或 rate-limit error):
- 全局暂停 30 秒
- M 临时降为 1
- 每 60 秒尝试 M+1 直到回到原值

#### 3.15.6 Phase 8 FINALIZE 跨仓合并(Q-sched-4=a)

独立 phase,项目级 1 次,**不**与仓内 phase 混合:

```bash
node engine/bin/finalize-cross-repo.js \
  --workspace .understand-arch/{project}/ \
  --repos web,api,infra
```

行为:
1. 读各 `repos/{repo_id}/knowledge-graph.json`
2. 扫所有 edges,源/目标跨仓的挪到 `cross-repo.json#cross_edges`
3. dispatch `arch-domain-analyzer --cross-repo mode`(1 次):
   - 输入:各仓 domain/flow nodes
   - 输出:跨仓 capability(写 `cross-repo.json#capabilities[]`)
4. dispatch `arch-quality-analyzer --cross-repo mode`(1 次):
   - 输入:各仓 NFR/risk/debt + rules/*.md
   - 输出:升级为项目级 quality_attributes / risks / technical_debt
5. dispatch `arch-graph-reviewer --cross-repo mode`(1 次):
   - 校验所有 cross_edges 的 source/target 都能在各仓 graph 中找到(referential integrity)
   - 校验 confidence/evidence_refs 闭合
6. 写 `cross-repo.json` + `repos.yaml` 中各仓 `git_commit_hash` 更新

Phase 8 用 3 个 subagent,但**项目级 1 次**,M 预算够。

#### 3.15.7 续跑机制(Q-sched-5=a)

任意时点中断后,`/arch-analyze --resume` 可续跑:

1. 读 `.understand-arch/{project}/intermediate/task-state.json`(调度器持久化的 task 状态)
2. 跳过已 `done` 的 task
3. 从 `running` 状态的 task 重新开始(假设上次未完成)
4. `failed` 的 task 重新计入重试预算
5. 中间产物(`intermediate/repos/{repo_id}/*.json`)保留,直接复用

实现细节:
- 每个 task 完成时,**立刻持久化** task-state.json(原子写)
- 完成项目所有任务后,清理 `intermediate/`(可选,用户用 `--keep-intermediate` 保留)

#### 3.15.8 输出结构

```
.understand-arch/{project}/
├── .understand-arch/
│   └── intermediate/                                # 中间产物(--resume 用)
│       ├── task-state.json                          # 调度器状态
│       ├── repos/
│       │   ├── web/{scan-result, batches, batch-*, assembled-graph, layers, domain, quality, review}.json
│       │   ├── api/...
│       │   └── infra/...
│       └── cross-repo/
│           ├── cross-edges.json
│           ├── capabilities-cross.json
│           ├── quality-cross.json
│           └── review-cross.json
└── specs/                                           # 最终产物
    ├── repos.yaml                                   # commit_hash 更新
    ├── repos/
    │   ├── web/{knowledge-graph.json, .fingerprint.json}
    │   ├── api/...
    │   └── infra/...
    └── cross-repo.json
```

#### 3.15.9 调度器实现

调度器是 `skills/arch-analyze/SKILL.md` 编排逻辑的一部分:

- **方式 A(推荐)**:bash + 命名管道做 worker pool,符合 Claude Code Skill 的"声明式 prompt + bash 调用"风格
- **方式 B**:`engine/bin/scheduler.js` 作为独立调度器进程,被 SKILL.md 调起
- **方式 C**:由 LLM 在 SKILL.md prompt 内手动控制并发 dispatch(灵活但不稳定)

Phase 2 实施时按需选择(详见 `skills/arch-analyze/references/scheduler-playbook.md`)。

### 3.14 UA `src/*-builder.ts` 处置

完全**不复刻**。`src/onboard-builder.ts / explain-builder.ts / diff-analyzer.ts / understand-chat.ts / context-builder.ts` 都是 UA user-facing skill 的实现,与我们 v2.0 user-facing skill(arch-onboard / arch-design / arch-audit / arch-wiki / arch-diagram)**定位不同**,自己写更干净。

UA `src/diff-analyzer.ts` 的核心思路(graph node-level diff + 影响半径计算)**作为方法论**写入:
- `skills/arch-audit/references/drift-detection.md`(drift 检测)
- `skills/arch-design/references/impact-analysis.md`(CR impact 推导)

---

## 4. Skill 套件(9 个)

### 4.1 用户入口(5)

#### 4.1.1 `/arch-onboard`

**触发**: "建立基线" / "看懂这个项目" / "刷新基线"

**流程**:
1. integrity check(state.yaml + workspace 目录)
2. dispatch `arch-analyze`(mode=full)
3. dispatch `arch-wiki`(mode=full)
4. 中文汇报 known_unknowns

**写权限**: `state.yaml` + 通过 dispatch 间接写 graph + wiki

#### 4.1.2 `/arch-design`(v2.0 一等公民,实战级方案设计)

**触发**: "设计这份 PRD" / "开 CR for X" / "为这个需求出方案" / "分析改动影响面"

**核心定位**:**给研发的可执行方案文档**,不是 CR 摘要。架构师用 `/arch-design` 完成从需求到方案的全部分析,产出研发可以直接照做的细化设计。

**输入**:
- PRD 文件路径(`/arch-design ./prd/rate-limit.md`)
- 或对话粘贴需求文本
- 或自然语言诉求(`/arch-design 给订单系统加灰度发布能力`)

**产物**(v2.0 单文件大一统):**只有 1 个文件** `change-requests/CR-YYYY-NNN-{slug}/CR.md`

CR.md 结构:
- **YAML frontmatter**(机器读):cr_id / title / status / owner / created / prd_link / affects_repos / impact(added_nodes / modified_nodes / removed_nodes / estimated_files_changed)
- **14 段正文**(人读,见 §4.1.2.1):背景/现状/方案/详细设计/替代方案/NFR/风险/改动清单/实施步骤/回滚/测试/待定/关联/Review

谁产:
- arch-impact-analyzer 写 frontmatter#impact + 第 8 段(改动清单)
- arch-solution-designer 写主体 1-7 + 9-13 段
- arch-review 写第 14 段(Review,append-only)

**流程**:
1. integrity check graph freshness;stale → 阻塞建议 refresh
2. dispatch `arch-frame`(PRD HARD GATE,见 §4.2.2)
3. 创建 `change-requests/CR-YYYY-NNN-{slug}/`,写 cr.md 摘要
4. dispatch `arch-impact-analyzer` → 产 impact.yaml + impact.md + changes.md(支持跨仓)
5. dispatch `arch-solution-designer` → 产 solution-design.md(13 段)
6. (可选)dispatch `arch-adr` 记录关键决策
7. dispatch `arch-review --mode=cr`
8. CR ready 后写 `cross-repo.json#change_requests[]` + `traceability[]`

**写权限**:
- `change-requests/CR-*/CR.md`(★ v2.0 单文件大一统)
- `cross-repo.json#change_requests[]` + `traceability[]`(追加)
- 通过 dispatch:`decisions/ADR-*.md`(via arch-adr)

#### 4.1.2.1 `CR.md` 单文件结构(YAML frontmatter + 14 段)

```markdown
---
# === YAML Frontmatter(机器读)===
cr_id: CR-2026-003
title: 限流方案
status: draft | in_review | ready | merged | rolled_back
owner: 架构师 A
created: 2026-05-27
prd_link: ./prd-rate-limit.md
affects_repos: [web, api]
impact:
  added_nodes: ["web::svc-RateLimitBanner", ...]
  modified_nodes: [...]
  removed_nodes: [...]
  estimated_files_changed: 18
---

# CR-{id} — {title}

## 1. 背景与目标
- 业务背景(从 PRD 提取 + 架构师补充)
- 设计目标(SMART 化)
- 非目标(明确 out-of-scope)

## 2. 现状分析
- 当前架构子集(基于 graph,标出受影响组件/接口/数据)
- 现状痛点
- 已有约束(rules/ + 既有 ADR)

## 3. 方案概述
- 核心思路(1-3 段)
- 关键决策点
- 与替代方案的对比简表

## 4. 详细设计
### 4.1 数据模型变化
  - 新增/修改/删除的 schema/table
  - migration 策略
### 4.2 接口变化(REST/gRPC/event)
  - 新增/修改/废弃的 endpoint
  - 兼容性策略(向前/向后)
### 4.3 组件变化
  - 新增/修改/删除的 component
  - 模块边界调整
### 4.4 部署变化
  - 基础设施(k8s/terraform/...)
  - 配置 + secret
### 4.5 关键流程时序
  - Mermaid sequenceDiagram(关键链路)
  - 跨仓调用链路明确标注

## 5. 替代方案对比
- 至少列 1 个 alternative(若无分歧可标"无显著替代方案")
- 维度:实现复杂度 / 性能 / 可维护性 / 成本 / 风险

## 6. NFR 影响
- 性能:预期 latency / throughput 变化
- 可用性:SLO 是否变化
- 安全:威胁模型增量(STRIDE 简版)
- 合规:对照 rules/compliance.md
- 可观测性:新增 metric/log/trace

## 7. 风险与缓解
- 主要风险列表(likelihood × impact)
- 每个风险的缓解措施
- 升级到 graph.risks[] 的候选

## 8. 改动清单(指引 changes.md)
- 文件级:新增 / 修改 / 删除文件清单
- 函数级:关键函数变化
- 接口级:契约变化
- 跨仓改动:按仓分组

## 9. 实施步骤 + 灰度策略
- 拆分子任务(按依赖排序)
- 灰度策略(feature flag / 分阶段 rollout / 影子流量)
- 验证点(每阶段成功/失败标志)

## 10. 回滚预案
- 触发条件
- 回滚步骤
- 数据回滚(若涉及 schema 变更)

## 11. 测试策略
- 单元测试(新增/修改的)
- 集成测试(跨组件/跨仓)
- 性能测试(若 NFR 相关)
- 验收标准

## 12. 待定问题(known_unknowns)
- PRD 未澄清的设计点
- 待 owner 决策的细节
- 升级到 graph.known_unknowns[] 的候选

## 13. 关联
- 关联 PRD 路径
- 关联上游 ADR(若有)
- 关联下游影响 CR(若有)
- 关联仓:涉及哪些 repos.yaml 中的仓

## 14. Review(arch-review 写入,append-only)
- 评审日期 / 评审人 / 结论
- 高级架构师终审(arch-senior-reviewer):verdict + overall_score + findings 摘要
- 修订记录(若曾走 refiner loop)
```

#### 4.1.2.2 第 8 段「改动清单」结构(原 changes.md 内容并入)

第 8 段格式(注意:这是 CR.md 内的一段,不是独立文件):

```markdown
## 8. 改动清单

### 8.1 跨仓总览
| 仓 | 新增文件 | 修改文件 | 删除文件 | 新增接口 | 修改接口 |
|---|---|---|---|---|---|
| web | 3 | 5 | 0 | 0 | 1 |
| api | 8 | 12 | 2 | 2 | 3 |
| infra | 1 | 2 | 0 | - | - |

### 8.2 仓:web

新增文件:
- `src/components/RateLimitBanner.tsx` — 限流提示组件

修改文件:
- `src/api/client.ts` — 增加 429 错误处理

接口变化:
- 新增订阅 `/api/rate-limit/events`(WebSocket)

### 8.3 仓:api
... (类似结构)

### 8.4 依赖关系
- web/RateLimitBanner.tsx 依赖 api/POST /rate-limit/status(新增)
```

#### 4.1.3 `/arch-audit`

**触发**: "基线还能信吗" / "/arch-audit"

**流程**:
1. dispatch `arch-analyze`(mode=fingerprint-check only,不重扫)
2. 对比 fingerprint;算 freshness 状态
3. **默认不跑 reviewer**(零 LLM 成本)
4. 产基础状态报告(纯中文)
5. **若发现过期**,向用户给出 3 选项:
   ```
   检测到架构基线已过期:
     上次扫描提交:{last_scanned_commit}
     当前提交:{HEAD}
     架构相关节点变化:{N} 个

   请选择:
     1. 立即刷新基线(运行 /arch-onboard --refresh,耗时较长)
     2. 查看漂移详情(运行 graph-reviewer 漂移模式,耗时中等)
     3. 仅保留本次报告,暂不处理
   ```
6. 用户选 1 → 跳到 `/arch-onboard --refresh`
7. 用户选 2 → dispatch `arch-graph-reviewer --mode=drift` 出详细漂移报告
8. 用户选 3 → 退出

**写权限**: `state.yaml` + audit 临时报告(不进 wiki)

#### 4.1.4 `/arch-wiki`

**触发**: "重新生成 wiki" / "给新人写一份" / "给 CTO 一份"

**流程**:
1. 读 graph + rules/*.md
2. 按 fingerprint 判定哪些 wiki 页失效 → 重产
3. 受众化 mode(可选):`--audience=cto | newcomer | pm | architect`
4. 写 wiki/**

**写权限**: `wiki/**`

**受众化 mode**(吃掉旧 `arch-brief` 职责):
- `cto`: 输出 wiki/README + 01 + 06 + 07 + 13 摘要版
- `newcomer`: 输出 wiki 全集 + 强调 15-onboarding 引导
- `pm`: 输出 05 + 09 + 11 + 14
- `architect`: 输出 wiki 全集
- 不指定 audience: 全量重渲

#### 4.1.5 `/arch-diagram`

**触发**: "画 4+1 视图" / "画 C4 图" / "/arch-diagram"

**v2.0 占位实现**:返回中文提示

```text
arch-diagram 正在开发中,v2.1 见。
当前你可以查看 wiki/12-diagrams.md 中的 Mermaid 占位内容。
```

不写任何文件。v2.1 接图片生成。

**写权限**: 无(v2.0 占位)

### 4.2 内部 skill(4)

#### 4.2.1 `arch-analyze`(编排层)

**唯一职责**: 7 phases 编排,调度 6 个 subagent + engine 工具脚本,产 graph + fingerprint

**Modes**:
- `full` — 全量 7 phases
- `incremental` — 仅扫 fingerprint 变化部分(沿用 UA 增量逻辑)
- `fingerprint-check` — 不扫,只算 freshness(Phase 0 + engine build-fingerprints)
- `review-only` — 跳过 Phase 1-6,只跑 Phase 7 graph-reviewer

**Phases**(对应 §3.7):

| Phase | 内容 | 调用方 | 并行 |
|---|---|---|---|
| 0 Pre-flight | 决定 mode + worktree 检测 + python/node 检查 | orchestrator(本 skill) | — |
| 0.5 Ignore | 处理 .archignore(同 UA .understandignore) | orchestrator | — |
| 1 SCAN | 产 scan-result.json | arch-project-scanner subagent | — |
| 1.5 BATCH | 产 batches.json(语义分批) | engine `compute-batches.js` | — |
| 2 ANALYZE | 每批产 GraphNode/GraphEdge | arch-file-analyzer subagent ×N | up to 5 |
| 3 ASSEMBLE | 合并 batches → assembled-graph.json | engine `merge-batch-graphs.py` | — |
| 4 STRUCTURE | 层划分 + 架构节点抽取 | arch-architecture-analyzer subagent | — |
| 5 DOMAIN | 业务能力 + maturity/importance | arch-domain-analyzer subagent | — |
| 6 QUALITY | NFR/risks/debt + confidence ★ v2.0 | arch-quality-analyzer subagent | — |
| 7 REVIEW | 完整性 + confidence/evidence 闭合 | arch-graph-reviewer subagent | — |
| 8 FINALIZE | 写最终 graph + fingerprint | engine `output-writer` | — |

**Subagent 调用方式**:同 UA,通过 Claude Code 内置的 subagent dispatch(`Agent` tool),subagent 定义在仓库顶级 `agents/arch-*.md`。

**写权限**: `specs/repos/*/knowledge-graph.json` + `specs/repos/*/.fingerprint.json` + `specs/cross-repo.json` + `.understand-arch/{project}/intermediate/**`(临时中间产物)

**多仓扫描行为**(详见 §3.15 调度方案):
- Phase 0 读 `repos.yaml`,校验各仓路径有效
- Phase 1-7 各仓**任务进全局队列**,M=5 个 worker 跨仓填空(策略 C 总并行池,UA 验证安全上限)
- 仓内 phase 严格顺序(Phase 2 必须等 Phase 1 完成),跨仓 phase 可错开
- 任一仓任一 phase 重试 2 次仍失败 → 该仓 `degraded`,其它仓继续
- Phase 8 FINALIZE 等所有仓 Phase 7 完成后,项目级 1 次跑跨仓合并:
  - 跨仓 edge 抽取 → 写 `cross-repo.json#cross_edges[]`
  - 跨仓能力聚合(arch-domain-analyzer --cross-repo)→ `capabilities[]`
  - 项目级 NFR/risks/debt(arch-quality-analyzer --cross-repo)→ `cross-repo.json`
  - 跨仓 referential integrity 校验(arch-graph-reviewer --cross-repo)
- 支持 `/arch-analyze --resume` 续跑(`intermediate/task-state.json` 持久化调度器状态)

#### 4.2.2 `arch-frame`

**唯一职责**: PRD 校验 + HARD GATE

**沿用 v1.0 行为**:
- 检测 ≥3 specific 未答问题就 block
- 产 `PM问题清单.md`(中文)
- `state.yaml#current_phase = awaiting-pm-confirmation`

**写权限**: `change-requests/CR-*/PM问题清单.md`

#### 4.2.3 `arch-adr`

**唯一职责**: append-only 新建 ADR md + 写 cross-repo.json#architecture_decisions[]

**双写协议**:
1. 新建 `decisions/ADR-NNN-{slug}.md`(append-only,**永不修改**)
2. 在 `cross-repo.json#architecture_decisions[]` 追加索引条目
3. 如有 supersede 关系,更新 cross-repo.json 中被取代 ADR 的 `superseded_by`(仅改索引,**不改老 ADR md**)
4. `affected_node_ids` 必须是 `{repo_id}::{local-id}` 全限定形式

**写权限**: `decisions/ADR-*.md` + `cross-repo.json#architecture_decisions[]` (局部追加 + supersede 更新)

#### 4.2.4 `arch-review`

**唯一职责**: structural + semantic check

**Modes**:
- `graph-integrity` — graph schema + evidence 闭合 + confidence 必填
- `wiki-consistency` — wiki 每条 prose 断言可追溯到 graph 节点 id
- `cr` — review.yaml 产出
- `drift` — graph 与代码 drift 检测

**写权限**: `change-requests/CR-*/CR.md` 第 14 段「Review」(append-only)+ audit 报告(临时)

### 4.3 Subagents(6 复刻 + 2 新增 = 8 个)

详细 fork 与改造规则见 §3.5。

#### 4.3.1 复刻自 UA 并改造(6 个)

由 `arch-analyze` 编排调用,产物对齐 v2.0 graph schema:

| # | Subagent | 职责 | 写权限 |
|---|---|---|---|
| 1 | `arch-project-scanner` | 项目扫描(每仓一次) | `intermediate/scan-result-{repo_id}.json` |
| 2 | `arch-file-analyzer` | 文件级 LLM 抽取(主力,并行 up to 5) | `intermediate/batch-*.json` |
| 3 | `arch-architecture-analyzer` | 架构分层 | `intermediate/layers-{repo_id}.json` |
| 4 | `arch-domain-analyzer` | 业务能力(支持跨仓 capability) | `intermediate/domains.json` |
| 5 | `arch-quality-analyzer` ★ v2.0 新增 | NFR / risks / debt(强制 confidence) | `intermediate/quality.json` |
| 6 | `arch-graph-reviewer` ★ v2.0 扩展 | **graph 生成全链路 review**(多 phase mode) | `intermediate/review-{phase}-{repo_id}.json` |

**arch-graph-reviewer 扩展(v2.0)**

UA 原版只在 Phase 7 跑一次。v2.0 扩展为**graph 生成全链路验收**,多 phase mode:

| Mode | 触发时机 | 检查内容 | 实现方式 |
|---|---|---|---|
| `--mode=phase-1-scan` | Phase 1 SCAN 后 | scan-result.json 完整性 / 语言框架检测合理性 / ignore 过激度 | engine 确定性脚本(`engine/bin/validate-phase-1.js`)|
| `--mode=phase-3-assemble` | Phase 3 ASSEMBLE 后 | **节点密度异常检测**(总节点数 / 文件数比例区间)+ 节点重复检测 + 孤立节点比例 — 取代 Phase 2 抽样审 | engine 脚本(`engine/bin/validate-phase-3.js`) |
| `--mode=phase-4-structure` | Phase 4 STRUCTURE 后 | ★ layers 是否覆盖 ≥70% nodes / 是否有孤立 node | **subagent**(主观判断) |
| `--mode=phase-5-domain` | Phase 5 DOMAIN 后 | ★ 每个 core 能力 ≥1 supporting component / capability 边界是否合理 | **subagent** |
| `--mode=phase-6-quality` | Phase 6 QUALITY 后 | confidence 必填 / weasel words / evidence_refs 闭合 | **subagent** |
| `--mode=phase-7-final` | Phase 7 REVIEW(最终) | graph 总图完整性 + referential integrity | **subagent**(UA 原版) |
| `--mode=phase-8-cross-repo` | Phase 8 FINALIZE | cross_edges referential integrity + 跨仓 capability 合理性 | **subagent** |

**实现切分原则**(Q-split-1=b):
- Phase 1-3:**确定性脚本**(机械可验证,免 subagent 成本)
- Phase 4-8:**subagent**(需要主观/语义判断)

**rubric 文件**:每 mode 对应 `internal/rubrics/graph-phase-{N}-*.yaml`,见 §11.4。

#### 4.3.2 v2.0 新增 design 链 subagent(2 个)

由 `/arch-design` 调度,服务"方案设计"主流程:

**7. `arch-impact-analyzer`** — 影响面 + 改动点分析

- **输入**:PRD + 当前 graph(分仓 + cross-repo) + 用户需求
- **输出**:写入 `change-requests/CR-*/CR.md` 的 **frontmatter#impact** + **第 8 段「改动清单」**
- **核心能力**:
  - 从 PRD/需求识别"需要新增/修改/删除"的事实(组件/接口/数据/部署)
  - 在 graph 中定位受影响的 nodes/edges(支持跨仓追踪)
  - 推导影响半径:通过 edges 二级传播,标 confidence
  - 按仓分组生成文件级/函数级/接口级改动清单
- **复用 UA 思路**:吸收 `src/diff-analyzer.ts` 的 graph-node-level diff 思路(方法论,不复制代码,详见 `skills/arch-design/references/impact-analysis.md`)
- **写权限**:`change-requests/CR-*/CR.md`(局部更新 frontmatter + 第 8 段)

**8. `arch-solution-designer`** — 实战级方案设计文档撰写

- **输入**:PRD + CR.md 已有 frontmatter#impact + 第 8 段改动清单 + 当前 graph + rules/*.md
- **输出**:写入 `change-requests/CR-*/CR.md` 的**主体 1-7 段 + 9-13 段**(14 段单文件结构,见 §4.1.2.1)
- **核心能力**:
  - 基于影响面写"现状分析"段(从 graph 抽相关组件子集)
  - 基于改动清单写"详细设计"段(数据/接口/组件/部署/时序,含 Mermaid)
  - 评估 NFR 影响 + 风险 + 测试策略
  - 推导实施步骤 + 灰度策略 + 回滚预案
  - 标 known_unknowns(待定问题)
- **rules/ 现读**:必须读 `rules/*.md` 全量,确保方案不违反组织约束
- **写权限**:`change-requests/CR-*/CR.md`(局部更新主体 1-7 + 9-13 段)

#### 4.3.3 v2.0 新增决策视图层 reviewer(1 个)

**9. `arch-senior-reviewer`** ★ — 高级架构师终审 agent

- **角色定位**:15 年经验高级架构师,经历多个 1M+ DAU 系统设计与重构;关注简洁性、演进性、风险识别、可观测性、可执行性;对模糊判断和应付式产出零容忍
- **触发命令**:**仅在 `/arch-design` 和 `/arch-wiki`(受众化 mode)末尾触发**
- **不触发场景**:`/arch-onboard` / `/arch-audit`(graph 层由 graph-reviewer 管,不重复)
- **输入**:对应产物 + rubric 文件 + 当前 graph(只读)+ rules/*.md
- **输出**:JSON 评审报告(见下方协议)

**evaluator 角色 prompt(摘要)**:
- 经验定位:多个 1M+ DAU 系统 + 跨业务架构治理经验
- 偏好:简洁优于复杂、演进优于一次到位、显式优于隐式、证据优于直觉
- 禁忌:不接受"应该/通常/大概",不接受"假设可以XX"式空想,不接受详细设计跟改动清单脱节
- 反馈强制 JSON 格式

**反馈 JSON 协议(强制)**:

```json
{
  "verdict": "pass | needs_revision | fail",
  "overall_score": 0.85,
  "dimensions": {
    "completeness": 0.9,
    "actionability": 0.7,
    "consistency": 0.85,
    "honesty": 0.95
  },
  "findings": [
    {
      "id": "f-001",
      "severity": "blocker | major | minor",
      "where": "solution-design.md § 4.3 组件变化",
      "issue": "新增 RateLimitService 但未定义接口契约,研发拿到无法实现",
      "expectation": "至少写出方法签名、入参类型、错误码",
      "actionable_fix": "在 § 4.2 加 IRateLimitService 接口定义,包含 check(userId, scope) → RateLimitDecision"
    }
  ],
  "passed_criteria": ["13 段段落完整", "替代方案诚实标注"],
  "summary_zh": "整体方案思路清晰,但详细设计缺接口契约,研发无法直接实施。建议补全接口签名后通过。"
}
```

**触发后行为(refiner loop)**:

```
arch-senior-reviewer verdict
├── pass            → 进入下一步(写盘 + 通知用户)
├── needs_revision  → 反馈打回 producer,refiner loop ≤2 次
│                     │ producer 用 findings 重写产物
│                     │ senior-reviewer 复审
│                     │ 仍 needs_revision → 第 3 次给用户 4 选项
└── fail            → 直接给用户 4 选项,不再 loop
```

**复用 §11.3 失败处理协议**(4 选项:retry with hints / manual fix / override / abort)。

**Mode**(v2.0 wiki 二级制度):
- `--mode=design` — 审单文件 `CR.md`(rubric: `senior-design-review.yaml`,完整 5 维度)
- `--mode=wiki-full` — 审 wiki 14 页(rubric: `senior-wiki-review-full.yaml`,完整 5 维度,~50K tokens)
  - **触发**:首次 wiki 渲染(`/arch-onboard → /arch-wiki` 链路);或用户显式 `--audience=cto|architect`
- `--mode=wiki-lite` — 轻量检查(rubric: `senior-wiki-review-lite.yaml`,~10K tokens)
  - **触发**:**第 2 次起任何 `/arch-wiki`**(默认开启,保证 wiki 实时刷新场景的质量底线)
  - 只查:weasel words 0 容忍 / 跨页节点引用一致性 / rules 摘要是否过期
  - 不查:架构合理性 / 受众适配 / 主观判断

**wiki 二级制度的设计意图**:wiki 是用户高频刷新的产物(每次代码改动后可能触发),完整 5 维度审次次跑成本不可接受;但完全不审会导致质量回退。wiki-lite 是最佳折中,~10K tokens/次给 wiki 质量底线。

**写权限**:
- `change-requests/CR-*/senior-review.json`(design mode)
- `wiki/.senior-review-{date}.json`(wiki-full mode)
- `wiki/.senior-lite-{date}.json`(wiki-lite mode)

### 4.4 废弃 skill(v1.0 → v2.0)

| v1.0 Skill | v2.0 处置 |
|---|---|
| `arch-brief` | 职责并入 `/arch-wiki` 的受众化 mode |
| `arch-options` | 删除。方案分歧在 CR 自由写,不强结构化 |
| `arch-pack` | 职责并入 `/arch-wiki` |
| `arch-radar` | 职责并入 `wiki/05-capabilities.md` 渲染 |
| `arch-diff-judge` | 下沉到 engine 的 fingerprint + staleness |

---

## 5. Wiki 结构

### 5.1 索引(`wiki/README.md`)

Notion 风格,章节列表 + 摘要 + 链接:

```markdown
# {项目名} 架构 Wiki

> 自动生成于 {timestamp},基于 commit {hash}。事实源:`specs/knowledge-graph.json`。

## 快速导航

| 页面 | 内容摘要 | 适合谁 |
|---|---|---|
| [01-overview.md] | 项目全景 + 关键事实表 | 全员 |
| [02-components.md] | 组件清单 + 依赖图 | 架构师 / 后端 |
| [03-interfaces.md] | 接口契约 + 通信模式 | 后端 / 集成 |
| ... |
| [15-rules.md] | 团队/项目约束规范 | 新人 / Reviewer |

## 新人 onboarding 路径
1. 先读 [01-overview.md]
2. 再读 [02-components.md] + [05-capabilities.md]
...
```

### 5.2 14 页职责(v2.0 收敛后)

| 页 | 职责 | 数据来源 | 跨仓视图 |
|---|---|---|---|
| 01-overview.md | 项目定位 + 关键事实表 + tech stack + 仓清单 | project + 关键 nodes + repos[] | 总览 |
| 02-components.md | **Logical + Development view**:组件清单 + 依赖 + 仓库/模块/语言/框架归属 | nodes(module/service) + edges + layers + repos[] | **按仓分组 + 多仓视图核心** |
| 03-interfaces.md | Logical view:接口契约 + **末尾"已知局限"段**(诚实告知扫描盲区) | nodes(endpoint) + cross_edges | 标跨仓调用 |
| 04-data-models.md | Logical view:数据模型 | nodes(table/schema) | 按仓分组 |
| 05-capabilities.md | 业务能力地图 + 成熟度雷达(跨仓) | capabilities[] + nodes(domain/flow) | **跨仓聚合** |
| 06-quality.md | NFR(项目级 + 仓级) | quality_attributes[] | 标作用域 |
| 07-risks-and-debt.md | 风险 + 技术债 | risks[] + technical_debt[] | 标影响仓 |
| 08-deployments.md | Physical view:部署拓扑 | nodes(resource/pipeline) | **跨仓拓扑** |
| 09-flows-and-scenarios.md | **Process + Scenarios view**:关键链路时序 + 业务场景串联 | nodes(flow/step) + edges + cross_edges | **跨仓链路明确标注** |
| 10-decisions.md | ADR 索引 + supersede 链 | cross-repo.json#architecture_decisions[] | 项目级 |
| 11-changes.md | CR 索引 + traceability | cross-repo.json#change_requests[] | 项目级 |
| 12-rules.md | rules/*.md 摘要 | rules/*.md(LLM 现读) | 项目级 |
| 13-pending-changes.md | **架构师 dashboard:in-flight CR 影响预览** | change_requests[status=draft\|in_review] + impact | **架构师 dashboard** |
| 14-diagrams.md | 4+1 视图占位(v2.0 仅占位;`/arch-diagram` 命令返回"开发中") | placeholder | — |

**v2.0 收敛说明**:
- 删原 10 development-view → 合并入 02 components(重叠 40%)
- 删原 11 scenarios → 合并入 09 flows(重叠 60%)
- 14-diagrams.md 占位保留(`/arch-diagram` 命令的目标产物,v2.1 实现图片生成)

**4+1 视图完整覆盖**:
- Logical = 02/03/04
- Development = 02(合并)
- Physical = 08
- Process + Scenarios = 09(合并)

### 5.2.1 wiki/03-interfaces.md 末尾"已知局限"段(强制)

每次渲染 03-interfaces.md 时,arch-wiki 必须在文末追加固定段落(LLM 不可省略):

```markdown
---

## 已知局限

本依赖图基于代码静态扫描 + `rules/dependencies.md` 人工声明构建,**可能存在以下盲区**:
- 运行时配置驱动的依赖(URL 从 ConfigMap / 环境变量 注入)
- 跨语言依赖(tree-sitter 不支持的语言)
- 通过消息中间件解耦的异步依赖(未在 dependencies.md 声明)
- 共享数据存储引发的隐式耦合
- Cron / Webhook / Service Mesh 路由层依赖

如发现遗漏,请补充到 `rules/dependencies.md`,下次 `/arch-onboard --refresh` 时会自动合并入 graph。
```

### 5.3 单页规约

- **无字数限制**,讲透为准
- 每条 prose 断言**必须**回链到 graph 节点 id 或 rules/*.md 路径
- 禁止弱化词("应该 / 大概 / 通常")
- `confidence=low` 的 LLM 推断条目必须标注 "(LLM 推断,需人工 confirm)"

### 5.4 渲染缓存

- wiki 首次产后,记录 graph fingerprint 到 `wiki/.cache.json`
- `/arch-wiki` 启动时对比 fingerprint:无变化 → 用缓存;有变化 → 失效的页重渲(per_node_freshness 决定哪页)

### 5.5 受众化 mode

见 §4.1.4。

---

## 6. Freshness

### 6.1 算法

1. engine 每次扫码后,为每个 file/function/class 节点算内容指纹
2. 持久化到 `.understand-arch/{project}/specs/.fingerprint.json`
3. 下次扫:新旧 fingerprint diff → 算 per_node_freshness

### 6.2 全局 status 判定

| 条件 | status |
|---|---|
| `last_scanned_commit == HEAD` 且无 fingerprint diff | `fresh` |
| 有 fingerprint diff,但**架构相关节点**未变 | `possibly_stale` |
| 有 fingerprint diff,**架构相关节点**变了 | `stale` |
| git 不可用 / `last_scanned_commit` 缺失 | `unknown` |

**架构相关节点**类型清单:`module / service / endpoint / table / schema / resource / pipeline / domain / flow`。

### 6.3 触发行为

- `stale` 时 `arch-design` 阻塞,给中文 refresh 建议(模板见 §10.1)
- `possibly_stale` 时 wiki 部分页失效(per_node_freshness)
- `fresh` 时所有缓存可用

---

## 7. Rules(团队/项目约束)

### 7.1 位置

`.understand-arch/{project}/rules/`,**项目级**,不区分团队/项目子目录。

### 7.2 模板(plugin 仓库 `templates/rules/`,中文)

参考业界规范的 6 个起点 md:

| 文件 | 参考标准 / 用途 |
|---|---|
| `banned-patterns.md` | OWASP Top 10 / Google Engineering Practices |
| `compliance.md` | GDPR / SOC2 / 等保 2.0 / 行业合规 |
| `network-boundaries.md` | Zero Trust / 网络分区 |
| `naming.md` | Google Java Style / Airbnb JavaScript Style / 通用命名规约 |
| `tech-radar.md` | ThoughtWorks Tech Radar(adopt / trial / assess / hold) |
| `dependencies.md` ★ v2.0 新增 | 人工补充代码扫描漏掉的服务依赖(极简格式:谁调谁、作用) |

每份示例 md 包含:目的、范围、规则条目、示例与反例。

#### 7.2.1 dependencies.md 极简样例

代码扫描存在天然盲区(运行时配置驱动、跨语言、消息中间件解耦、Cron、Service Mesh 路由、共享数据耦合等)。`dependencies.md` 由架构师/开发手工补充,只需写清楚**谁调用谁、作用是什么**:

```markdown
# 服务依赖补充声明

> 本文档由架构师/开发**手工补充**代码扫描漏掉的依赖。
> arch-analyze 读取本文件后写入 graph(标 source: human)。
> 只需写清楚:谁调用谁,作用是什么。

---

## web → api
作用:web 调 api 获取用户数据、订单数据

## api → notification-service
作用:订单状态变化时通知用户(走 Kafka,代码扫不到)

## api → Stripe
作用:订单支付

## cron-job → api
作用:每日 00:00 触发日报生成

## api ↔ reporting(共享 orders 表)
作用:reporting 直接读 api 写入的 orders 表
```

### 7.3 加载策略

### 7.3 加载策略

#### 7.3.1 一般规则(banned-patterns / compliance / network-boundaries / naming / tech-radar)

- 不进 graph(Q-detail-3=c 决策)
- `arch-wiki` 渲染 `wiki/15-rules.md` 时**现读** `rules/*.md` 全量
- 自由格式 markdown,无 frontmatter 要求

#### 7.3.2 dependencies.md(例外:进 graph)

- **arch-analyze 在 Phase 5 DOMAIN 阶段现读** `rules/dependencies.md`
- 把声明的依赖以 `source: human` 写入对应仓 graph 的 nodes/edges,或写入 `cross-repo.json#cross_edges`(若跨仓)
- 合并规则:
  - 若扫码已识别同一依赖 → 合并 evidence_refs(多源证据,confidence=high)
  - 若扫码未识别 → 新建 node/edge,confidence=medium,source=human
- 每条带 evidence_refs 指向 `rules/dependencies.md` 中的章节

### 7.4 violation 检测

- 仅在 `arch-review --mode=drift` 时触发
- LLM 现场比对 graph + rules,产临时报告(不写 graph)

---

## 8. State Machine

### 8.1 state.yaml 结构

沿用 v1.0,**微调**:

- `public_entry` 枚举: `"onboard" | "design" | "audit" | "wiki" | "diagram"`(原 `brief` → `wiki`,新增 `diagram`)
- `history[].skill` 枚举: `["arch-onboard", "arch-design", "arch-audit", "arch-wiki", "arch-diagram", "arch-analyze", "arch-frame", "arch-adr", "arch-review", "arch-senior-reviewer", "arch-graph-reviewer", "user"]`(扩到 12 个,新增 senior + graph reviewer 直接事件)
- ❌ 删除 `kb_loaded` 字段(rules/ 不再有"加载状态"概念,LLM 现读)
- ★ **新增** `hooks_enabled: bool`(默认 false,控制 §3.10 hooks 是否生效)

### 8.2 Phase 枚举

```yaml
not-started
scaffold
baseline_refresh        # arch-analyze 跑中
wiki_generation         # arch-wiki 跑中
cr_frame
impact_analysis
cr_review
adr_recorded
drift_audit
awaiting-pm-confirmation
blocked
completed
```

### 8.3 单 writer 规约

沿用 v1.0:`state.yaml` writer = 当前活跃 user-facing skill。内部 skill 返 `state_delta`。

---

## 9. 治理六条(v2.0)

1. **Graph 是唯一事实源** — 任何 wiki / ADR / CR / brief 出现的事实如与 graph 矛盾,就是 bug
2. **Append-only 历史** — `decisions/ADR-*.md` commit 后永不修改;supersede 关系记在 `graph.architecture_decisions[].superseded_by`;`state.yaml.history` + `state.yaml.overrides` 仅追加
3. **Fingerprint 驱动新鲜度** — graph 自带 freshness;engine 用 fingerprint 算
4. **Single-writer state** — 仅当前 user-facing skill 写 state.yaml,内部 skill 通过 state_delta
5. **Write-scope 契约** — 每 skill 可写路径在 `internal/tool-contracts/write-scope.yaml` 声明,acceptance 审计
6. **Evidence 闭合 + Confidence 必填** — graph 中 LLM 推断字段(quality_attributes / risks / technical_debt)必须带 confidence + evidence_refs;wiki 中每条结论可追溯到 graph 节点 id 或 rules/*.md 路径

---

## 10. 用户交互语言

用户可见提示**默认中文**,首次出现关键英文术语时加括号说明。YAML key 与 schema 字段保持稳定英文。

### 10.1 中文纯化原则

所有用户可见提示**默认纯中文**,英文术语只在以下三类情况保留:

1. **技术标识符**(不可翻译):`state.yaml` / `fingerprint` / `graph` / 命令名 / 文件路径
2. **首次引入术语**:行内括号注英文(例:"业务能力地图(capability map)")
3. **代码片段 / 字段名**:保留英文(`confidence` / `evidence_refs`)

**禁止**中英混杂的口语表达,例如:
- ❌ "graph 已 stale,建议 refresh"
- ✅ "架构基线已过期,建议刷新"

### 10.2 过期提示模板

```text
当前架构基线已过期:
  上次扫描提交:{last_scanned_commit}
  当前提交:{HEAD}
  内容指纹变化:新增 {added} / 删除 {removed} / 修改 {modified}
  其中架构相关节点变化:{N} 个

请选择:
  1. 立即刷新基线:运行 /arch-onboard --refresh(耗时较长)
  2. 查看漂移详情:运行 /arch-audit(耗时中等)
  3. 显式继续(标降级状态):回复"我知道,继续设计"
```

### 10.3 LLM 推断置信度标注

wiki 内 LLM 推断条目末尾追加:`(LLM 推断,置信度低,建议人工确认)`

### 10.4 验收失败 4 选项模板

```text
{检查项} 已连续失败 3 次。具体阻塞项:
{findings_list}

请选择下一步:
  1. 携带提示重试(把失败原因加入重试 prompt)
  2. 手工修正(自行修改产物,然后运行 /arch-audit 重新验收)
  3. 强制覆盖(留 OVR-{NNN} 覆盖记录,工作区标降级状态后继续)
  4. 放弃本次(回退到上一个稳定阶段)
```

---

## 11. Acceptance(验收机制)

### 11.0 验收机制总览(v2.0 二元分工)

v2.0 验收机制按**产物领域**拆为两套独立系统:

```
┌──────────────────────────────────────────────────────────────────┐
│  事实层验收(graph 生成)                                        │
│  Reviewer: arch-graph-reviewer(多 phase mode)                  │
│  性质:    客观,机械化为主                                      │
│  触发命令: /arch-onboard、/arch-audit                            │
│  介入点:  Phase 1-8 全链路                                      │
│  实现:    Phase 1-3 用 engine 确定性脚本                        │
│            Phase 4-8 用 subagent + rubric                        │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  决策视图层验收(design / wiki 产物)                            │
│  Reviewer: arch-senior-reviewer(高级架构师 agent)              │
│  性质:    主观,架构师水平判断                                  │
│  触发命令: /arch-design(默认)、/arch-wiki(仅受众化 mode)      │
│  介入点:  产物完成后终审                                        │
│  实现:    subagent + rubric + refiner loop                       │
└──────────────────────────────────────────────────────────────────┘

互不调用,各管一片。
```

**为什么这样切**:
- 事实层 80% 可客观验证(schema / 引用 / 字段),归 graph-reviewer 干,效率高
- 决策视图层 80% 需主观判断(分层是否合理、方案能否执行),归 senior-reviewer 干,质量高
- 两个 reviewer 能力模型不同,合并反而互相拖累

### 11.1 三层质量保障(每个 acceptance gate 内部)

不管哪个 reviewer,内部都跑三层:

```
Layer 1: structural_checks(脚本)
   - schema 合规 / 字段必填 / referential integrity
   - 失败 → fail-loud(立即停)
        ↓ 通过
Layer 2: semantic_checks(LLM + rubric)
   - 弱化词检测 / evidence 闭合 / confidence 必填
   - 失败 → retry ≤2 次 → 给用户 4 选项
        ↓ 通过
Layer 3: reviewer 终审(graph-reviewer 或 senior-reviewer)
   - 领域专属深审(见 §11.2 / §11.3)
   - 失败 → refiner loop ≤2 次 → 给用户 4 选项
```

### 11.2 graph-reviewer 验收清单(事实层)

按 §4.3.1 表展开,8 个 phase mode:

| Mode | 检查项 | rubric 文件 | 实现 |
|---|---|---|---|
| phase-1-scan | 文件数 / 语言数 / 框架数合理性;ignore 过滤率 < 95% | `graph-phase-1-scan.yaml` | 脚本 |
| phase-3-assemble | **节点密度异常**(总节点数 / 文件数 < 0.3 = 漏抽,> 5 = 过抽);无重复 id;孤立节点比例 < 20% | `graph-phase-3-assemble.yaml` | 脚本 |
| phase-4-structure | ★ layers 覆盖 ≥70% nodes;无孤立 node;每层 ≥3 nodes | `graph-phase-4-structure.yaml` | subagent |
| phase-5-domain | ★ 每个 core 能力 ≥1 supporting component;maturity 合理 | `graph-phase-5-domain.yaml` | subagent |
| phase-6-quality | NFR 8 类每类 ≥1 条;risks/debt 100% 带 confidence;0 weasel words | `graph-phase-6-quality.yaml` | subagent |
| phase-7-final | graph 总图完整性 + referential integrity + tour 可生成 | `graph-phase-7-final.yaml` | subagent(UA 原版)|
| phase-8-cross-repo | cross_edges 引用闭合;跨仓 capability supporting node 跨仓覆盖 | `graph-phase-8-cross-repo.yaml` | subagent |

### 11.3 senior-reviewer 验收清单(决策视图层)

#### 11.3.1 senior-design-review.yaml(arch-design 终审 rubric)

```yaml
dimensions:
  completeness:
    weight: high
    checks:
      - id: design-13-sections
        question: "solution-design.md 是否 13 段都有,无空段"
        pass_criterion: "13/13"
      - id: changes-coverage
        question: "changes.md 是否按仓分组,且每个改动跟 § 4 详细设计能对得上"
        pass_criterion: "≥90% 对得上"

  actionability:
    weight: high
    checks:
      - id: interface-contract
        question: "新增/修改接口是否有方法签名、入参/出参类型、错误码"
        pass_criterion: "100%"
      - id: implementation-steps
        question: "§ 9 实施步骤是否按依赖排序,每步有验证点"
        pass_criterion: "100%"
      - id: rollback-plan
        question: "§ 10 回滚预案是否含触发条件、步骤、数据回滚"
        pass_criterion: "若涉及 schema 变更必须 100%"

  consistency:
    weight: high
    checks:
      - id: design-vs-impact
        question: "§ 4 详细设计声明的组件改动跟 impact.yaml#nodes 是否一致"
        pass_criterion: "100%"
      - id: design-vs-changes
        question: "§ 4 详细设计跟 changes.md 文件清单是否对得上"
        pass_criterion: "≥95%"

  honesty:
    weight: high
    checks:
      - id: alternatives
        question: "§ 5 替代方案是否真有内容,不是凑数"
        pass_criterion: "至少 1 个有质量的 alternative,或显式声明无显著替代"
      - id: known-unknowns
        question: "§ 12 known_unknowns 是否标了至少 1 条(架构师标准:任何方案都有 unknown)"
        pass_criterion: "≥1 条 + reasoning"
      - id: weasel-words
        question: "全文是否有'应该/通常/大概'等弱化词"
        pass_criterion: "0 条"

  rules-compliance:
    weight: high
    checks:
      - id: rules-respected
        question: "方案是否违反 rules/*.md(尤其 banned-patterns / compliance / network-boundaries)"
        pass_criterion: "0 violation"

verdict_thresholds:
  pass: "overall_score ≥ 0.85 且无 blocker"
  needs_revision: "overall_score 0.6-0.85 或有 major findings"
  fail: "overall_score < 0.6 或有 blocker"
```

#### 11.3.2 senior-wiki-review.yaml(arch-wiki 终审 rubric,仅 cto/architect mode)

```yaml
dimensions:
  completeness:
    weight: high
    checks:
      - id: 16-pages
        question: "wiki 16 页是否全产"
        pass_criterion: "16/16"
      - id: per-page-substance
        question: "每页是否讲透(不被字数限制制约,但有'是否实质讲清楚'判断)"
        pass_criterion: "≥14/16 实质讲清楚"

  traceability:
    weight: high
    checks:
      - id: prose-to-graph
        question: "每条 prose 断言可回链 graph node id 或 rules path"
        pass_criterion: "≥95%"

  audience-fit:
    weight: high
    checks:
      - id: cto-fit
        question: "(cto mode)README + 01 + 06 + 07 + 13 是否突出战略/风险/决策,无技术细节冗余"
        pass_criterion: "≥0.8"
      - id: architect-fit
        question: "(architect mode)16 页全产,所有 4+1 视图与跨仓视图清晰"
        pass_criterion: "≥0.8"

  honesty:
    weight: high
    checks:
      - id: known-limitations
        question: "wiki/03-interfaces.md 末尾'已知局限'段是否保留"
        pass_criterion: "100%"

verdict_thresholds:
  pass: "overall_score ≥ 0.85 且无 blocker"
  needs_revision: "overall_score 0.6-0.85"
  fail: "overall_score < 0.6"
```

### 11.4 Acceptance Gate(用户入口级)

**4 个 acceptance gate**(`/arch-diagram` 占位无 acceptance):

| Gate | Layer 1 structural | Layer 2 semantic | Layer 3 reviewer |
|---|---|---|---|
| `onboard.yaml` | graph schema + nodes ≥ N + freshness=fresh | wiki 14 页可回链 graph | arch-graph-reviewer Phase 1/3/4/5/6/7/8(7 mode,取消原 phase-2) |
| `design.yaml` | CR.md frontmatter schema + 14 段全产 | graph 局部追加成功 + rules 不冲突 | ★ **arch-senior-reviewer --mode=design** |
| `audit.yaml` | freshness 计算正确 + 状态报告产出 | 用户 3 选项交互完成 | 默认不跑(用户选"查看漂移详情"时才跑 arch-graph-reviewer drift mode) |
| `wiki.yaml` | wiki 14 页全产 + 每条 prose 可 trace | 受众化 mode 输出符合预期 | ★ **arch-senior-reviewer**:首次跑 `--mode=wiki-full`,后续每次跑 `--mode=wiki-lite`,audience=cto/architect 走 wiki-full |

### 11.5 Refiner Loop(共享协议)

**所有 Layer 2 + Layer 3 验收失败时统一协议**(Q-split-3=a):

```
失败
 ↓
retry with hints(把 findings 加进 prompt 重跑 producer)
 ↓ 仍失败
retry 第 2 次
 ↓ 仍失败
第 3 次给用户中文 4 选项:
  1. retry with hints(再试一次,你可补充上下文)
  2. manual fix(用户手动改产物,然后跑 /arch-audit 重验)
  3. override(留 OVR-NNN 记录,标 state.yaml degraded,继续)
  4. abort(放弃本次,回到上个 stable phase)
```

### 11.6 Override 审计约束

- override **必须**记入 `state.yaml.overrides[]`(append-only,见 state schema)
- 每条 override:`{ts, scope, reason, by}`,reason **必填且 ≥20 字符**
- `state.yaml.status` 自动标 `degraded`
- 下次 `/arch-audit` 报告会显示 degraded 项 + override 历史,提示用户清理

### 11.7 Acceptance Budget(token/时间预算)

每个 gate 最大资源消耗(防爆):

| Gate | token 上限 | refiner loop 上限 |
|---|---|---|
| onboard | 1M total(全链路含多 phase reviewer) | 2 |
| design | 200K | 2 |
| audit | 100K | 2 |
| wiki | 300K(含 senior review on cto/architect mode) | 2 |

超 budget → 自动降级 `degraded` + 中文提示用户。

### 11.8 Rubric 文件清单(共 10 份)

```
internal/rubrics/
├── graph-phase-1-scan.yaml            # 脚本读
├── graph-phase-3-assemble.yaml        # 脚本读(取代原 phase-2 抽样)
├── graph-phase-4-structure.yaml       # subagent 读
├── graph-phase-5-domain.yaml          # subagent 读
├── graph-phase-6-quality.yaml         # subagent 读
├── graph-phase-7-final.yaml           # subagent 读
├── graph-phase-8-cross-repo.yaml      # subagent 读
├── senior-design-review.yaml          # ★ design 终审(完整 5 维度)
├── senior-wiki-review-full.yaml       # ★ wiki 完整审(首次 + audience=cto/architect)
└── senior-wiki-review-lite.yaml       # ★ wiki 轻量审(每次刷新都跑)
```

**rubric 总数:9 份**(7 graph + 2 senior)+ 1 wiki-lite = 10 份。

### 11.9 用户自定义 Rubric(可选)

用户可在 `.understand-arch/{project}/rubrics/` 下覆盖默认 rubric(例如对特定行业加重 compliance 权重)。加载顺序:项目级 → 全局默认。

---

## 12. Write-scope 契约

```yaml
# internal/tool-contracts/write-scope.yaml(v2.0)

skills:
  arch-onboard:
    direct_writes:
      - "state.yaml"
      - "specs/repos.yaml"                  # ★ 首次扫描时引导生成
      - ".metrics.jsonl"
    indirect_writes_via_dispatch:
      - "specs/repos/*/knowledge-graph.json"  # via arch-analyze
      - "specs/repos/*/.fingerprint.json"      # via arch-analyze
      - "specs/cross-repo.json"                # via arch-analyze
      - "wiki/**"                              # via arch-wiki
    forbidden:
      - "decisions/**"
      - "change-requests/**"
      - "engine/**"
      - "rules/**"

  arch-design:
    direct_writes:
      - "state.yaml"
      - "change-requests/CR-*/cr.md"
      - "change-requests/CR-*/impact.yaml"
      - "change-requests/CR-*/impact.md"
      - "change-requests/CR-*/changes.md"
      - "change-requests/CR-*/solution-design.md"   # ★ v2.0 一等产物
      - "change-requests/CR-*/review.yaml"
      - ".metrics.jsonl"
    cross_repo_partial_writes:                       # ★ v2.0:cross-repo.json 仅允许追加这些字段
      - "change_requests[]"
      - "traceability[]"
    indirect_writes_via_dispatch:
      - "decisions/ADR-*.md"                          # via arch-adr
      - "cross-repo.json#architecture_decisions[]"    # via arch-adr
    forbidden:
      - "wiki/**"
      - "engine/**"
      - "rules/**"
      - "specs/repos/**"                              # 不能动仓内 graph

  arch-audit:
    direct_writes:
      - "state.yaml"
      - ".metrics.jsonl"
      - "audit-{date}.md"                  # 临时报告,不进 wiki
    indirect_writes_via_dispatch:
      - "specs/.fingerprint.json"           # via arch-analyze fingerprint-check
    forbidden:
      - "specs/knowledge-graph.json"
      - "wiki/**"
      - "decisions/**"
      - "engine/**"
      - "rules/**"

  arch-wiki:
    direct_writes:
      - "state.yaml"
      - "wiki/**"
      - "wiki/.cache.json"
      - ".metrics.jsonl"
    forbidden:
      - "specs/**"
      - "decisions/**"
      - "change-requests/**"
      - "engine/**"
      - "rules/**"

  arch-diagram:                            # v2.0 占位
    direct_writes:
      - "state.yaml"
      - ".metrics.jsonl"
    forbidden:
      - "*"                                 # v2.0 不写任何文件

  arch-analyze:
    direct_writes:
      - "specs/repos/*/knowledge-graph.json"          # 各仓 graph
      - "specs/repos/*/.fingerprint.json"
      - "specs/cross-repo.json"                       # 跨仓 graph
      - "specs/repos.yaml"                            # 首次时由 arch-onboard 引导生成,后续 arch-analyze 可更新 commit hash
      - ".metrics.jsonl"
    forbidden:
      - "wiki/**"
      - "decisions/**"
      - "change-requests/**"

  arch-frame:
    direct_writes:
      - "change-requests/CR-*/PM问题清单.md"
      - "change-requests/CR-*/cr.md"
    forbidden:
      - "specs/**"
      - "wiki/**"
      - "decisions/**"

  arch-adr:
    direct_writes:
      - "decisions/ADR-*.md"
    cross_repo_partial_writes:
      - "architecture_decisions[]"                    # 写 cross-repo.json
    forbidden:
      - "wiki/**"
      - "change-requests/**"
      - "engine/**"
      - "specs/repos/**"

  arch-review:
    direct_writes:
      - "change-requests/CR-*/review.yaml"
      - "audit-{date}.md"
    forbidden:
      - "specs/**"
      - "wiki/**"
      - "decisions/**"
      - "engine/**"

forbidden_globally:
  - "*.tf"
  - "*.hcl"
  - "values*.yaml"
  - "helm/**"
  - "k8s/**"
  - ".github/workflows/**"
  - ".gitlab-ci.yml"
  - "Dockerfile"
  - "docker-compose*"
  - "openapi*"
  - "schema.sql"
  - "migrations/**"
  - "src/**"                               # 业务代码
```

---

## 13. JSON Schema(7 个)

```
internal/schemas/
├── repos.schema.json                   # ★ specs/repos.yaml(多仓注册表)
├── repo-knowledge-graph.schema.json    # ★ 仓内 graph(specs/repos/{repo_id}/knowledge-graph.json)
├── cross-repo.schema.json              # ★ 跨仓 graph(specs/cross-repo.json)
├── cr.schema.json                      # CR 子产物 cr.md frontmatter
├── impact.schema.json                  # CR 子产物 impact.yaml
├── review.schema.json                  # CR 子产物 review.yaml
└── state.schema.json                   # state.yaml(微调,移除 kb_loaded)
```

### 13.1 repos.schema.json

- 必填字段:`version / repos[]`
- repos[] 每条:`id / path / git_remote / primary_language` 必填,`description` 可选

### 13.2 repo-knowledge-graph.schema.json

- 必填顶层:`version / kind="codebase" / repo_id / repo_meta / nodes / edges / layers / freshness / scan_meta`
- 每个 node.id 必须匹配正则 `^[a-z][a-z0-9-]*::[a-zA-Z0-9-_]+$`(即 `{repo_id}::{local-id}`)
- 每个 node.repo_id 必须等于顶层 repo_id
- edges 内的 source/target 必须都在本仓 nodes 内(referential integrity)

### 13.3 cross-repo.schema.json

- 必填顶层:`version / project / repos[]`
- 可选顶层:`cross_edges / capabilities / architecture_decisions / change_requests / quality_attributes / risks / technical_debt / known_unknowns / traceability`
- LLM 产物字段(quality_attributes / risks / technical_debt / capabilities)的 `confidence` **强制必填**
- cross_edges 内的 source/target 必须跨仓(不同 repo_id 前缀)
- 所有引用 node_ids 必须能在某个仓的 graph 中找到(全局 referential integrity)

---

## 14. v1.0 → v2.0 Breaking Changes

| 类别 | 变化 |
|---|---|
| **项目模型** | 单仓项目 → **业务系统(N≥1 仓)** |
| **事实层** | 5 specs yaml → 分仓 `specs/repos/*/knowledge-graph.json` + 跨仓 `specs/cross-repo.json` |
| **多仓支持** | 无 → 原生支持(repos.yaml 注册 + node id `::` 前缀) |
| Skill 数 | 13 → 9 user-facing + 8 subagent(原 9 用户 + 9 内部) |
| 用户入口 | 4 → 5(新增 `/arch-wiki` 和 `/arch-diagram`,`/arch-brief` 废弃) |
| **arch-design** | 简单 CR 流程 → **13 段 RFC 风格 solution-design.md + impact.yaml/md + changes.md** |
| **新 subagent** | 无 | arch-impact-analyzer / arch-solution-designer / arch-quality-analyzer |
| 配置目录 | `~/.understand-arch/kb/` → `.understand-arch/{project}/rules/` |
| 视图层 | `generated/` → `wiki/`(16 页含 `16-pending-changes.md` 架构师 dashboard) |
| Schema 数 | 14 → **7**(加 repos / repo-graph / cross-repo) |
| 引擎 | 无引擎(LLM 全扫) → fork UA 三层(orchestrator + subagents + engine tools) |
| Mermaid | `specs/diagrams/*.mmd` → wiki/12-diagrams.md 内嵌(v2.0 占位) |
| 字数限制 | wiki 单页 ≤200 行 → 无限制 |
| Ownership | graph 内字段 + 数组 → 完全删除 |
| Freshness 算法 | 命中文件数阈值启发式 → **每仓独立 fingerprint** 精确算 |
| KB schema | 5 个 yaml schema | 删除,改为自由 md |
| **Node ID 格式** | 仓内唯一 | **`{repo_id}::{local-id}` 全局唯一** |

**不提供自动迁移工具**。v1.0 旧工作区(我们无真实用户)直接重新跑 `/arch-onboard` 即可。

---

## 15. 落地路线(Phase 0 → Phase 9)

| Phase | 内容 | 状态 |
|---|---|---|
| 0 | spec-v2.0 outline + 完整 spec(含多仓 + arch-design 重写) | ✅ |
| 1 | Fork UA + license check (MIT) | ✅ |
| 2 | Fork engine 三层全集 + 多仓改造:engine/ + agents/arch-*.md + skills/arch-analyze/SKILL.md(多仓 7-phase 编排) + monorepo 架子 + 搬 UA 测试 | 待开 |
| 3 | 改造 6 个 subagent 适配 v2.0 字段(含 repo_id 前缀);新写 **4 个**:arch-quality-analyzer + arch-impact-analyzer + arch-solution-designer + **arch-senior-reviewer**;扩展 arch-graph-reviewer 多 phase mode | 待开 |
| 4 | 扩展 engine/src/extensions/:arch-schema.ts(分仓 + cross-repo) + arch-validator.ts(referential integrity 跨仓校验)+ output-writer.ts(写 repos/*/graph.json + cross-repo.json) | 待开 |
| 5 | 重写其它 8 个 skill:**arch-onboard(含多仓引导式生成 repos.yaml)** / arch-design(13 段 solution-design) / arch-audit / arch-wiki(16 页含 pending-changes) / arch-diagram(占位) / arch-frame / arch-adr / arch-review | 待开 |
| 6 | 重写 schemas(**7** 个,含 CR.md frontmatter schema)+ acceptance(4 gate)+ **rubrics(10 份,含 wiki-lite/full + 取消 phase-2)** + write-scope + README + rules 模板(6 份,含 dependencies.md)+ 更新 .claude-plugin/ plugin manifest | 待开 |
| 7 | 复刻 hooks/ 自动更新(hooks.json + arch-update-prompt.md);对接多仓 freshness 模型(每仓独立 fingerprint) | 待开 |
| 8 | esbuild bundle engine 工具到 engine/bin/,验证 plugin 安装后免 npm install 可跑 | 待开 |
| 9 | e2e 验证:plugin `samples/` 单仓 + 真实多仓项目 dogfood + hook 增量更新链路 | 待开 |

---

## 16. 未进 v2.0(v2.1+ 候选)

- `/arch-diagram` 真正实现图片生成(C4 + 4+1 视图)
- PreToolUse hook 硬拦截 write-scope
- RAG 问答(基于 graph + wiki + ADR + CR)
- AI / agent 架构 KB seed
- Ownership 自动推断(从 CODEOWNERS / git blame,不写 graph,临时给出)
- Engine 升级:UA 上游更新的可选 sync 机制

---

## 附录 A: 与 v1.0 spec(`docs/spec-v1.0.md`)的关系

v1.0 spec 完整废弃。v2.0 spec 是新事实源。

`docs/spec-v1.0.md` 保留作为历史归档,文档头部加 deprecation banner。
