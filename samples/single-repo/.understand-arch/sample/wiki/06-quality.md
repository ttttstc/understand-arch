# Quality

> 生成时间:2026-05-28T15:22:09.394Z  ·  基于 commit:6ea05653a7f15c99c9d3f55cf696d8c9a61b770e  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 质量属性

- **maintainability** (adequate)：The sample has a small entry point and a separated orders module. [evidence: sample::file:src/app.ts, sample::module:orders]

## 扩展约束

- **No persistence boundary is visible**：Introduce a clear data model before treating order creation as production architecture. [evidence: sample::function:src/orders.ts:createOrder]
