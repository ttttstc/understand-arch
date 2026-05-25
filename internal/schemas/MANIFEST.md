# internal/schemas/ — JSON Schemas for the v1.0 Specs/CR Model

> 所有结构化 YAML 都必须通过这里的 schema。`overview.md`、ADR、wiki、brief 不属于 JSON Schema 约束层。

## Core workspace schemas

| 文件 | 验证什么 | 主要写入方 |
|---|---|---|
| `state.schema.json` | `arch/{project}/state.yaml` | `arch-workflow` |
| `specs-baseline.schema.json` | `arch/{project}/specs/baseline.yaml` | `arch-analyze` |
| `specs-quality.schema.json` | `arch/{project}/specs/quality.yaml` | `arch-analyze` + `arch-frame` |
| `specs-risks.schema.json` | `arch/{project}/specs/risks.yaml` | `arch-analyze` |
| `specs-decisions.schema.json` | `arch/{project}/specs/decisions.yaml` | `arch-adr` + `arch-options` |
| `specs-traceability.schema.json` | `arch/{project}/specs/traceability.yaml` | `arch-workflow` + writeback |

## Change request schemas

| 文件 | 验证什么 | 主要写入方 |
|---|---|---|
| `cr-impact.schema.json` | `arch/{project}/change-requests/CR-*/impact.yaml` | `arch-diff-judge` |
| `cr-review.schema.json` | `arch/{project}/change-requests/CR-*/review.yaml` | `arch-review` |
| `cr-traceability.schema.json` | `arch/{project}/change-requests/CR-*/traceability.yaml` | `arch-workflow` + writeback |

## Org-scoped schemas

| 文件 | 验证什么 | 加载方 |
|---|---|---|
| `banned-patterns.schema.json` | `~/.understand-arch/kb/banned-patterns.yaml` | `arch-frame` |
| `compliance-redlines.schema.json` | `~/.understand-arch/kb/compliance-redlines.yaml` | `arch-frame` |
| `network-boundaries.schema.json` | `~/.understand-arch/kb/network-boundaries.yaml` | `arch-frame` |
| `naming-conventions.schema.json` | `~/.understand-arch/kb/naming-conventions.yaml` | `arch-frame` |
| `tech-radar.schema.json` | `~/.understand-arch/kb/tech-radar.yaml` | `arch-frame` |

## 关键约束

- 所有 `specs/*.yaml`、`change-requests/*/*.yaml`、`state.yaml` 都必须有顶层 `evidence_refs`，除非该文件只记录 workflow 状态且没有架构断言。
- `specs/baseline.yaml` 必须包含 4+1 视图覆盖状态与 freshness 相关字段。
- `cr-impact.yaml` 必须显式覆盖:
  - 影响面
  - 模块依赖变化
  - 数据模型变化
  - 回滚策略
- `cr-review.yaml` 必须显式输出 `readiness` 与 findings。
- `specs/traceability.yaml` 与 `CR/traceability.yaml` 都必须支持 writeback 追溯。

## 命名与迁移说明

- 旧的 `项目总览.schema.json`、`仓库与组件清单.schema.json`、`依赖与链路图谱.schema.json`、`风险与技术债台账.schema.json`、`决策与证据索引.schema.json`、`影响面.schema.json` 已被新的 specs/CR schema 集合取代。
- 旧 schema 若仍被引用，视为实现未迁移完成，应继续清理。
