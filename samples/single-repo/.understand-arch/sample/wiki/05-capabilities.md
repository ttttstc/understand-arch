# 05 能力地图

> 生成时间:2026-05-29T08:29:46.939Z  ·  基于 commit:a90f505bfff99e4985db4de6f6a409cbada60dd3  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 从用户价值开始

能力地图是最适合新人起步的一章。它从用户或平台价值出发，而不是从目录结构出发。

优先看 importance=critical 的能力：当前未标出 critical 能力。成熟度不是好坏评价，而是提示你这项能力在“可用、稳定、可扩展”之间处于什么阶段。

## 能力地图

- **Order Creation** (nascent, high)：Creates an order identifier through the application entry point and orders module. 缺口：No persistence, idempotency, or validation is visible in the sample graph.。

## 能力链路

- **Create Order**：触发条件是 Application entry point invokes order creation.，结果是 A user-specific order identifier is produced.。链路：1. The application entry point imports the orders module. (sample::file:src/app.ts, sample::module:orders) 2. The orders module contains createOrder, which creates an order identifier. (sample::module:orders, sample::function:src/orders.ts:createOrder)
