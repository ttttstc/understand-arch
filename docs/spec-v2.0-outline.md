# understand-arch v2.0 设计 Outline

> 框架级草案,1 页。审通过后展开完整 `spec-v2.0.md`。
>
> v2.0 是 **breaking change**,不向后兼容 v1.0。

---

## 1. 目标

让 `understand-arch` 给项目维护**一份独立、可信、可版本化、agent 可读**的架构知识库,支持:

1. 高级架构师做**完整系统架构、功能、风险、技术债**分析
2. **4+1 视图**绘制(占位,后续接图片生成)
3. **新同事快速接手**项目
4. 变更管理(CR)与决策留底(ADR)

v2.0 相对 v1.0 的根本变化:**砍掉外部依赖(UA)**,fork 其确定性扫描层并扩展;**事实层从 5 份 yaml 收敛为 1 份 graph json**;**人类视图层从 generated/ 升级为 wiki/**(可读、无字数限制、LLM 渲染)。

---

## 2. 数据模型(只有 4 层)

```
arch/{project}/
├── specs/
│   ├── knowledge-graph.json          # ★ 唯一事实层
│   └── .fingerprint.json              # 内容指纹存储(freshness 用)
├── wiki/                              # ★ 人类视图层(LLM 渲染,缓存 + fingerprint 失效)
│   ├── README.md                      # 索引(Notion 风格章节列表)
│   ├── 01..15-*.md                    # 15 页架构维度展开
├── rules/                             # ★ 团队/项目约束规范(用户编辑,LLM 全量读)
│   ├── banned-patterns.md
│   ├── compliance.md
│   ├── network-boundaries.md
│   ├── naming.md
│   └── tech-radar.md
├── decisions/                         # append-only ADR markdown(不变)
│   └── ADR-NNN-*.md
├── change-requests/                   # CR 工作区(不变)
│   └── CR-YYYY-NNN-{slug}/
├── state.yaml                         # workflow 状态机
└── .metrics.jsonl
```

**移除**(v1.0 → v2.0):
- ❌ `specs/baseline.yaml / quality.yaml / risks.yaml / decisions.yaml / traceability.yaml`(被 graph 取代)
- ❌ `specs/diagrams/`(Mermaid 改为 wiki 内嵌)
- ❌ `generated/`(被 wiki/ 取代)
- ❌ `~/.understand-arch/kb/`(被项目内 `rules/` 取代)

---

## 3. knowledge-graph.json 结构(事实层全集)

继承 UA 21 node + 35 edge + layers + tour,**扩展为完整架构事实库**。

### 3.1 顶层结构

```typescript
KnowledgeGraph {
  // ====== UA 原生(沿用)======
  version: string
  kind: "codebase"
  project: ProjectMeta
  nodes: GraphNode[]                   // 21 种节点类型,扩展字段见 3.2
  edges: GraphEdge[]                   // 35 种边类型
  layers: Layer[]
  tour: TourStep[]                     // 保留兼容,我们不主用

  // ====== v2.0 扩展 ======
  architecture_decisions: ArchitectureDecision[]   // ADR 索引(历史,不绑死未来设计)
  change_requests: ChangeRequestRef[]              // CR 索引(同上)
  quality_attributes: QualityAttribute[]           // NFR,LLM 分析产
  risks: Risk[]                                    // LLM 分析产
  technical_debt: TechnicalDebt[]                  // LLM 分析产
  constraints: Constraint[]                        // 从 rules/*.md 注入(摘要+路径)
  known_unknowns: KnownUnknown[]                   // LLM 主动诚实标
  freshness: FreshnessMeta                         // fingerprint 算出
  traceability: TraceabilityLink[]                 // CR ↔ nodes ↔ ADR
  scan_meta: ScanMeta                              // engine 元数据
}
```

### 3.2 GraphNode 扩展字段(可选)

```typescript
GraphNode {
  // UA 原生: id, type, name, filePath, lineRange, summary, tags, complexity, ...
  // v2.0 加:
  criticality?: "critical" | "high" | "medium" | "low"
  maturity?: "experimental" | "growing" | "stable" | "deprecated"
  importance?: "core" | "supporting" | "edge"
  boundary?: "internal" | "public" | "external"
  communication?: "sync" | "async" | "event"
  data_sensitivity?: "public" | "internal" | "pii" | "secret"
  sla?: { availability?: string; latency_p99_ms?: number }
  linked_adrs?: string[]
  linked_crs?: string[]
  linked_risks?: string[]
  evidence_refs?: EvidenceRef[]
  confidence?: "high" | "medium" | "low"
}
```

### 3.3 顶层数组要点(完整定义见 spec-v2.0.md)

- `architecture_decisions[]`: id / title / status / supersedes / affected_node_ids / md_path
- `change_requests[]`: id / title / status / impact_node_ids / introduced_adrs / dir_path
- `quality_attributes[]`: category(8 类)/ statement / target / measurement / status / **confidence**
- `risks[]`: category / likelihood / impact / severity / affected_node_ids / mitigation / **confidence**
- `technical_debt[]`: category / cost_estimate / business_impact / status / **confidence**
- `constraints[]`: category / statement / source(rules/*.md 路径)/ violations
- `known_unknowns[]`: category / statement / suggested_action
- `freshness`: last_scanned_commit / status / per_node_freshness
- `traceability[]`: cr_id / affected_node_ids / adr_ids
- `scan_meta`: engine_version / files_scanned / languages_detected / ...

### 3.4 字段填充责任

| 字段 | 谁填 |
|---|---|
| nodes / edges / layers | engine(确定性,tree-sitter) |
| node 的 criticality / maturity / importance | LLM 推断 + 人工修正 |
| quality_attributes / risks / technical_debt | LLM 分析产,**强制 confidence + evidence_refs** |
| architecture_decisions | `arch-adr` 写,LLM 不直接抽 |
| change_requests | `arch-design` 写 |
| constraints | 启动时从 `rules/*.md` 注入(自由 markdown,摘要 + 路径) |
| known_unknowns | LLM 主动标(没把握就 unknown) |
| freshness | engine 用 fingerprint 算 |

### 3.5 13 类架构问题覆盖度

| # | 架构师问题 | 覆盖 |
|---|---|---|
| 1 | 组件构成与边界 | nodes(module/service) + boundary |
| 2 | 组件交互 | nodes(endpoint) + edges + communication |
| 3 | 数据流 | nodes(table/schema) + data_sensitivity + edges |
| 4 | 部署拓扑 | nodes(resource/service/pipeline) + boundary |
| 5 | 业务链路 | nodes(flow/step) + edges |
| 6 | 能力地图 | nodes(domain/flow) + maturity/importance |
| 7 | NFR | quality_attributes[] |
| 8 | 风险/技术债 | risks[] + technical_debt[] |
| 9 | ADR | architecture_decisions[] |
| 10 | CR 变更 | change_requests[] + traceability[] |
| 11 | ~~ownership~~ | ❌ 不 cover(v2.0 决策舍弃) |
| 12 | 约束/反模式 | constraints[](rules/*.md) |
| 13 | evidence 可信度 | EvidenceRef.source + confidence + known_unknowns[] |

**12/13 cover**(ownership 主动舍弃)。

---

## 4. Engine(Fork from UA `@understand-anything/core`,MIT)

### 4.1 位置 + 包名

- 仓库: `understand-arch/engine/`
- 包名: `@understand-arch/scanner`
- 入口: `engine/bin/scanner.js`(esbuild bundle 单文件,无 node_modules 依赖)
- Skill 调用: `node engine/bin/scanner.js <project-root> --out arch/{project}/specs/`

### 4.2 Fork 范围(精简版)

**搬**: analyzer/{graph-builder, layer-detector, normalize-graph} · languages/* · plugins/* · ignore-filter · fingerprint · staleness · search · schema · types

**不搬**: tour-generator · language-lesson · embedding-search · 知识图谱节点(article/entity/topic/claim/source) · dashboard · chat

### 4.3 引擎产物

`engine/` 跑完产 `specs/knowledge-graph.json`(只填 engine 能确定的部分:nodes/edges/layers/freshness/scan_meta),LLM 阶段再补全其它字段。

### 4.4 License 与归属

- engine/ 目录顶层放 `NOTICE` 文件,保留 UA MIT copyright
- engine/package.json 注明 `"based-on": "@understand-anything/core (MIT, Yuxiang Lin 2026)"`

---

## 5. Skill 套件(9 个)

### 5.1 用户入口(5)

| 命令 | 用户场景 | 内部调度 |
|---|---|---|
| `/arch-onboard` | "建立基线" / "看懂这个项目" | arch-analyze(扫码) → arch-wiki(产 wiki) |
| `/arch-design` | "设计这份 PRD" / "开 CR" | arch-frame(PRD HARD GATE) → arch-analyze(局部刷新 graph) → arch-adr(可选) → arch-review |
| `/arch-audit` | "基线还能信吗" | arch-analyze(freshness/drift) → arch-review(graph 完整性 + wiki 一致性) |
| `/arch-wiki` | "重新生成 wiki" / "给新人 / CTO 一份" | 检查 graph fingerprint → 失效页重渲;支持受众化(原 arch-brief 职责) |
| `/arch-diagram` | "画 4+1 视图 / C4 图" | **占位实现**,后续接图片生成 |

### 5.2 内部 skill(4)

| Skill | 唯一职责 | 写权限 |
|---|---|---|
| `arch-analyze` | 跑 engine + LLM 增强 → 写 graph(全字段) | `specs/knowledge-graph.json` + `.fingerprint.json` |
| `arch-frame` | PRD 校验 + HARD GATE | `change-requests/CR-*/cr.md` |
| `arch-adr` | 新建 ADR md + 写 graph.architecture_decisions[](双写) | `decisions/ADR-*.md` + graph 局部 |
| `arch-review` | structural + semantic check | `change-requests/CR-*/review.yaml` + audit 报告 |

### 5.3 废弃 skill(v1.0 → v2.0)

- `arch-brief` → 职责并入 `/arch-wiki`(受众化是 wiki 一种 mode)
- `arch-options` → 删除,方案分歧在 CR 自由写,不强结构化
- `arch-pack` → 职责并入 `/arch-wiki`
- `arch-radar` → 职责并入 `wiki/05-capabilities.md` 渲染
- `arch-diff-judge` → 下沉到 engine 的 fingerprint + staleness

**总计 9 skill,比 v1.0 砍 4 个**。

---

## 6. Wiki 结构(15 页,无字数限制,讲透为准)

```
arch/{project}/wiki/
├── README.md                     # 索引(Notion 风格章节列表 + 摘要 + 链接)
├── 01-overview.md                # 项目全景:定位 + 关键事实表
├── 02-components.md              # Logical view (4+1):组件清单 + 依赖
├── 03-interfaces.md              # Logical view:接口契约
├── 04-data-models.md             # Logical view:数据模型
├── 05-capabilities.md            # 业务能力地图 + 成熟度雷达
├── 06-quality.md                 # NFR / 质量属性
├── 07-risks-and-debt.md          # 风险 + 技术债台账
├── 08-deployments.md             # Physical view (4+1):部署拓扑
├── 09-runtime-flows.md           # Process view (4+1):关键链路时序
├── 10-development-view.md        # Development view (4+1):仓库/模块
├── 11-scenarios.md               # Scenarios view (4+1):场景串联
├── 12-diagrams.md                # ★ 4+1 视图占位(等 /arch-diagram 实现)
├── 13-decisions.md               # ADR 索引 + supersede 链
├── 14-changes.md                 # CR 索引 + traceability
└── 15-rules.md                   # rules/*.md 摘要(给新人看的约束清单)
```

**渲染策略**:LLM 基于 graph 现产,fingerprint 不变就用缓存,变了重产对应页(per-node_freshness 决定哪页失效)。

**单页无字数限制** — 讲清楚为准,不为压缩而压缩。

---

## 7. Rules(团队/项目约束)

### 7.1 位置

`arch/{project}/rules/` — 项目级,**不**用全局目录。

### 7.2 模板(`arch/_template/rules/`,中文)

按业界规范提供 5 个 md 起点:

| 文件 | 参考标准 |
|---|---|
| `banned-patterns.md` | OWASP / Google Engineering Practices(禁用模式) |
| `compliance.md` | GDPR / SOC2 / 等保 / 行业合规红线 |
| `network-boundaries.md` | Zero Trust / 网络分区 |
| `naming.md` | Google Java Style / Airbnb JavaScript Style / 项目命名规约 |
| `tech-radar.md` | ThoughtWorks Tech Radar(adopt / trial / assess / hold) |

每份示例 md 含:目的、范围、规则条目(可选优先级/严重度)、示例与反例。

### 7.3 加载

启动任意 user-facing skill 时:`rules/*.md` 全量读 → 摘要写入 `graph.constraints[]`(category + statement + source 路径)→ LLM 后续生成时把 rules 作为硬约束。

### 7.4 进 wiki

`wiki/15-rules.md` 把 rules 摘要呈现给新人。

---

## 8. Freshness(用 fingerprint)

### 8.1 算法

1. engine 扫码后,为每个 file/function/class 算内容指纹(UA 已有 `fingerprint.ts`)
2. 持久化到 `arch/{project}/specs/.fingerprint.json`
3. 下次扫:对比新旧 fingerprint → 算每个节点的 `fresh | possibly_stale | stale`

### 8.2 全局 status 判定

- 任何 fingerprint 变化 → `possibly_stale`
- 架构相关节点(module/service/endpoint/table/schema/resource/pipeline/domain/flow)变化 → `stale`
- 无变化 → `fresh`
- git 不可用或首次扫 → `unknown`

### 8.3 触发行为

- `stale` 时 arch-design 阻塞并给中文 refresh 建议
- wiki 缓存按 per_node_freshness 部分失效

---

## 9. 治理六条(v2.0 更新版)

1. **Graph 是唯一事实源** — 任何 wiki / ADR / CR / brief 出现的事实如与 graph 矛盾,就是 bug
2. **Append-only 历史** — `decisions/ADR-*.md` commit 后永不修改;supersede 关系记在 `graph.architecture_decisions[].superseded_by`
3. **Fingerprint 驱动新鲜度** — graph 自带 freshness;engine 用 fingerprint 算,不再靠启发式
4. **Single-writer state** — 仅当前 user-facing skill 写 `state.yaml`,内部 skill 返 state_delta
5. **Write-scope 契约** — 每 skill 可写路径在 `internal/tool-contracts/write-scope.yaml` 声明,acceptance 审计
6. **Evidence 闭合 + Confidence 必填** — graph 中 LLM 推断字段(quality_attributes/risks/technical_debt)必须带 confidence + evidence_refs;wiki 中每条结论可追溯到 graph 节点 ID

---

## 10. v1.0 → v2.0 Breaking Changes 清单

| 类别 | 变化 |
|---|---|
| 数据模型 | 5 specs yaml → 1 graph.json |
| Skill 数 | 13 → 9 |
| 配置目录 | `~/.understand-arch/kb/` → `arch/{project}/rules/` |
| 视图层 | `generated/` → `wiki/` |
| Schema 数 | 14 → ~10 (1 graph + 3 CR + 1 state + ~5 待定) |
| 引擎 | 无引擎(LLM 全扫) → fork UA core(tree-sitter + WASM) |
| Mermaid | `specs/diagrams/*.mmd` → wiki/12-diagrams.md 内嵌 + `/arch-diagram` 占位 |
| 字数限制 | wiki 单页 ≤200 行 → 无限制 |
| Ownership | graph 内字段 | 删除 |

不提供自动迁移工具。旧用户(我们还没有真实用户)重新 `/arch-onboard` 即可。

---

## 11. 下一步

outline 通过 → 展开 `docs/spec-v2.0.md`(详细字段定义 / acceptance gates / state machine / 整套流程图)→ 进 Phase 2(fork engine 代码)。
