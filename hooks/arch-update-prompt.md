# Architecture Freshness Prompt

你是 understand-arch v2.0 的架构基线增量更新提示。
只有 hook 已启用且检测到架构敏感变化时才执行本指引。
你的目标是用最小事实更新保持 graph/wiki/CR 判断可信,不是自动做全量重构。

## 前置闸门

1. hooks 默认关闭。只有 `.understand-arch/*/state.yaml#hooks_enabled == true` 时才允许继续。
2. 找不到 `.understand-arch/{project}/specs/repos.yaml` 时停止,输出中文提示。
3. 找不到 `.understand-arch/{project}/specs/cross-repo.json` 时停止,提示先运行 `/arch-onboard`。
4. 不要修改用户源码、不要写 CR、不要写 ADR、不要改 spec。
5. 所有新增事实必须走 `arch-analyze` 或 engine bin,不要用 hook 直接写 graph。

## 变更分类

先读取 git diff 或最近提交的 changed files,按以下类别分类:

- 架构敏感: `package.json`、lockfile、`go.mod`、`Cargo.toml`、`pyproject.toml`、`requirements*.txt`、`pom.xml`、`build.gradle*`、`Dockerfile`、compose、K8s、Terraform、CI workflow、schema、migration、API route、RPC/proto/graphql、入口文件、模块边界目录。
- 代码事实: 普通源码文件、测试文件、配置文件。
- 文档事实: README、docs、架构说明、rules。
- 非事实: 格式化、注释、快照、临时文件。

架构敏感变更进入 fingerprint diff。
只有普通函数体或局部实现变化时,不要自动重写 graph;把相关 node 标记为 `possibly_stale` 候选并提示用户确认。

## Fingerprint Diff

1. 读取每个 repo 的 `specs/repos/{repo_id}/.fingerprint.json`。
2. 对比当前 HEAD、文件清单、manifest hash、import map hash、architecture-sensitive file hash。
3. 输出 repo 级 freshness:
   - `fresh`: fingerprint 完全一致。
   - `stale`: manifest/import/schema/infra/入口或跨仓引用变化。
   - `unknown`: fingerprint 缺失、repo 不可读、diff 无法计算。
   - `degraded`: 用户 override 或上次分析失败。
4. 如果只有普通代码文件变化,输出 `possibly_stale_nodes` 而不是直接 stale 整仓。

## 增量更新决策

- `fresh`: 不运行分析,只提示当前基线可用。
- `possibly_stale`: 提示用户选择刷新目标文件、查看影响、或记录 override。
- `stale`: 调度 `arch-analyze --mode=targeted-refresh`。
- `unknown`: 调度 `arch-audit --repair-suggestion`,不要假装 fresh。
- `degraded`: 保留 degraded,提示需要人工确认或重新 onboard。

## 调度规则

当需要更新时,按以下方式调度,不要自行写入 graph:

```text
Dispatch arch-analyze
Mode: targeted-refresh
Workspace: .understand-arch/{project}
Changed files: {changed_files}
Repos: {affected_repo_ids}
Reason: hook detected architecture-sensitive fingerprint drift
```

增量分析必须复用 v2 Phase 0-8:

1. Phase 0 Pre-flight 读取 repos.yaml/state/fingerprint。
2. Phase 1 SCAN 只扫描受影响 repo。
3. Phase 1.5 BATCH 只重建受影响 batches。
4. Phase 2 ANALYZE 只重跑受影响 batches。
5. Phase 3 ASSEMBLE 重建 repo graph。
6. Phase 4-6 只在结构/domain/quality 输入变化时重跑。
7. Phase 7 REVIEW 必须通过。
8. Phase 8 FINALIZE 更新 repo graph、fingerprint、cross-repo。

跨仓引用变化时必须重新计算 `cross_edges`。
单仓 N=1 也走同一套流程。

## 用户提示格式

发现变化时用中文输出:

```text
[understand-arch] 架构基线可能过期
- 项目: {project}
- 受影响 repo: {repo_ids}
- 变化类型: {change_categories}
- 建议动作: 运行 /arch-audit --drift 或允许 arch-analyze --mode=targeted-refresh
```

如果 hook 已能安全调度增量分析,输出:

```text
[understand-arch] 已按 v2.0 增量路径刷新架构基线
- repo graph: {updated_repo_graphs}
- cross-repo: {updated_or_unchanged}
- freshness: {freshness}
- warnings: {warnings}
```

## 禁止行为

- 不要跳过 `hooks_enabled`。
- 不要把普通函数实现变化升级成全量 stale,除非 import/API/schema/manifest/infra 改变。
- 不要直接编辑 `knowledge-graph.json`、`cross-repo.json` 或 wiki。
- 不要自行修改 CR.md 段标题、Phase 编号、schema 字段名。
- 不要在 hook 中安装依赖、访问网络、运行业务测试或改用户源码。
- 不要用占位 JSON 冒充 graph 更新。
