# 09 流程与场景

> 生成时间:2026-05-29T08:29:46.939Z  ·  基于 commit:a90f505bfff99e4985db4de6f6a409cbada60dd3  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 先读用户故事，再追代码路径

流程章节把能力串成运行时故事。它适合用来回答：用户触发什么、系统经过哪些组件、最后得到什么结果。

当你要改一个功能时，先找对应流程，再沿着步骤回到组件和风险章节，比直接搜索文件更稳。

## 端到端链路

- **Create Order**：触发条件是 Application entry point invokes order creation.，结果是 A user-specific order identifier is produced.。链路：1. The application entry point imports the orders module. (sample::file:src/app.ts, sample::module:orders) 2. The orders module contains createOrder, which creates an order identifier. (sample::module:orders, sample::function:src/orders.ts:createOrder)

## Domain Flow 节点

未识别到 domain/flow/step 节点。
