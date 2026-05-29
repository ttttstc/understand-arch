# 09 流程与场景

> 生成时间:2026-05-29T08:24:56.174Z  ·  基于 commit:dfce0cc851a716f2b8b41d9efe076a7dcb4f1efe  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 端到端链路

- **Create Order**：触发条件是 Application entry point invokes order creation.，结果是 A user-specific order identifier is produced.。链路：1. The application entry point imports the orders module. (sample::file:src/app.ts, sample::module:orders) 2. The orders module contains createOrder, which creates an order identifier. (sample::module:orders, sample::function:src/orders.ts:createOrder)

## Domain Flow 节点

未识别到 domain/flow/step 节点。
