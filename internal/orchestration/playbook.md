# v2.0 Orchestration Playbook

## 核心原则

- 用户项目根目录只新增 `.understand-arch/`。
- `.understand-arch/{project}/specs/repos.yaml` 是仓库注册表。
- 分仓 `knowledge-graph.json` 与跨仓 `cross-repo.json` 是唯一事实源。
- wiki、CR、ADR 都不能创造与 graph 矛盾的新事实。
- 用户可见提示使用中文。

## User-facing Skills

- `arch-onboard`:初始化或刷新 workspace。
- `arch-design`:创建单文件 CR.md 方案设计。
- `arch-audit`:审视 graph/wiki/freshness 可信度。
- `arch-wiki`:渲染 14 页 wiki。
- `arch-diagram`:v2.0 占位。

## Internal Skills

- `arch-analyze`:写 specs/repos/** 与 specs/cross-repo.json。
- `arch-frame`:初始化 CR.md。
- `arch-adr`:写 append-only ADR 与 cross-repo 决策索引。
- `arch-review`:执行 graph、design、wiki、audit reviewer。

## State

当前 user-facing skill 是 `state.yaml` 的单 writer。内部 skill 返回 state_delta,由入口 skill 合并。`history` 与 `overrides` append-only。

确定性辅助入口:

```text
node engine/bin/state-editor.js init --workspace .understand-arch/{project}
node engine/bin/state-editor.js history --workspace .understand-arch/{project} --skill arch-design --action created --status ok
node engine/bin/state-editor.js override --workspace .understand-arch/{project} --scope design --reason "至少 20 个字符的中文原因"
```

Override 必须包含:

```yaml
ts: "ISO-8601"
scope: "design|wiki|graph|audit"
reason: "至少 20 个字符的中文原因"
by: "user|architect"
```

## Refiner Loop

Layer 2 或 Layer 3 验收失败后:

1. 带 findings retry。
2. 第二次仍失败再 retry。
3. 第三次给用户 4 个中文选项:继续 retry、人工修、override、abort。

## Write Scope

所有写入必须先对照 `internal/tool-contracts/write-scope.yaml`。全局禁止写业务代码、IaC、CI、DDL、OpenAPI 与 migrations。
