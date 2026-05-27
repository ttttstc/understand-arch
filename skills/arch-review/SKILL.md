---
name: arch-review
description: |
  内部评审入口。调度 arch-graph-reviewer 或 arch-senior-reviewer,检查 graph、wiki、CR 的结构与语义质量。
---

# arch-review

## 模式

- `graph-phase-{1|3|4|5|6|7|8}`:使用对应 `internal/rubrics/graph-*.yaml`。
- `design`:使用 `senior-design-review.yaml`,只向 CR.md 第 14 段追加评审。
- `wiki-full`:完整审查 14 页 wiki。
- `wiki-lite`:轻量审查变更页。
- `audit`:输出临时审计报告。

## Refiner Loop

失败后最多 retry 2 次。第三次给用户中文 4 选项:继续 retry、人工修、override、abort。override 必须写 `state.yaml.overrides[]`,reason 不少于 20 字符。

## 写权限

允许追加 `CR.md` 第 14 段 Review 或写 `audit-{date}.md`;禁止写 specs、wiki、decisions、engine。

## CR Review 写入

向 CR.md 写评审结论时只能使用:

```text
node engine/bin/cr-md-editor.js append-review --file change-requests/CR-*/CR.md --content-file review.md
```

不得直接改写 CR.md 其它段落。
