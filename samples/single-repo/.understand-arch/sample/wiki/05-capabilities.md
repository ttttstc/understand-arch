# 05 能力地图

> 生成时间:2026-05-29T07:52:01.589Z  ·  基于 commit:508a0c26f5f805556bac513a5caeb51bf851491a  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 能力地图

- **Order Creation** (nascent, high)：Creates an order identifier through the application entry point and orders module. 缺口：No persistence, idempotency, or validation is visible in the sample graph.。

## 能力链路

- **Create Order**：触发条件是 Application entry point invokes order creation.，结果是 A user-specific order identifier is produced.。链路：1. The application entry point imports the orders module. (sample::file:src/app.ts, sample::module:orders) 2. The orders module contains createOrder, which creates an order identifier. (sample::module:orders, sample::function:src/orders.ts:createOrder)

## 证据来源

| 判断 | 代码位置 |
| --- | --- |
| 能力: Order Creation | sample::module:orders<br>sample::function:src/orders.ts:createOrder<br>sample::file:src/app.ts |
| 能力链路: Create Order | sample::file:src/app.ts<br>sample::module:orders<br>sample::function:src/orders.ts:createOrder |
