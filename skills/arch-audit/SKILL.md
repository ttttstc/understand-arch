---
name: arch-audit
description: |
  审视 v2.0 graph 与 wiki 是否仍可信。默认做 freshness 与完整性检查;用户选择后才运行重型 drift audit。
---

# arch-audit

## 定位

`arch-audit` 回答“当前架构基线还能不能支撑判断”。默认不重扫全仓,只检查 fingerprint、schema、traceability、wiki 与 graph 一致性。

## 模式

- 默认:运行 `audit-workspace.js`,检查 repos.yaml、每仓 fingerprint、repo graph、state overrides。
- wiki 完整性:运行 `wiki-review.js --mode lite`;需要发布或架构评审时运行 `--mode full`。
- `--drift`:调度 `arch-analyze --mode=drift-audit`,对比代码事实与 graph。
- `--repair-suggestion`:只给修复建议,不改事实层。

## Subagent Dispatch 模板

### fingerprint-check

Dispatch a subagent using the `arch-analyze` skill.

```text
Mode: fingerprint-check
Workspace: .understand-arch/{project}
Read specs/repos.yaml and specs/repos/*/.fingerprint.json.
Do not rewrite knowledge-graph.json.
Return freshness status per repo.
```

### drift detail

Dispatch a subagent using the `arch-graph-reviewer` agent definition only when the user selects "查看漂移详情".

```text
Mode: phase-7-final or drift detail
Inputs: current graph, fingerprint diff, changed files, state overrides.
Return degraded/stale findings and retry_hints.
Do not write graph/wiki/CR/ADR.
```

### override

```text
If user chooses override, call state-editor.js override.
Reason must be at least 20 characters.
Set state.status=degraded.
Show override history in the audit report.
```

## Engine 调用

```text
node engine/bin/audit-workspace.js --workspace .understand-arch/{project} --allow-non-fresh
node engine/bin/wiki-review.js --workspace .understand-arch/{project} --mode lite --allow-needs-revision
```

`audit-workspace.js` 输出 `fresh`、`stale`、`unknown` 或 `degraded`;默认遇到非 fresh 退出非零,交互式 agent 可加 `--allow-non-fresh` 后向用户展示三选项。

## 用户交互

发现 stale 或 degraded 时给 3 个中文选项:

1. 刷新 graph。
2. 查看漂移详情。
3. 记录 override 后继续。

## 写权限

只允许写 `state.yaml`、`.metrics.jsonl`、临时 `audit-{date}.md`;禁止写 graph、wiki、decisions、change-requests。
