# 07 风险与技术债

> 生成时间:2026-05-29T08:29:46.939Z  ·  基于 commit:a90f505bfff99e4985db4de6f6a409cbada60dd3  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 先把风险读成改动路线图

风险与技术债不是问题清单，而是改动路线图。风险告诉你什么会阻断目标，技术债告诉你什么会放大修改成本，复杂度热点告诉你哪里最需要测试和设计评审保护。

新人读这一章时，建议先看 critical/high 风险，再回到 02、05、09 找对应组件和流程。这样能把“为什么危险”和“改哪里”连起来。

## 风险

- **Order creation has no visible validation** (architecture, medium/medium)：Add input validation and idempotency behavior before using this path as a production order flow.

## 技术债

- **No sample tests are present** (missing_test, low)：Add a unit test around createOrder before expanding the sample.

## 复杂度热点

- **Orders module is the core sample flow** (critical-flow, medium)：The only visible capability depends on the orders module, so future sample expansion will concentrate change there.

## 扩展约束

- **No persistence boundary is visible** (data-model, impact:medium)：Introduce a clear data model before treating order creation as production architecture.
