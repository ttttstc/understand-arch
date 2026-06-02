---
name: arch-diagram
description: 基于 graph 与 arch-layer 生成 Mermaid、SVG、PNG 或 PlantUML 架构图。
argument-hint: ["[type] [arch-project-dir] [--format=mermaid|svg|png|plantuml] [--style=1..7] [--profile=web|middleware|pipeline|agent|multi-repo]"]
---

# /arch-diagram

`/arch-diagram` 是架构图调度器。默认格式是 `mermaid`，必须走 v3.1 原路径；`svg` 和 `png` 复用 `vendor/fireworks-tech-graph/PROMPT.md` 的编排能力；`plantuml` 只输出 `.puml` 源码。

## 全局规则

1. 所有面向人的说明默认中文；代码标识符、路径、命令参数和第三方产品名保留英文。
2. 不修改任何 schema。
3. 不在 Node 或 Python 工具里做语义推断。
4. SVG/PNG 的语义到 JSON 翻译由当前 Claude 会话按 `vendor/fireworks-tech-graph/PROMPT.md` 完成。
5. `engine/arch/diagram-dispatch.mjs` 只做确定性参数校验、依赖检查、渲染、校验、转 PNG、追加 wiki 引用。
6. Python 或 cairosvg 缺失时直接报错，不降级为 Mermaid。
7. 不新增 subagent。

## 参数

- `type`: 默认 `c4`。支持 v3.1 语义类型和 fireworks 原生类型。
- `arch-project-dir`: 默认读取 `ARCH_PROJECT_ROOT`，否则使用当前目录。
- `--format`: `mermaid`、`svg`、`png`、`plantuml`，默认 `mermaid`。
- `--style`: `1..7`，默认由 profile 决定；无 profile 时为 `1`。
- `--profile`: `web`、`middleware`、`pipeline`、`agent`、`multi-repo`。

## 三路调度

### format=mermaid

这是默认路径，以下流程为 v3.1 原路径。

Generate diagrams as markdown/Mermaid projections of existing graph and architecture-layer data. v3.0 does not create a separate diagram engine; diagrams are written into wiki page `14-diagrams.md` and may be copied into CR.md or ADRs.

## Supported Diagram Types

- `context`: system context and external actors.
- `container`: services, modules, resources, and repos.
- `component`: important modules/classes within a repo.
- `flow`: key runtime scenario or domain flow.
- `risk`: risk/debt heatmap by component.
- `c4`: produce context + container + component summaries.

## Inputs

- `specs/repos.json`
- per-repo code graphs
- `specs/arch-layer.json`
- optional CR.md or ADR path supplied by caller

## Procedure

1. Resolve `ARCH_PROJECT_ROOT`.
2. Read graph and arch-layer.
3. Select diagram type.
4. Choose only nodes with evidence.
5. Prefer module/service/resource/endpoint/schema/table nodes for architecture diagrams.
6. Include repo prefixes in labels when multi-repo.
7. Write Mermaid, not SVG.
8. Add a source note listing graph or arch-layer ids used.

## LLM Dispatch

If the diagram requires semantic grouping, dispatch `arch-solution-designer`:

```text
Mode: architecture diagram projection.
Diagram type: <type>
Read graph and arch-layer.
Return Mermaid only plus a JSON list of evidence ids.
Do not invent nodes.
Do not omit critical risks for risk diagrams.
```

## Output

- Default: append or replace the matching section in `wiki/14-diagrams.md`.
- If caller provides CR.md: update `## 13. 关联` with the diagram reference.
- If caller provides ADR: append a diagram block as evidence.

## Failure Rules

- Missing graph: stop.
- Missing arch-layer for risk/capability diagrams: stop.
- Mermaid with placeholder labels: reject and regenerate once.

### format=svg 或 format=png

1. 解析 `type`、`style`、`profile` 和项目目录。
2. 读取 `specs/repos.json`、各仓 `knowledge-graph.json`、`specs/arch-layer.json`，必要时读取用户补充说明。
3. 打开并遵循 `vendor/fireworks-tech-graph/PROMPT.md`。
4. 将项目事实、架构判断、目标图类型和用户意图整理为自然语言上下文。
5. 按 `PROMPT.md` 生成 fireworks JSON。只生成 JSON，不生成 SVG 文本。
6. 将 JSON 写入临时文件，例如 `.understand-arch/tmp/diagram-spec.json`。
7. 调用:

```bash
node engine/arch/diagram-dispatch.mjs --format=<svg|png> --type=<type> --style=<style> --profile=<profile> --arch-dir=<arch-project-dir> --spec-json=<json-path>
```

8. 调度器会输出到 `wiki/assets/diagrams/{type}-{style}.svg` 或 `wiki/assets/diagrams/{type}-{style}.png`，并在 `wiki/14-diagrams.md` 追加嵌图引用。
9. 如果调度器返回依赖、JSON 或 SVG 校验错误，停止并把错误原文返回给用户。

### format=plantuml

1. 读取 graph、arch-layer 和用户意图。
2. 直接生成 PlantUML 源码，不调用 fireworks，不调用 `diagram-dispatch.mjs`。
3. 输出到 `wiki/assets/diagrams/{type}.puml`。
4. 在 `wiki/14-diagrams.md` 追加源码文件引用。
5. 只产 `.puml`，不提供渲染服务。

## Profile 推荐表

| profile | 默认 type 集 | 默认 style | 适用项目 |
|---|---|---|---|
| `web` | `architecture`, `flow`, `sequence` | `6` | Web 应用，三层结构和用户链路清晰 |
| `middleware` | `architecture`, `data-flow`, `sequence` | `2` | 中间件、运行时、底层平台 |
| `pipeline` | `data-flow`, `flowchart`, `timeline` | `3` | 数据流水线、转换链路、批处理任务 |
| `agent` | `agent`, `memory`, `sequence` | `5` | Agent 系统、工具调用、记忆链路 |
| `multi-repo` | `architecture`, `network-topology`, `c4` | `1` | 多仓系统、服务拓扑、跨仓依赖 |

## 类型映射表

| v3.1 语义类型 | fireworks 默认类型 | 说明 |
|---|---|---|
| `context` | `architecture` | 外部系统与系统边界 |
| `container` | `architecture` | 服务、模块、资源层 |
| `component` | `class` | 模块内组件关系 |
| `flow` | `data-flow` | 默认数据流；业务步骤可改用 `flowchart` |
| `risk` | `architecture` | 通过图面分组表达风险聚集区 |
| `c4` | `architecture` | 用 context、container、component 信息组合表达 |

## fireworks 原生类型

以下类型可直接作为 `type` 使用:

- `sequence`
- `state-machine`
- `er-diagram`
- `use-case`
- `mind-map`
- `timeline`
- `comparison`
- `network-topology`

同时也支持 fireworks 的完整模板类型:

- `architecture`
- `data-flow`
- `flowchart`
- `agent`
- `memory`
- `class`

## 输出位置

| format | 输出 |
|---|---|
| `mermaid` | `wiki/14-diagrams.md` |
| `svg` | `wiki/assets/diagrams/{type}-{style}.svg` |
| `png` | `wiki/assets/diagrams/{type}-{style}.png` |
| `plantuml` | `wiki/assets/diagrams/{type}.puml` |

## 质量门槛

1. Mermaid 路径不得调用 Python。
2. SVG/PNG 路径必须复用 `vendor/fireworks-tech-graph/PROMPT.md`。
3. fireworks JSON 必须是项目事实的投影，不得捏造组件、依赖或调用链。
4. 产出的 SVG 必须通过 `validate-svg.sh`。
5. PNG 必须由 cairosvg 从同源 SVG 转出。
6. `wiki/14-diagrams.md` 中的图片引用必须指向实际存在的文件。
