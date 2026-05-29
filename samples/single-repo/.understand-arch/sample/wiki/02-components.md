# 02 组件职责与模块

> 生成时间:2026-05-29T08:29:46.939Z  ·  基于 commit:a90f505bfff99e4985db4de6f6a409cbada60dd3  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 先按职责理解组件

读组件时，不要从文件名开始背。先按职责分组：谁负责应用编排，谁负责用户界面，谁负责领域处理，谁负责外部集成。这样后续看到具体文件时，才知道它在架构里承担什么角色。

当前组件角色分布是：domain:1。下面先给职责叙事，再给代码层事实，方便从架构语言落到实际模块。

## 组件职责叙事

- **Orders Module** (domain, complexity:low, change_risk:medium)：The orders module is the only visible domain component. It owns order creation behavior, and changes here affect the sample's core capability even though the implementation is intentionally small. 责任边界：Create an order identifier for a user-facing order flow.。协作对象：sample::file:src/app.ts。

## 代码层组件事实

- **orders** (module)：Order creation module.
