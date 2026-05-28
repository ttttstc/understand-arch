# Components

> 生成时间:2026-05-28T15:22:09.394Z  ·  基于 commit:6ea05653a7f15c99c9d3f55cf696d8c9a61b770e  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 组件职责叙事

- **Orders Module** (domain, complexity:low, change_risk:medium)：The orders module is the only visible domain component. It owns order creation behavior, and changes here affect the sample's core capability even though the implementation is intentionally small. 责任边界：Create an order identifier for a user-facing order flow.。协作对象：sample::file:src/app.ts。 [evidence: sample::module:orders, sample::function:src/orders.ts:createOrder]

## 代码层组件证据

- **orders** (module)：Order creation module. [evidence: sample::module:orders]
