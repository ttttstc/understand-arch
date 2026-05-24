# arch-library/ — Knowledge Base for architecture_profile

> `arch-frame` 读这份 MANIFEST,根据项目的 `architecture_profile` 选**相关的 references** 加载。每个 reference 是聚焦的领域知识包。

## LLM 如何用

1. `arch-frame` 分析项目(代码 + 描述)
2. LLM 识别架构 profile(styles + concerns)
3. LLM **扫描这份 MANIFEST**,挑 scope 匹配项目需要的 references
4. 选中的 references 加载进后续 skill(options / review / pack)的 prompt context

## 可用 references(v1.0 seed)

每个文件 **≤200 行**,聚焦单一关切。v1.1 可扩深度。

### `typescript-patterns/`

| 文件 | scope |
|---|---|
| `project-structure.md` | TS/JS 项目类型、单仓 vs monorepo、目录组织、模块边界 |
| `type-discipline.md` | strict 配置、any/unknown、branded type、类型边界(zod)、API 类型来源 |
| `build-and-bundle.md` | Vite/Webpack/tsup/esbuild 选型、ESM/CJS、tree-shake、dual package hazard |
| `testing-strategy.md` | Testing Trophy、Vitest/Playwright、MSW、e2e 稳定性、覆盖率陷阱 |

### `microservices-patterns/`

| 文件 | scope |
|---|---|
| `service-decomposition.md` | 服务拆分原则、限界上下文、康威定律 |
| `event-driven.md` | 事件驱动架构、消息模式、saga / 补偿 |
| `api-gateway.md` | 网关模式、BFF、聚合层 |

### `devops-patterns/`

| 文件 | scope |
|---|---|
| `deployment-strategies.md` | 蓝绿 / 灰度 / canary / rolling |
| `observability.md` | logging / metrics / tracing / 告警 |
| `multi-region.md` | 跨地域部署、数据一致性、failover |

### `migration-patterns/`

| 文件 | scope |
|---|---|
| `strangler.md` | 绞杀者模式,逐步替换 |
| `branch-by-abstraction.md` | 通过抽象层切换实现 |
| `parallel-run.md` | 双写、双读、对比、切流 |

### `agent-architecture/`

| 文件 | scope |
|---|---|
| `agent-patterns.md` | 单 agent / supervisor-worker / hierarchical / swarm |
| `rag-patterns.md` | naive / advanced / agentic RAG / 检索策略 |
| `tool-design.md` | tool 粒度、幂等性、错误语义、参数设计 |
| `memory-architecture.md` | short/long term / episodic / semantic memory |
| `guardrails.md` | 输入输出护栏、prompt injection 防御 |
| `eval-patterns.md` | offline eval / A/B / golden set |

### `nfr-checklists/`

| 文件 | scope |
|---|---|
| `reliability.md` | 可靠性维度 + 度量 + 反模式 |
| `security.md` | 安全维度 + OWASP / 合规要点 |
| `cost.md` | 成本维度 + 优化方向 |
| `performance.md` | 性能维度 + 度量 + 优化路径 |

### `anti-patterns/`

| 文件 | scope |
|---|---|
| `microservices-anti-patterns.md` | 微服务常见反模式 |
| `agent-anti-patterns.md` | agent 常见反模式(uncontrolled recursion / tool soup / 无 eval / prompt 漂移) |

## 加新 reference 的姿势

1. 新建 markdown 文件到对应子目录
2. 在本 MANIFEST 加一行 file + scope
3. `arch-frame` 下次运行**自动发现**

**不用改任何代码**。这是设计:LLM 通过读 MANIFEST + 上下文选 references,加知识 ≠ 改代码。

## 实现状态

- v0.1.0(当前): MANIFEST 已写,具体 reference 文件**待 Codex 创建**
- v1.0: 每子目录 ≥1 文件(每文件 ≤200 行)
- v1.1: 深度扩展(200+ 行),新加子目录(data-architecture / iot / edge 等按 dogfood 反馈)
