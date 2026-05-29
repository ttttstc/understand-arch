# 02 组件职责与模块

> 生成时间:2026-05-29T07:52:01.589Z  ·  基于 commit:508a0c26f5f805556bac513a5caeb51bf851491a  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 组件职责叙事

- **Orders Module** (domain, complexity:low, change_risk:medium)：The orders module is the only visible domain component. It owns order creation behavior, and changes here affect the sample's core capability even though the implementation is intentionally small. 责任边界：Create an order identifier for a user-facing order flow.。协作对象：sample::file:src/app.ts。

## 代码层组件证据

- **orders** (module)：Order creation module.

## 证据来源

| 判断 | 代码位置 |
| --- | --- |
| 组件职责: Orders Module | sample::module:orders<br>sample::function:src/orders.ts:createOrder |
| 代码层组件: orders | sample::module:orders |
