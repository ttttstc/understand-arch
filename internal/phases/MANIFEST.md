# internal/phases/ — Predefined Phase Library

> `arch-frame` 输出 `architecture_profile.recommended_phases`。`arch-workflow` 根据架构上下文,在状态机里插入对应 phase。

## 可用 phases(v1.0)

| Phase | 何时插入 | 编排方 | 产物 |
|---|---|---|---|
| `eval-design` | 检测到 AI/agent 架构(RAG / 多 agent / LLM 应用) | LLM-orchestrated | `eval-strategy.md`(offline eval + guardrails + KPIs) |

## v1.1 候选

| Phase | 何时插入 | 触发条件 |
|---|---|---|
| `capacity-planning` | scale-sensitive 设计 | 高 QPS / 大数据量 / 跨地域 |
| `threat-modeling` | security-sensitive 设计 | 用户数据 / 金融 / 合规 |
| `migration-planning` | brownfield 大改造 | 单体拆分 / 跨平台迁移 |
| `data-governance` | data-heavy 系统 | 多源数据 / 数据湖 / 实时分析 |

## Phase 文件格式

每个 phase 是个 mini SKILL.md,描述:
- **When to insert**(触发条件)
- **Input contract**(从上游 phase 拿什么)
- **Output contract**(产什么 md/yaml)
- **Acceptance criteria**(验收)
- **Failure degradation**(失败降级)

参考 `eval-design.md`(实现后)作为 canonical example。

## LLM 如何选 phase

`arch-frame` 在分析时:
1. 读本 MANIFEST 列出的可用 phases
2. 对照 `architecture_profile.primary_concerns` 看哪些 phase 该插入
3. 输出 `recommended_phases: [name]`
4. workflow 收到后,在状态机的对应位置(通常在 `options` 后、`adr` 前)插入该 phase

## 实现状态

- v0.1.0(当前): MANIFEST 已写,`eval-design.md` **待 Codex 实现**
- v1.0: `eval-design.md` 实现 + workflow 集成
- v1.1: 添加 v1.1 候选(根据 dogfood 反馈优先级)
