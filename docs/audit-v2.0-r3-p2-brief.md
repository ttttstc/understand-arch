# R3 P2 修复 Brief(给 codex /goal)

> 基线:commit `55b41b4`(audit R3 报告)
> 8 项 P2,完成后 v2.0 全字段完整闭合,可投产。
> 修复完成后跑全套 e2e + smoke,推到 `feat/v2.0-spec`。

---

## P2-N4: repo-knowledge-graph.schema 补 GraphNode v2.0 扩展字段(★ 最重要)

**问题**:`internal/schemas/repo-knowledge-graph.schema.json` 的 `$defs.node` 只声明 UA 原生 + repo_id + confidence + evidence_refs。spec §2.5 定义的 11 个 v2.0 扩展字段没显式声明。`additionalProperties: true` 允许它们存在但**不校验值合法性**。

**期望**:在 `$defs.node.properties` 加以下 11 字段(全部 optional,但带 enum/structure 约束):

```json
"criticality": { "type": "string", "enum": ["critical", "high", "medium", "low"] },
"maturity": { "type": "string", "enum": ["experimental", "growing", "stable", "deprecated"] },
"importance": { "type": "string", "enum": ["core", "supporting", "edge"] },
"boundary": { "type": "string", "enum": ["internal", "public", "external"] },
"communication": { "type": "string", "enum": ["sync", "async", "event"] },
"data_sensitivity": { "type": "string", "enum": ["public", "internal", "pii", "secret"] },
"sla": {
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "availability": { "type": "string" },
    "latency_p99_ms": { "type": "integer", "minimum": 0 }
  }
},
"linked_adrs": { "type": "array", "items": { "type": "string", "pattern": "^ADR-[0-9]{3}$" } },
"linked_crs": { "type": "array", "items": { "type": "string", "pattern": "^CR-[0-9]{4}-[0-9]{3}$" } },
"linked_risks": { "type": "array", "items": { "type": "string" } }
```

**同时**:把 `additionalProperties` 从 `true` 改为 `false`(收紧 schema,任何未声明字段都不允许)。或保留 `true` 但在 spec 注释说明这是有意"为未来扩展开口"。

**对照 spec**:§2.5 GraphNode 完整字段列表。

---

## P2-N5: cross-repo.schema 显式定义顶层数组项结构(★ 重要)

**问题**:`internal/schemas/cross-repo.schema.json` 的 `architecture_decisions / change_requests / traceability` 用 `type: "object"` 完全不约束;`capabilities / quality_attributes / risks / technical_debt / known_unknowns` 共用 `inferred` schema 只检查 `id + confidence + evidence_refs`,缺 enum 约束。

**期望**:为每个顶层数组项加专用 `$defs`,严格按 spec §2.6-2.14 定义:

### ArchitectureDecision(spec §2.9)
```json
"architectureDecision": {
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "title", "status", "date", "context", "decision", "consequences", "affected_node_ids", "md_path", "evidence_refs"],
  "properties": {
    "id": { "type": "string", "pattern": "^ADR-[0-9]{3}$" },
    "title": { "type": "string", "minLength": 1 },
    "status": { "type": "string", "enum": ["proposed", "accepted", "deprecated", "superseded"] },
    "date": { "type": "string" },
    "context": { "type": "string" },
    "decision": { "type": "string" },
    "consequences": { "type": "string" },
    "superseded_by": { "type": "string", "pattern": "^ADR-[0-9]{3}$" },
    "supersedes": { "type": "array", "items": { "type": "string", "pattern": "^ADR-[0-9]{3}$" } },
    "affected_node_ids": { "type": "array", "items": { "type": "string", "pattern": "^[a-z][a-z0-9-]*::" } },
    "md_path": { "type": "string" },
    "evidence_refs": { "type": "array", "items": { "$ref": "#/$defs/evidenceRef" } }
  }
}
```

### ChangeRequestRef(spec §2.10)
```json
"changeRequestRef": {
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "title", "status", "date", "impact_node_ids", "introduced_adrs", "dir_path"],
  "properties": {
    "id": { "type": "string", "pattern": "^CR-[0-9]{4}-[0-9]{3}$" },
    "title": { "type": "string" },
    "status": { "type": "string", "enum": ["draft", "in_review", "ready", "merged", "rolled_back"] },
    "date": { "type": "string" },
    "impact_node_ids": { "type": "array", "items": { "type": "string", "pattern": "^[a-z][a-z0-9-]*::" } },
    "introduced_adrs": { "type": "array", "items": { "type": "string", "pattern": "^ADR-[0-9]{3}$" } },
    "dir_path": { "type": "string" }
  }
}
```

### QualityAttribute(spec §2.11)
```json
"qualityAttribute": {
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "category", "statement", "target", "measurement", "applies_to_node_ids", "status", "evidence_refs", "confidence"],
  "properties": {
    "id": { "type": "string" },
    "category": { "type": "string", "enum": ["performance", "availability", "security", "scalability", "maintainability", "observability", "compliance", "cost"] },
    "statement": { "type": "string" },
    "target": { "type": "string" },
    "measurement": { "type": "string" },
    "applies_to_node_ids": { "type": "array", "items": { "type": "string" } },
    "status": { "type": "string", "enum": ["met", "at_risk", "violated", "unknown"] },
    "evidence_refs": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/evidenceRef" } },
    "confidence": { "type": "string", "enum": ["high", "medium", "low"] }
  }
}
```

### Risk(spec §2.12)
```json
"risk": {
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "title", "category", "likelihood", "impact", "severity", "affected_node_ids", "status", "evidence_refs", "confidence"],
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "category": { "type": "string", "enum": ["technical", "operational", "security", "compliance", "organizational"] },
    "likelihood": { "type": "string", "enum": ["low", "medium", "high"] },
    "impact": { "type": "string", "enum": ["low", "medium", "high"] },
    "severity": { "type": "string", "enum": ["low", "medium", "high", "critical"] },
    "affected_node_ids": { "type": "array", "items": { "type": "string" } },
    "mitigation": { "type": "string" },
    "status": { "type": "string", "enum": ["open", "mitigated", "accepted", "transferred"] },
    "evidence_refs": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/evidenceRef" } },
    "confidence": { "type": "string", "enum": ["high", "medium", "low"] }
  }
}
```

### TechnicalDebt(spec §2.13)
```json
"technicalDebt": {
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "title", "category", "affected_node_ids", "status", "evidence_refs", "confidence"],
  "properties": {
    "id": { "type": "string" },
    "title": { "type": "string" },
    "category": { "type": "string", "enum": ["code", "architecture", "infra", "test", "docs"] },
    "affected_node_ids": { "type": "array", "items": { "type": "string" } },
    "cost_estimate": { "type": "string" },
    "business_impact": { "type": "string" },
    "introduced_in": { "type": "string", "pattern": "^CR-" },
    "status": { "type": "string", "enum": ["acknowledged", "scheduled", "in_progress", "resolved"] },
    "evidence_refs": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/evidenceRef" } },
    "confidence": { "type": "string", "enum": ["high", "medium", "low"] }
  }
}
```

### CapabilityCrossRepo(spec §2.8)
```json
"capability": {
  "type": "object",
  "additionalProperties": false,
  "required": ["id", "name", "description", "supporting_node_ids", "maturity", "importance", "gaps", "evidence_refs", "confidence"],
  "properties": {
    "id": { "type": "string" },
    "name": { "type": "string" },
    "description": { "type": "string" },
    "supporting_node_ids": { "type": "array", "items": { "type": "string", "pattern": "^[a-z][a-z0-9-]*::" } },
    "maturity": { "type": "string", "enum": ["experimental", "growing", "stable", "deprecated"] },
    "importance": { "type": "string", "enum": ["core", "supporting", "edge"] },
    "gaps": { "type": "array", "items": { "type": "string" } },
    "evidence_refs": { "type": "array", "items": { "$ref": "#/$defs/evidenceRef" } },
    "confidence": { "type": "string", "enum": ["high", "medium", "low"] }
  }
}
```

### TraceabilityLink(spec §2.14) 和 KnownUnknown(spec §2.15)
按 spec 定义类似添加。

**然后**:把 `properties` 各数组的 `items` 引用对应 $def(`$ref`)。

---

## P2-N6: graph-phase-6 rubric 扩到 5 维度(spec §11.3 quality)

**问题**:`internal/rubrics/graph-phase-6-quality.yaml` 只有 2 个 check(inferred-confidence / inferred-evidence)。spec §11.3 描述 5 个维度。

**期望**:扩为以下 5 个 check:

```yaml
phase: 6
name: graph-phase-6-quality
checks:
  - id: nfr-coverage
    weight: high
    question: "8 类 NFR(performance/availability/security/scalability/maintainability/observability/compliance/cost)是否每类至少 1 条"
    pass: "每类至少 1 条 + 有 measurement 字段"
  - id: risk-confidence
    weight: high
    question: "每条 risk 是否带 confidence + evidence_refs"
    pass: "100%"
  - id: debt-actionability
    weight: medium
    question: "technical_debt 是否每条都能让研发知道要做什么"
    pass: "≥80% 含 cost_estimate 或 business_impact"
  - id: known-unknowns-honesty
    weight: medium
    question: "known_unknowns 是否诚实标了'我们不知道什么'"
    pass: "至少 1 条(架构师标准:任何项目都有 unknown)"
  - id: weasel-words
    weight: high
    question: "有没有'应该/通常/大概/一般'等弱化词"
    pass: "0 条"
```

---

## P2-N7: render-wiki.js 加注释说明 LLM 介入填充

**问题**:wiki 08-13 等页在 sample 中是 3 行 fallback。render-wiki.js 内部应有注释,说明这是确定性兜底,真实项目跑时 LLM 应填充。

**期望**:在 `engine/bin/render-wiki.js` 内对应渲染函数加注释,并在 fallback 文本里加一行:

```markdown
> 注:当前为确定性兜底渲染。当 graph 有对应类型节点(deployments/flows/decisions/changes 等),应由 LLM 受众化润色填充。
```

确保 wiki-review.js 不把这种 fallback 误判为 missing。

---

## P2-N8: 版本号升 2.0.0-rc1

**问题**:`package.json` 和 `.claude-plugin/marketplace.json` + `plugin.json` 仍是 `2.0.0-skeleton`。R3 验收已完成,可升级。

**期望**:全部改为 `"2.0.0-rc1"`(release candidate),或者直接 `"2.0.0"`。建议 `rc1`(留 dogfood 反馈空间)。

需要改 3 个文件:
- `package.json`
- `.claude-plugin/marketplace.json#metadata.version`
- `.claude-plugin/plugin.json#version`

---

## P2-F12 残留: 补 onboard / wiki references

**问题**:`skills/arch-onboard/` 和 `skills/arch-wiki/` 没有 `references/` 目录。

**期望**:

### `skills/arch-onboard/references/onboarding-flow.md`
内容:
- 多仓发现与确认流程(扫 .git/、引导用户、写 repos.yaml)
- rules/ 初始化策略(从 templates/ 复制,不覆盖已存在)
- 首次扫描后用户应该看什么(wiki/01-overview.md 入口)
- 中文交互模板

### `skills/arch-wiki/references/audience-guide.md`
内容:
- 4 个 audience(cto / newcomer / pm / architect)各自的渲染重点
- 每页对不同 audience 的强调点
- 受众化 mode 切换协议(参数 + state.yaml 记录)
- LLM 渲染 prompt 模板

---

## 修复完成后验证

```bash
# 1. schema 校验
node engine/bin/validate-v2-structure.js
node engine/bin/smoke-v2-tools.js

# 2. 端到端跑通
node engine/bin/scanner.js --workspace samples/.understand-arch/sample
node engine/bin/cr-md-editor.js validate --file samples/.understand-arch/sample/change-requests/CR-2026-999-sample/CR.md
node engine/bin/senior-review.js --mode design --cr samples/.understand-arch/sample/change-requests/CR-2026-999-sample/CR.md
node engine/bin/wiki-review.js --workspace samples/.understand-arch/sample --mode lite
node engine/bin/wiki-review.js --workspace samples/.understand-arch/sample --mode full
node engine/bin/audit-workspace.js --workspace samples/.understand-arch/sample

# 3. npm run verify
npm run verify
```

**所有命令应返回 status=ok 或 verdict=pass**。

任一失败 = 修复未完成。

---

## 严禁

- 自行修改 spec
- 改变 v2.0 核心决策(skill 数 / subagent 数 / Phase 编号 / 14 段标题等)
- 删除现有可工作的能力
- 让 audit-workspace / senior-review / wiki-review 任何一个验收倒退

---

## 修复完成后

commit 推到 `feat/v2.0-spec`,我做最终 R4 验收(预期 v2.0 全字段闭合,直接 merge PR #9)。
