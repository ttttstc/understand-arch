# understand-arch

> 一个运行在 Claude Code 里的架构师助手。它读取真实代码，把架构理解沉淀成可信文档、评审材料、架构图和可视化看板。

[English](./README.md)

---

## 它是什么

`understand-arch` 想帮团队回答一个朴素但很难的问题：

> “这个系统到底是什么、怎么搭起来的、我改它之前要小心什么？”

它不是一个自己从头跑 agent loop 的独立智能体运行时。对话、工具调用循环、上下文承载由 Claude Code 负责。`understand-arch` 做的是架构师那层工作：

- 用 Understand-Anything 的确定性扫描能力读取代码结构
- 用 Claude Code Skill 和 subagent 做架构判断
- 把判断落成可追溯的架构制品
- 用 reviewer 和 eval 检查产物质量
- 生成文档、方案、架构图和 dashboard，方便团队讨论

简单说：它是一个帮你接手项目、理解架构、设计变更、做架构评审的 Claude Code 插件。

## 它能做什么

### 看懂一个代码仓

运行：

```text
/arch-onboard
```

它会扫描一个仓库，或多个相关仓库，构建知识图谱，并让 Claude Code 里的 subagent 推断架构层信息：架构风格、组件职责、业务能力、接口、质量属性、风险、技术债，以及目前无法确认的信息。

产物会写到：

```text
.understand-arch/{project}/
```

### 生成一篇能读的架构文档

打开：

```text
.understand-arch/{project}/wiki/ARCHITECTURE.md
```

这是主文档。它不是给工具看的摘要，而是给新架构师、技术负责人和团队成员读的架构技术文档。它会讲清楚项目定位、核心组件、流程、接口、数据、风险、部署、决策和约束。

同一份内容也会拆成 14 个章节文件，方便单独评审和维护。

### 基于当前架构设计变更

运行：

```text
/arch-design
```

你给它一份 PRD 或变更说明，它会读取当前架构，找出受影响范围，并生成一份 `CR.md`。这份设计文档包含 14 个 RFC 风格章节：

- 背景与目标
- 影响范围
- 方案设计
- 替代方案
- 非功能需求
- 风险与技术债
- 改动清单
- 灰度、回滚、测试和追踪关系

生成后还会经过高级架构师 subagent 评审，避免只产出格式正确但内容空的方案。

### 检查架构基线是否还可信

运行：

```text
/arch-audit
```

它会对比已保存的架构基线和当前代码状态，检查文档是否过期、证据是否断裂、图谱是否漂移，并提示是否需要刷新。

### 刷新或改写 wiki

运行：

```text
/arch-wiki
```

它会基于最新图谱和架构层重新生成 `ARCHITECTURE.md` 与 14 个章节。

也可以按受众生成：

```text
/arch-wiki --audience=cto
/arch-wiki --audience=newcomer
/arch-wiki --audience=pm
/arch-wiki --audience=architect
```

### 生成架构图

运行：

```text
/arch-diagram
```

默认使用新的 SVG 出图能力，Mermaid 保留为兼容和降级路径。

支持格式：

| 格式 | 输出位置 | 适合场景 |
|---|---|---|
| `svg` | `wiki/assets/diagrams/{type}-{style}.svg` | 架构评审文档、wiki、设计稿 |
| `png` | `wiki/assets/diagrams/{type}-{style}.png` | 飞书、Confluence、钉钉、PPT |
| `plantuml` | `wiki/assets/diagrams/{type}.puml` | 已经使用 PlantUML 的团队 |
| `mermaid` | `wiki/14-diagrams.md` | 兼容和降级 |

你通常不需要记风格编号。`/arch-diagram` 会引导你选择风格，也会根据项目类型给出推荐。

推荐 profile：

| profile | 推荐图 | 推荐风格 |
|---|---|---|
| `web` | `architecture`, `flow`, `sequence` | `6` |
| `middleware` | `architecture`, `data-flow`, `sequence` | `2` |
| `pipeline` | `data-flow`, `flowchart`, `timeline` | `3` |
| `agent` | `agent`, `memory`, `sequence` | `5` |
| `multi-repo` | `architecture`, `network-topology`, `c4` | `1` |

示例：

```text
/arch-diagram
/arch-diagram architecture --format=png
/arch-diagram sequence --format=svg
/arch-diagram c4 --format=mermaid
```

### 打开可视化看板

运行：

```text
/arch-dashboard
```

它会打开交互式 dashboard，用来看代码图谱、能力地图、风险视图、多仓拓扑和分步架构导览。

### 沉淀资深成员脑子里的隐式知识

运行：

```text
/arch-interview
```

有些关键约束不在代码里：为什么某个模块只能单线程，为什么某个字段不能改名，为什么一条依赖链看起来别扭，或者一次历史事故留下了什么设计边界。

`/arch-interview` 会把这些问题变成一次引导式访谈。你只需要逐题确认、修正或跳过。确认后的约束可以进入 wiki 和方案评审。

## 安装

在 Claude Code 中执行：

```text
/plugin marketplace add https://github.com/ttttstc/understand-arch
/plugin install understand-arch@understand-arch
/reload-plugins
```

重载后输入：

```text
/arch-
```

应该能看到这些命令：

- `/arch-onboard`
- `/arch-design`
- `/arch-audit`
- `/arch-wiki`
- `/arch-diagram`
- `/arch-dashboard`
- `/arch-interview`

### 看不到命令怎么办

1. 先执行 `/reload-plugins`。
2. 用 `/plugin list` 确认已经安装 `understand-arch`。
3. 命令名使用短横线，比如 `/arch-onboard`，不是 `/arch:onboard`。
4. 如果还看不到，重启 Claude Code 后再执行 `/reload-plugins`。

## 第一次怎么用

在你想分析的项目里运行：

```text
/arch-onboard
```

首次运行会：

1. 扫描代码仓
2. 必要时发现相关兄弟仓库
3. 构建知识图谱
4. 推断架构层
5. 生成 wiki
6. 告诉你哪些地方目前无法确认

之后其他命令都会基于同一个 `.understand-arch/` 工作区继续演进。

自然语言也可以触发：

- “帮我看懂这个项目” -> `/arch-onboard`
- “根据这份 PRD 设计方案” -> `/arch-design`
- “架构基线还能信么” -> `/arch-audit`
- “给 CTO 一份总览” -> `/arch-wiki --audience=cto`

## 会在项目里写入什么

只会新增一个目录：

```text
your-project/
└── .understand-arch/
    └── {project}/
        ├── specs/
        │   ├── repos.json
        │   ├── repos/{id}/knowledge-graph.json
        │   └── arch-layer.json
        ├── wiki/
        │   ├── ARCHITECTURE.md
        │   ├── 01..14-*.md
        │   └── assets/diagrams/
        ├── rules/
        │   └── constraints/
        ├── decisions/
        ├── change-requests/
        ├── state.yaml
        └── intermediate/
```

`intermediate/` 是扫描中间产物，会被 gitignore。架构文档、规则、决策和变更设计默认适合跟代码一起版本化。

## 可选：git commit 时自动刷新

默认情况下，架构基线只会在你运行 `/arch-onboard` 或 `/arch-audit` 时刷新。

如果希望围绕 git commit 自动刷新：

```text
/arch-onboard --enable-hooks
```

之后也可以在项目 state 文件里把 `hooks_enabled` 改回 `false` 关闭。

## License

MIT — 见 [LICENSE](./LICENSE)。

架构扫描能力 fork 自 [Understand-Anything](https://github.com/Lum1104/Understand-Anything)（MIT）。见 [engine/NOTICE](./engine/NOTICE)。
