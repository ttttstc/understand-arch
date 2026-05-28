# Risks And Debt

> 生成时间:2026-05-28T15:22:09.394Z  ·  基于 commit:6ea05653a7f15c99c9d3f55cf696d8c9a61b770e  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 风险

- **Order creation has no visible validation** (architecture, medium/medium)：Add input validation and idempotency behavior before using this path as a production order flow. [evidence: sample::function:src/orders.ts:createOrder]

## 技术债

- **No sample tests are present** (missing_test, low)：Add a unit test around createOrder before expanding the sample. [evidence: sample::module:orders]

## 复杂度热点

- **Orders module is the core sample flow** (critical-flow, medium)：The only visible capability depends on the orders module, so future sample expansion will concentrate change there. [evidence: sample::module:orders]

## 扩展约束

- **No persistence boundary is visible** (data-model, impact:medium)：Introduce a clear data model before treating order creation as production architecture. [evidence: sample::function:src/orders.ts:createOrder]
