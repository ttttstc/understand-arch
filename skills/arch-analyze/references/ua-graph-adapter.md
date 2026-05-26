# Understand-Anything 知识图谱适配器

> arch-analyze 在 Project Scanner 阶段检测到 `.understand-anything/knowledge-graph.json` 时,使用本手册把 UA 的 nodes/edges/layers/tour 直接转成我们的 `specs/*.yaml` + `generated/wiki/00-阅读指引.md`,跳过自有的 LLM-driven 扫描。
>
> **核心原则**:UA 的产出是机器扫的事实(确定性),我们的 specs 是机器事实 + LLM 语义层。**LLM 在本流程中只补 UA 没抓的语义层**(capabilities / NFR / risks 解释 / org 漂移),不重做扫描。
>
> 参考:[Understand-Anything](https://github.com/Lum1104/Understand-Anything)(31K+ star Claude Code plugin,与本套件互为正交)。

---

## 1. 何时启用

### 启用条件(全部满足)

1. 文件存在:`${ARCH_PROJECT_DIR}/../.understand-anything/knowledge-graph.json`
2. JSON 通过基础合法性检查(顶层有 `project / nodes / edges`)
3. UA 的 `project.gitCommitHash` 与当前仓库 HEAD 满足以下之一:
   - 完全相同 → **FRESH**,直接用
   - 不同但中间 changed files 数 ≤ 20 → **POSSIBLY_STALE**,先用 + 在 evidence_refs 标注 commit 漂移
   - 不同且 changed files 数 > 20 → **STALE**,默认提示用户重跑 `/understand`,得到确认后再用旧图(或用户拒绝则回退 standalone)

### 不启用的情况

- 文件不存在 → 回退 standalone mode(走 `scanner-playbook.md` + `subagent-orchestration.md`)
- JSON 损坏 / schema 不通过 → 报错并回退 standalone
- 用户显式 `--no-ua` → 强制 standalone

### 中文提示模板

```text
检测到 Understand-Anything 知识图谱:
  路径: ${path}
  扫描 commit: ${ua_commit}(${ua_date})
  当前 commit: ${current_commit}
  代码差异: ${changed_files_count} 个文件
状态: ${FRESH | POSSIBLY_STALE | STALE}

将使用 UA 图谱加速 arch-analyze,跳过全仓重扫;LLM 只补语义层(business capabilities / NFR / 风险解释)。
```

---

## 2. UA 知识图谱结构速记

参考 UA 的 `understand-onboard` skill 公开文档,JSON 顶层结构:

```yaml
project:
  name:
  description:
  languages: [string]
  frameworks: [string]
  analyzedAt:
  gitCommitHash:

nodes:
  - id:           # 形如 "file:src/api.ts" / "function:src/api.ts:handler" / "config:vite.config.ts"
    type:         # see "节点类型映射" 表
    name:
    filePath:     # 可选
    summary:      # UA 已让 LLM 生成的一句话
    tags: []
    complexity:   # 数字
    languageNotes: # 可选

edges:
  - source:       # node id
    target:       # node id
    type:         # see "边类型映射" 表
    direction:
    weight:

layers:           # UA 推断的架构层
  - id:
    name:
    description:
    nodeIds: []

tour:             # UA 生成的引导路径
  - order:
    title:
    description:
    nodeIds: []
```

---

## 3. 节点类型映射(UA → 我们 specs)

UA 把节点分 3 大类。每类的处理规则:

### A. 代码层节点(file / function / class / module / concept)

| UA type | 我们 specs 落点 | 规则 |
|---|---|---|
| `file` (complexity ≥ 平均值) | `baseline.yaml#components` 候选 | 同目录多个高复杂度 file 聚类为 1 component;LLM 给 component 命名 |
| `file` (complexity 低) | 不直接进 baseline,作为 component 的 entrypoints |
| `function` | 不直接落,作为 critical_flows 的 step 候选 |
| `class` (实体类) | `baseline.yaml#data_models` 候选 |
| `class` (服务类) | `baseline.yaml#components` 候选 |
| `module` | `baseline.yaml#components`(kind=library) |
| `concept` | `baseline.yaml#capabilities` 候选(**LLM 必须 review**;UA 的 concept 是技术概念,我们的 capability 是业务能力,概念有重叠但不等价) |

判定"class 是实体还是服务":看 tags / summary。tags 含 `model` / `entity` / `dto` / `schema` → 实体;含 `service` / `controller` / `handler` → 服务。

### B. 非代码节点(config / document / service / table / endpoint / pipeline / schema / resource)

| UA type | 我们 specs 落点 | 规则 |
|---|---|---|
| `service` | `baseline.yaml#components`(kind=service) | 直接转 |
| `endpoint` | `baseline.yaml#interfaces.apis` | 一对一映射;URL/method 从 name 解析 |
| `pipeline` | `baseline.yaml#deployment_units` | 同时检查是否含 CI/CD 关键字 |
| `table` / `schema` | `baseline.yaml#data_models` | 高优;补充字段信息(若有 tags) |
| `config` | `baseline.yaml#runtime_configs` | 过滤掉纯 lock/devDeps 类 |
| `document` | 不直接落 baseline;若是 README/CHANGELOG 用作 narrative 来源 |
| `resource` | `baseline.yaml#external_dependencies` 候选 |

### C. 知识层节点(domain / flow / step / article / entity / topic / claim / source)

| UA type | 我们 specs 落点 | 规则 |
|---|---|---|
| `domain` | `baseline.yaml#capabilities` **强候选**(domain 通常对应业务能力 + category) | LLM 仍需 review 把"系统/技术域"和"业务域"区分 |
| `flow` | `baseline.yaml#critical_flows` | 一对一映射;name → flow.id;containing edges → steps |
| `step` | `baseline.yaml#critical_flows.steps` | 作为 flow 内的步骤 |
| `entity` | `baseline.yaml#data_models` 候选 | 与 class+entity 合并去重 |
| `article` / `topic` / `claim` / `source` | `decisions.yaml#key_assumptions` 或 `traceability.yaml#evidence_index` | 这些是 UA 抓的非结构化知识;若与某 ADR 关联可补 evidence_refs |

---

## 4. 边类型映射(UA edges → 我们 specs 关系)

| UA edge type | 我们对应 | 用法 |
|---|---|---|
| `imports` | dependency graph(衍生层) | 高扇出节点 → risk_signals.shared_module |
| `depends_on` | dependency graph | 同上;跨组件依赖 → component 关系 |
| `contains` | component containment | parent component 的 entrypoints / 子模块归属 |
| `calls` | `critical_flows` 候选 hop | 串接 calls 链路;长链路(≥5 hop)→ risk_signals.chatty_chain |
| `configures` | `runtime_configs` ↔ component 关联 | 落 traceability link |
| `documents` | `traceability.yaml#evidence_index` | 文档节点指向 spec 字段时,生成 evidence_refs |
| `deploys` | `deployment_units` ↔ component | 部署单元承载哪些 component |
| `triggers` | event / saga 候选 | 跨服务异步链路 |
| `contains_flow` | `critical_flows` 容器关系 | flow 内 step 归属 |
| `flow_step` | `critical_flows.steps[].calls` | step 的下一跳 |
| `related` / `cites` | `traceability.yaml#links` | 跨 spec/CR/ADR 关联 |

---

## 5. layers 映射

UA 的 `layers[]` 是"逻辑架构层"(eg. Presentation / Domain / Infrastructure / Data)。

落点:**作为 `baseline.yaml#components[].group` 的来源**(我们 baseline 当前是平铺 components 列表,引入 `group` 子字段表示逻辑层归属)。

```yaml
# baseline.yaml#components[]
- name: "api-gateway"
  kind: service
  group: "Presentation"   # 来自 UA layer.name
  ...
```

若我们 baseline schema 当前不含 `group` 字段,先加到 `known_unknowns` 留痕,等 schema 演进到 v1.1 时正式纳入。

---

## 6. tour 映射(杀手锏移植)

UA 的 `tour[]` 是它的杀手锏:**"按这个顺序读 N 个节点理解项目"**。

落点:`generated/wiki/00-阅读指引.md`,模板:

```markdown
# 00 - 阅读指引

> 如果你是新接手这个项目,按本指引顺序读,30 分钟可建立稳定心智模型。
> 来源:由 Understand-Anything 知识图谱的 `tour[]` 生成,基于 PageRank + 重要性排序。

## 推荐阅读顺序

### 第 {order}. {title}

{description}

涉及节点 / 文件:
- [{node.name}]({node.filePath}) — {node.summary}

---
```

每条 tour 一段;顺序按 `order` 字段;每节点链接到具体 filePath;summary 直接抄 UA 的(它已让 LLM 写好)。

加这页后,我们 onboarding wiki 从 6 页变 7 页(0-6),但 0 页只在 UA 集成时产,standalone mode 不产。

---

## 7. project metadata 映射

UA 的 `project` 段直接喂 baseline.yaml:

| UA field | 我们 baseline.yaml |
|---|---|
| `project.name` | `project.name` |
| `project.description` | `project.description` |
| `project.languages` | 不直接落;作为 `evidence_refs` 的 note |
| `project.frameworks` | 同上;同时补 `runtime_configs[].tags` |
| `project.analyzedAt` | `last_scanned_commit` 的辅助(主用 gitCommitHash) |
| `project.gitCommitHash` | `baseline.yaml#last_scanned_commit` |

---

## 8. LLM 还要做的语义层(不可省)

UA 不抓的事,LLM 必须补。否则 specs 残缺,acceptance 不通过。

| specs 字段 | UA 给? | LLM 补什么 |
|---|---|---|
| `baseline.yaml#capabilities[]` | 半给(concept/domain 候选) | 区分技术概念 vs 业务能力;评估 importance / maturity / gaps |
| `quality.yaml#nfrs` | ❌ 完全不给 | 从 README / docs / SLO 文件抽;无 SLO 文件时标 known_unknowns |
| `quality.yaml#org_constraints` | ❌ 完全不给 | 从 `~/.understand-arch/kb/` 读 |
| `risks.yaml#risks` | 半给(complexity 热点) | 把热点解释成"为什么是风险 + mitigation";UA 不区分 risk vs debt |
| `risks.yaml#tech_debt` | 半给 | 同上 |
| `decisions.yaml` 完整结构 | ❌ | 从 `decisions/ADR-*.md` 读;UA 的 article/claim 节点可作辅助 evidence |
| `traceability.yaml#links` | 半给(UA edges of type related/cites) | LLM 补跨 CR / ADR / release 的关联 |
| `view_coverage` (4+1) | ❌ | LLM 用我们 architecture-composition-rubric 判定 |

---

## 9. evidence_refs 处理

UA 的 nodes 自带 `filePath`(可选)。落 evidence_refs 时:

```yaml
evidence_refs:
  - file: <node.filePath>
    line: null              # UA 不提供精确行号,留 null
    commit: <ua.gitCommitHash>
    source: ua-knowledge-graph    # 标明来源,方便审计
```

LLM 若需要精确 line,用 Grep 工具补查;否则保留 null。

---

## 10. 完整流程(给 arch-analyze 主任务执行)

```text
Phase 0: 检测 UA 图谱
  → 不存在 / 损坏 → 退出本流程,回退 standalone
  → 存在且 FRESH → 进入 Phase 1
  → 存在但 POSSIBLY_STALE / STALE → 中文提示用户;用户同意继续则进入 Phase 1

Phase 1: 读图谱
  Read `.understand-anything/knowledge-graph.json`
  → 单次 Read(典型 <500K tokens,可控)
  → 大仓(>500K)用 jq / Grep 切片读取(按 nodes/edges/layers/tour 分段)

Phase 2: 节点映射(按 §3-§5 规则)
  → nodes[] 按 type 分桶
  → 每桶按映射规则落到 baseline.yaml / data_models / interfaces / capabilities 候选 / critical_flows 候选

Phase 3: 边映射(按 §4 规则)
  → edges[] 串接 critical_flows.steps
  → calls 链路长度 ≥5 hop 候选 risk_signals.chatty_chain
  → imports 高扇出节点候选 risk_signals.shared_module

Phase 4: layers + tour 映射(按 §5 §6 规则)
  → 写入 generated/wiki/00-阅读指引.md

Phase 5: LLM 补语义层(按 §8 规则)
  → baseline.yaml#capabilities[] 抽 + review concept/domain 节点
  → quality.yaml#nfrs 从 README/docs 抽
  → quality.yaml#org_constraints 从 KB 读
  → risks.yaml 把 complexity 热点解释为 risk
  → decisions.yaml + traceability.yaml LLM 补

Phase 6: schema validate
  → 每份 specs/*.yaml 跑对应 schema
  → 失败的字段 LLM 补齐;3 次失败标 known_unknowns

Phase 7: 落盘 + 埋点
  → specs/* + generated/wiki/00-阅读指引.md
  → .metrics.jsonl 写:
    {
      "skill": "arch-analyze",
      "mode": "ua-augmented",
      "ua_graph_path": "...",
      "ua_commit": "...",
      "ua_freshness": "FRESH|POSSIBLY_STALE|STALE",
      "nodes_consumed": N,
      "edges_consumed": M,
      "llm_token_estimate": K
    }
```

---

## 11. 与 subagent 编排的关系

ua-augmented mode **不需要**多 agent 切片(`subagent-orchestration.md`)— UA 已经在 LLM 视角完成了切片 + 摘要,我们读 JSON 直接拿到结构化事实,主上下文 token 足够。

**例外**:UA 图谱超大(eg. 大型 monorepo > 5000 nodes)时主上下文吃不下,本流程切换到混合模式:
- 用 jq 把 nodes 按 layer 分片读
- 每片走子任务做映射
- 子任务返回 yaml 摘要给主上下文聚合

这是边缘场景,v1.0 默认走单 agent 路径。

---

## 12. 失败降级

| 失败模式 | 行为 |
|---|---|
| UA JSON schema 不通过 | 报错 + 回退 standalone;在 known_unknowns 留痕"UA 图谱损坏" |
| UA 图谱过期(STALE)用户拒绝重跑 | 仍用旧图,但全部 evidence_refs 加 `freshness: stale`;baseline.yaml.freshness_status=stale |
| LLM 语义层 retry 3 次仍不过 | 把失败字段降级到 known_unknowns,继续完成其他字段;最终验收时 semantic_checks 标 degraded |
| UA 节点引用的文件已不存在(代码删了) | 评估该节点是否仍有效:若是历史 component 已删,落 risks.yaml#tech_debt(ghost component)|

---

## 13. Acceptance 影响

ua-augmented mode 跑完后,onboard acceptance 的 structural_checks 不变(specs 6 个文件 + generated/overview.md 仍要在)。semantic_checks 新增 1 项:

```yaml
- id: ua-integration-trace
  question: "ua-augmented mode 下,specs 是否带 ua 来源标记?"
  severity: required
  rubric:
    - baseline.yaml#last_scanned_commit 与 UA gitCommitHash 一致(或显式标 stale)
    - evidence_refs 含 source: ua-knowledge-graph 标记
    - .metrics.jsonl 含 ua_augmented 段
```

standalone mode 不触发本检查。

---

## 14. 与 baseline.yaml#capabilities[] 抽取的接力

ua-augmented mode 给 capabilities 提供了**比 standalone 更准的初始信号**:

```text
Standalone 抽 capabilities:
  LLM 从 README + 业务目录命名 + 路由 + ADR 推断 → 误漏率较高

ua-augmented 抽 capabilities:
  起点 = UA 的 domain + concept 节点(已是 LLM 抽过的语义节点)
  LLM 在此基础上 review:
    - 区分"技术域"(eg. caching layer) vs "业务能力"(eg. 订阅计费)
    - 评估 importance / maturity(参考 UA 的 complexity 信号)
    - 关联 gaps(UA 不抓,LLM 从 risks.yaml 关联)
  误漏率显著降低
```

这是 ua-augmented mode 真正的杀手锏之一:**业务能力地图的初始抽取质量大幅提升**。

---

## 15. 参考

- [Understand-Anything](https://github.com/Lum1104/Understand-Anything)(31K stars, MIT, 同为 Claude Code plugin)
- UA 的 `understand-onboard` skill 提供了 graph JSON 结构的公开文档
- 我们的 `scanner-playbook.md` / `subagent-orchestration.md` 在 standalone mode 仍是主路径
- `internal/schemas/specs-baseline.schema.json`:UA 字段映射的落点
- `internal/schemas/specs-capabilities.schema.json`:capabilities 抽取目标
