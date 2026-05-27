---
name: arch-wiki
description: |
  从 v2.0 graph、ADR、CR 与 rules 生成 `.understand-arch/{project}/wiki/` 14 页人类视图。
  支持 newcomer、cto、pm、architect 受众化,但不创造新事实。
---

# arch-wiki

## 定位

`arch-wiki` 是人类视图渲染器。graph 是唯一事实源;wiki 中任何断言必须能回链 graph node id、ADR/CR 路径或 rules path。

## 输出

- `wiki/README.md`
- `wiki/01-overview.md`
- `wiki/02-components.md`
- `wiki/03-interfaces.md`
- `wiki/04-data-models.md`
- `wiki/05-capabilities.md`
- `wiki/06-quality.md`
- `wiki/07-risks-and-debt.md`
- `wiki/08-deployments.md`
- `wiki/09-flows-and-scenarios.md`
- `wiki/10-decisions.md`
- `wiki/11-changes.md`
- `wiki/12-rules.md`
- `wiki/13-pending-changes.md`
- `wiki/14-diagrams.md`

## 规则

- 首次生成与 `--audience=cto|architect` 必须运行 `wiki-review.js --mode full`。
- 日常刷新必须运行 `wiki-review.js --mode lite`。
- 不设置单页字数上限,以讲清楚为准。
- `14-diagrams.md` 在 v2.0 只放 4+1 视图占位与 Mermaid 文本,图片生成留给 v2.1。

## Engine 调用

确定性渲染入口:

```text
node engine/bin/render-wiki.js --workspace .understand-arch/{project}
```

该入口只读取 graph、rules、ADR、CR 索引并写 `wiki/**`。它不创造新事实;LLM 受众化润色必须保留 graph node id、rules path、ADR/CR path。

确定性审核入口:

```text
node engine/bin/wiki-review.js --workspace .understand-arch/{project} --mode lite
node engine/bin/wiki-review.js --workspace .understand-arch/{project} --mode full
```

`wiki-review.js` 检查 README+14 页、graph node id 回链、`03-interfaces.md` 已知局限;full 模式额外检查 rules 摘要与 `14-diagrams.md` Mermaid 占位。

## 写权限

允许写 `wiki/**`、`wiki/.cache.json`、`state.yaml` 与 `.metrics.jsonl`;禁止写 specs、decisions、change-requests、rules。
