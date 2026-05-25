# arch-library/ — Optional Architecture Knowledge Seeds

> 这里只放少量高信号知识条目，给 `arch-options`、`arch-review`、`eval-design` 等按需加载。它不是事实源，也不要求每次 workflow 都读全量。

## 使用原则

1. `specs/` 与 `CR` 永远优先于知识库。
2. 只有在需要模式参考、反模式提醒、NFR checklist 时才加载相关条目。
3. 每个文件保持短小，避免新的文档维护债。

## 可用 seed(v1.0)

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

### `agent-architecture/` ⬜ 预留目录

> v1.0 不要求 AI 域完整 seed；只有 `eval-design` 相关最小知识时再补。

| 文件 | scope | 状态 |
|---|---|---|
| `agent-patterns.md` | 单 agent / supervisor-worker / hierarchical / swarm | ⬜ |
| `rag-patterns.md` | naive / advanced / agentic RAG / 检索策略 | ⬜ |
| `tool-design.md` | tool 粒度、幂等性、错误语义、参数设计 | ⬜ |
| `memory-architecture.md` | short/long term / episodic / semantic memory | ⬜ |
| `guardrails.md` | 输入输出护栏、prompt injection 防御 | ⬜ |
| `eval-patterns.md` | offline eval / A/B / golden set | ⬜ |

### `nfr-checklists/`

| 文件 | scope |
|---|---|
| `reliability.md` | 可靠性维度 + 度量 + 反模式 |
| `security.md` | 安全维度 + OWASP / 合规要点 |
| `cost.md` | 成本维度 + 优化方向 |
| `performance.md` | 性能维度 + 度量 + 优化路径 |

### `anti-patterns/`

| 文件 | scope | 状态 |
|---|---|---|
| `microservices-anti-patterns.md` | 微服务常见反模式 | ✅ |
| `agent-anti-patterns.md` | agent 常见反模式 | ⬜ defer 到 AI 域支持时一起做 |

## 加新 seed 的姿势

1. 新建 markdown 文件到对应子目录
2. 在本 MANIFEST 加一行 file + scope
3. 后续按需 skill 读取本 MANIFEST 决定是否加载

**不用改任何编排代码**。知识库是可插拔参考，不是工作流主路径。

## 实现状态

- v1.0: 保持少量高信号 seed，每文件 ≤200 行
- v1.1: 按真实使用频率扩展，而不是先堆文件数
