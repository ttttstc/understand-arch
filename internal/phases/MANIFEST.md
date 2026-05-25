# internal/phases/ — Optional Workflow Phases

> phases 不是默认主链，而是 `arch-workflow` 在特定上下文下注入的补充能力。

## v1.0 可用 phase

| Phase | 何时插入 | 位置 | 产物 |
|---|---|---|---|
| `eval-design` | 当前 CR 涉及 AI / agent / RAG / model-serving 设计 | `options` 之后、`arch-review` 之前 | `change-requests/CR-*/eval-strategy.md` |

## phase 选择规则

`arch-frame` 或 `arch-options` 发现以下信号时可建议插入：

- LLM 调用
- RAG / retrieval
- 多 agent
- 模型微调或 serving
- AI 质量度量与 guardrail 是显式关注点

## v1.1 候选

- `capacity-planning`
- `threat-modeling`
- `migration-planning`
- `data-governance`
