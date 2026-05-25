# Phase: eval-design

> 可选 phase。仅当某个 CR 明确涉及 AI / agent / RAG / model-serving 架构时插入。

## 何时插入

出现以下任一信号时可插入：

- `cr.md` 明确提到 LLM、RAG、多 agent、模型 serving、prompt workflow
- `impact.yaml` 中存在 AI 相关组件、知识库、召回、工具调用、模型路由
- 用户明确要求设计评测与 guardrail

不满足时不要“以防万一”插入。

## 读取输入

- `change-requests/CR-*/cr.md`
- `change-requests/CR-*/impact.yaml`
- `change-requests/CR-*/options.md`（若存在）
- `specs/quality.yaml`

## 产出

- `change-requests/CR-*/eval-strategy.md`

## 最小结构

1. 质量维度
2. 离线评测集
3. 在线 guardrail
4. KPI
5. 评测流水线
6. 未决问题

## 硬规则

1. 不能只写“后面再评测”。
2. KPI 必须可解释，不接受纯口号。
3. guardrail 要区分 MVP 必需与后续增强。

## 失败降级

- 若 `options.md` 还未定稿：允许基于当前最佳方案写草案，但必须标注假设
- 若用户拒绝回答评测问题：保留未决问题并在 `review.yaml` 中标 warning
