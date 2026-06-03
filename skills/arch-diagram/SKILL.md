---
name: arch-diagram
description: 基于 graph 与 arch-layer 生成 Mermaid、SVG、PNG 或 PlantUML 架构图,默认引导用户选择出图风格。
argument-hint: ["[type] [arch-project-dir] [--format=svg|png|plantuml|mermaid] [--profile=web|middleware|pipeline|agent|multi-repo]"]
---

# /arch-diagram

`/arch-diagram` 是架构图调度器。默认格式是 `svg`，优先走 `vendor/fireworks-tech-graph/PROMPT.md` 的新增出图能力；`mermaid` 保留为兼容路径和默认出图失败后的降级路径；`plantuml` 只输出 `.puml` 源码。

## 全局规则

1. 所有面向人的说明默认中文；代码标识符、路径、命令参数和第三方产品名保留英文。
2. 不修改任何 schema。
3. 不在 Node 或 Python 工具里做语义推断。
4. SVG/PNG 的语义到 JSON 翻译由当前 Claude 会话按 `vendor/fireworks-tech-graph/PROMPT.md` 完成。
5. `engine/arch/diagram-dispatch.mjs` 只做确定性参数校验、依赖检查、渲染、校验、转 PNG、追加 wiki 引用。
6. 用户显式指定 `--format=svg` 或 `--format=png` 时,Python 或 cairosvg 缺失必须直接报错。
7. 用户未指定 `--format` 时,先尝试默认 SVG；如果依赖缺失、fireworks JSON 无法形成或调度器失败,降级走 Mermaid v3.1 路径,并向用户说明降级原因。
8. 不新增 subagent。

## 参数

- `type`: 默认 `c4`。支持 v3.1 语义类型和 fireworks 原生类型。
- `arch-project-dir`: 默认读取 `ARCH_PROJECT_ROOT`，否则使用当前目录。
- `--format`: `svg`、`png`、`plantuml`、`mermaid`，默认 `svg`；`mermaid` 是兼容和降级路径。
- `--style`: `1..7`，兼容高级用法；默认不要要求用户手敲该参数,应通过风格选择菜单确认。
- `--profile`: `web`、`middleware`、`pipeline`、`agent`、`multi-repo`。

## 风格选择引导

当用户没有显式传入 `--style` 时,不要直接要求用户补命令参数。先用中文给出风格菜单,并根据 `profile` 或项目类型标出推荐项:

| 编号 | 风格 | 适用场景 |
|---|---|---|
| `1` | 扁平图标 | 多仓系统、组件多、需要降低视觉负载 |
| `2` | 深色终端 | 中间件、运行时、底层平台、偏工程排障语境 |
| `3` | 工程蓝图 | 数据流水线、部署拓扑、工程设计评审 |
| `4` | Notion 清爽 | 知识库、轻量内部文档、概念说明 |
| `5` | 玻璃层次 | Agent 系统、多组件协作、需要突出层级 |
| `6` | Claude 官方 | Web 应用、正式架构评审、对外汇报 |
| `7` | OpenAI 官方 | AI 产品、模型链路、简洁现代展示 |

推荐规则:

- `web` 默认推荐 `6`
- `middleware` 默认推荐 `2`
- `pipeline` 默认推荐 `3`
- `agent` 默认推荐 `5`
- `multi-repo` 默认推荐 `1`
- 未识别 profile 时,先根据项目事实给 1 个推荐;无法判断时推荐 `6`

交互话术示例:

```text
我会用新的 SVG 出图方式生成架构图。请选一个视觉风格:
1 扁平图标  2 深色终端  3 工程蓝图  4 Notion 清爽
5 玻璃层次  6 Claude 官方(推荐)  7 OpenAI 官方

直接回复编号即可;如果你不选,我会用推荐风格继续。
```

只有在以下场景可以不等待用户选择:

- 用户已经明确给出 `--style`
- 用户说“直接生成”“你决定”“默认即可”
- 当前任务是自动化验收或批处理

非交互场景下,用推荐风格继续,并在回复里说明“已使用推荐风格 N”。

## 三路调度

### 默认路径: format=svg

1. 解析 `type`、`style`、`profile` 和项目目录。
2. 如果用户没有指定 `--style`,按“风格选择引导”先让用户选风格;非交互场景用推荐风格继续。
3. 读取 `specs/repos.json`、各仓 `knowledge-graph.json`、`specs/arch-layer.json`，必要时读取用户补充说明。
4. 打开并遵循 `vendor/fireworks-tech-graph/PROMPT.md`。
5. 将项目事实、架构判断、目标图类型和用户意图整理为自然语言上下文。
6. 按 `PROMPT.md` 生成 fireworks JSON。只生成 JSON，不生成 SVG 文本。
7. 将 JSON 写入临时文件，例如 `.understand-arch/tmp/diagram-spec.json`。
8. 调用:

```bash
node engine/arch/diagram-dispatch.mjs --type=<type> --style=<style> --profile=<profile> --arch-dir=<arch-project-dir> --spec-json=<json-path>
```

9. 调度器会输出到 `wiki/assets/diagrams/{type}-{style}.svg`，并在 `wiki/14-diagrams.md` 追加嵌图引用。
10. 如果用户没有显式传入 `--format`,且默认 SVG 路径失败,走 Mermaid 降级路径；如果用户显式传入 `--format=svg`,停止并返回错误。

### format=png

1. 复用默认 SVG 路径的上下文整理和 fireworks JSON 生成流程。
2. 调用:

```bash
node engine/arch/diagram-dispatch.mjs --format=png --type=<type> --style=<style> --profile=<profile> --arch-dir=<arch-project-dir> --spec-json=<json-path>
```

3. 调度器会先生成同源 SVG,再用 cairosvg 转出 PNG。
4. `--format=png` 是显式请求,失败时不降级。

### format=mermaid

这是兼容路径和默认 SVG 失败后的降级路径，以下流程为 v3.1 原路径。

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
| `svg` | `wiki/assets/diagrams/{type}-{style}.svg` |
| `png` | `wiki/assets/diagrams/{type}-{style}.png` |
| `plantuml` | `wiki/assets/diagrams/{type}.puml` |
| `mermaid` | `wiki/14-diagrams.md` |

## 质量门槛

1. 默认路径必须优先产 SVG。
2. Mermaid 路径不得调用 Python。
3. SVG/PNG 路径必须复用 `vendor/fireworks-tech-graph/PROMPT.md`。
4. fireworks JSON 必须是项目事实的投影，不得捏造组件、依赖或调用链。
5. 产出的 SVG 必须通过 `validate-svg.sh`。
6. PNG 必须由 cairosvg 从同源 SVG 转出。
7. `wiki/14-diagrams.md` 中的图片引用必须指向实际存在的文件。
8. 默认 SVG 失败后降级 Mermaid 时,必须在回复里说明降级原因。
