# `_template/` — Workspace Skeleton

当前活跃 user-facing skill(arch-onboard/design/audit/brief) 首次为某个项目建立工作区时，会把本目录复制到 `arch/{project}/`。

**不要直接对 `_template/` 运行 skill。**

## 模板目标

模板只提供稳定目录和少量占位文件，不预填“看起来完整”的伪内容。

它必须对齐以下新主线:

- `specs/` 是稳定事实源
- `change-requests/` 记录单次变更
- `decisions/` 是 append-only ADR
- `generated/` 是派生视图
- `state.yaml` 管 workflow 状态与 freshness 提示

其中给人看的默认结构是：

- `generated/overview.md`:1 页稳定入口(11 段固定结构,≤200 行)
- `generated/wiki/01-06`:onboarding 展开视图(6 页,含业务能力雷达)
- `generated/audit/{date}-健康度.md`:每次 audit 产的系统问题集成视图
- `generated/briefs/`:受众化摘要或汇报稿

## 什么时候需要改模板

- `internal/schemas/` 新增/删除必需文件
- 工作区目录契约发生变化
- `state.yaml` 的顶层结构调整

字段级扩展通常不需要调整模板，只要 skill 写入逻辑和 schema 同步即可。
