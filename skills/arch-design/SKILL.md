---
name: arch-design
description: |
  面向高级架构师的方案设计入口。基于 PRD 或变更诉求创建 v2.0 单文件 CR.md,
  输出影响面、改动点、方案、风险、发布回滚与评审,并维护 cross-repo traceability。
---

# arch-design

## 定位

`arch-design` 是 v2.0 一等入口。产物是 `change-requests/CR-YYYY-NNN-{slug}/CR.md`:YAML frontmatter + 14 段 RFC 风格正文。它面向可执行研发方案,不是科普说明。

## 工作流

1. 调度 `arch-frame`:校验 PRD 清晰度,创建 CR 目录与 CR.md 初稿。
2. 检查 graph freshness。`stale` 默认阻塞,用户 override 时必须写入 `state.yaml.overrides[]`。
3. 调度 `arch-impact-analyzer`:基于 graph 找影响 node、跨仓 edge、rules 命中与未知项,只写 frontmatter#impact + 第 8 段。
4. 调度 `arch-solution-designer`:生成第 1-7 段与第 9-13 段方案正文。
5. 按需要调度 `arch-adr`:仅 durable architecture decision 才写 ADR。
6. 调度 `arch-review`:用 `arch-senior-reviewer --mode=design` 做终审。
7. 只向 `cross-repo.json#change_requests[]` 与 `traceability[]` 追加引用。

## CR.md 14 段

1. 背景与目标
2. 现状分析
3. 方案概述
4. 详细设计
5. 替代方案对比
6. NFR 影响
7. 风险与缓解
8. 改动清单
9. 实施步骤 + 灰度策略
10. 回滚预案
11. 测试策略
12. 待定问题(known_unknowns)
13. 关联
14. Review(arch-review 写入,append-only)

第 4 段必须保留 4.1 数据模型变化、4.2 接口变化、4.3 组件变化、4.4 部署变化、4.5 关键流程时序。

## Subagent Dispatch 模板

### arch-frame

Dispatch a subagent using the `arch-frame` skill/agent definition.

```text
Read the PRD or requirement text.
Run the PM hard gate.
Create change-requests/CR-YYYY-NNN-{slug}/CR.md using cr-md-editor.js create.
Write only frontmatter initialization and section 1.
Do not write sections 2-14.
```

### arch-impact-analyzer

Dispatch a subagent using the `arch-impact-analyzer` agent definition.

Append the following additional context:

```text
Workspace: .understand-arch/{project}
CR file: change-requests/CR-YYYY-NNN-{slug}/CR.md
Requirement: {requirement}
Repo graphs: specs/repos/*/knowledge-graph.json
Cross repo graph: specs/cross-repo.json
Rules summary: rules/*.md
```

Pass these parameters:

```text
Analyze impact and write only frontmatter#impact plus section 8 改动清单.
Use engine/bin/cr-md-editor.js update-frontmatter and set-section.
Actor must be arch-impact-analyzer.
Return impact_node_ids, rules_findings, known_unknowns and retry_hints.
```

### arch-solution-designer

Dispatch a subagent using the `arch-solution-designer` agent definition.

```text
Read CR.md after impact analysis.
Write sections 1-7 and 9-13 only.
Preserve section 8 and section 14.
Use graph node ids and rules paths for traceability.
Use cr-md-editor.js set-section --actor arch-solution-designer.
```

### arch-senior-reviewer

Dispatch a subagent using the `arch-senior-reviewer` agent definition.

```text
Mode: design
Input: CR.md, graph freshness report, rules findings, senior-design-review rubric.
Return JSON verdict, overall_score, findings, blocking and retry_hints.
If needs_revision, feed retry_hints back to arch-solution-designer or arch-impact-analyzer.
```

## 写权限

见 `internal/tool-contracts/write-scope.yaml#skills.arch-design`。禁止写 wiki、rules、specs/repos/** 与业务代码。

## CR.md 编辑器

所有 CR.md 写入必须通过:

```text
node engine/bin/cr-md-editor.js create --file change-requests/CR-*/CR.md ...
node engine/bin/cr-md-editor.js set-section --actor arch-frame|arch-impact-analyzer|arch-solution-designer|arch-design --section N --content-file section.md
node engine/bin/cr-md-editor.js update-frontmatter --actor arch-impact-analyzer --json '{"impact":{"added_nodes":[],"modified_nodes":[],"removed_nodes":[],"estimated_files_changed":0}}'
node engine/bin/cr-md-editor.js append-review --file change-requests/CR-*/CR.md --content-file review.md
node engine/bin/cr-md-editor.js validate --file change-requests/CR-*/CR.md
```

编辑器执行段级写权限: `arch-review` 只能追加第 14 段,`arch-frame` 只能初始化第 1 段。

## Impact / Review 工具

影响面、rules 命中和 traceability 写回使用:

```text
node engine/bin/impact-analyzer.js --workspace .understand-arch/{project} --text "需求文本" --cr change-requests/CR-*/CR.md --cr-id CR-YYYY-NNN --output impact.json
```

该工具会:

- 从 graph 匹配 `impact_node_ids`。
- 扫描 `rules/*.md` 并输出 `rules_findings`。
- 写 CR.md frontmatter#impact 与第 8 段。
- 向 `cross-repo.json#change_requests[]` 与 `traceability[]` 写入引用。

设计终审使用:

```text
node engine/bin/senior-review.js --mode design --cr change-requests/CR-*/CR.md
```

## References

- `references/impact-analysis.md`:requirement-to-graph matching, CR.md section 8 writes and traceability rules.
