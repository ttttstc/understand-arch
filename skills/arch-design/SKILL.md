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
3. 调度 `arch-impact-analyzer`:基于 graph 找影响 node、跨仓 edge、风险、未知项。
4. 调度 `arch-solution-designer`:生成 14 段方案正文。
5. 按需要调度 `arch-adr`:仅 durable architecture decision 才写 ADR。
6. 调度 `arch-review`:用 `arch-senior-reviewer --mode=design` 做终审。
7. 只向 `cross-repo.json#change_requests[]` 与 `traceability[]` 追加引用。

## CR.md 14 段

1. 背景与目标
2. 当前架构事实
3. 需求解读与验收标准
4. 影响面总览
5. 仓库与组件改动点
6. 接口与事件契约
7. 数据模型与迁移策略
8. 运行时、部署与配置
9. 方案设计
10. 备选方案与取舍
11. 风险、技术债与缓解
12. 发布、回滚与观测
13. 任务拆解与验收计划
14. Review

## 写权限

见 `internal/tool-contracts/write-scope.yaml#skills.arch-design`。禁止写 wiki、rules、specs/repos/** 与业务代码。

## CR.md 编辑器

所有 CR.md 写入必须通过:

```text
node engine/bin/cr-md-editor.js create --file change-requests/CR-*/CR.md ...
node engine/bin/cr-md-editor.js set-section --actor arch-frame|arch-impact-analyzer|arch-solution-designer|arch-design --section N --content-file section.md
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
- 写 CR.md 第 4/5/11 段。
- 向 `cross-repo.json#change_requests[]` 与 `traceability[]` 写入引用。

设计终审使用:

```text
node engine/bin/senior-review.js --mode design --cr change-requests/CR-*/CR.md
```
