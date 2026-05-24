# internal/schemas/ — JSON Schemas for 5+1 YAML Assets

> 所有 schema **必需**。Skills 在输出 yaml 时**必须**通过这里的 JSON Schema 验证。

## Project-scoped(5 schemas)

| 文件 | 验证什么 yaml | 产 yaml 的 skill |
|---|---|---|
| `项目总览.schema.json` | `evidence/项目总览.yaml` | `arch-frame` |
| `仓库与组件清单.schema.json` | `evidence/仓库与组件清单.yaml` | `arch-analyze --depth=manifest` |
| `依赖与链路图谱.schema.json` | `evidence/依赖与链路图谱.yaml` | `arch-analyze --depth=manifest` |
| `风险与技术债台账.schema.json` | `evidence/风险与技术债台账.yaml` | `arch-analyze --depth=risk` |
| `决策与证据索引.schema.json` | `evidence/决策与证据索引.yaml` | `arch-adr` + `arch-options` |

## Design-mode 专属(1 schema)

| 文件 | 验证什么 yaml | 产 yaml 的 skill |
|---|---|---|
| `影响面.schema.json` | `design-docs/{change}/影响面.yaml` | `arch-diff-judge` |

## Org-scoped(5 schemas,企业 KB 用)

| 文件 | 验证什么 yaml | 加载方 |
|---|---|---|
| `banned-patterns.schema.json` | `~/.ni-arch-kb/banned-patterns.yaml` | `arch-frame` |
| `compliance-redlines.schema.json` | `~/.ni-arch-kb/compliance-redlines.yaml` | `arch-frame` |
| `network-boundaries.schema.json` | `~/.ni-arch-kb/network-boundaries.yaml` | `arch-frame` |
| `naming-conventions.schema.json` | `~/.ni-arch-kb/naming-conventions.yaml` | `arch-frame` |
| `tech-radar.schema.json` | `~/.ni-arch-kb/tech-radar.yaml` | `arch-frame` |

## v1.1: External baseline source

| 文件 | 验证什么 | 加载方 |
|---|---|---|
| `external-baseline.schema.json` | 用户提供的 `--baseline-source=*.json`(节省全仓扫描时) | `arch-analyze` |

## 硬要求:`evidence_refs` 字段

**每个 project-scoped yaml 都必须含 `evidence_refs: [{file, line, commit}]` 字段**,用于每条断言的回溯。这是"证据可追溯"在 schema 层的强制落地。

JSON Schema 中通过 `"required": ["evidence_refs"]` 标记。

## Schema 草图位置

参考 `docs/office-hours-2026-05-24.md` Appendix A —— 那里有 `项目总览.yaml` 和 `影响面.yaml` 的完整字段草图。实现时直接转 JSON Schema。

## 实现状态

- v0.1.0(当前): 全部 schema 待实现
- v1.0 目标: 5+1+5 个 schema 全部实现 + skill 输出 yaml 通过校验
- v1.1: 加 `external-baseline.schema.json`
