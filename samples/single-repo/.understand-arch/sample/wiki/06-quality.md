# 06 质量属性

> 生成时间:2026-05-29T07:52:01.589Z  ·  基于 commit:508a0c26f5f805556bac513a5caeb51bf851491a  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 质量属性

- **maintainability** (adequate)：The sample has a small entry point and a separated orders module.

## 扩展约束

- **No persistence boundary is visible**：Introduce a clear data model before treating order creation as production architecture.

## 证据来源

| 判断 | 代码位置 |
| --- | --- |
| 质量属性: maintainability | sample::file:src/app.ts<br>sample::module:orders |
| 扩展约束: No persistence boundary is visible | sample::function:src/orders.ts:createOrder |
