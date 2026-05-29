# 02 组件职责与模块

> 生成时间:2026-05-29T08:24:56.174Z  ·  基于 commit:dfce0cc851a716f2b8b41d9efe076a7dcb4f1efe  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 组件职责叙事

- **Orders Module** (domain, complexity:low, change_risk:medium)：The orders module is the only visible domain component. It owns order creation behavior, and changes here affect the sample's core capability even though the implementation is intentionally small. 责任边界：Create an order identifier for a user-facing order flow.。协作对象：sample::file:src/app.ts。

## 代码层组件证据

- **orders** (module)：Order creation module.
