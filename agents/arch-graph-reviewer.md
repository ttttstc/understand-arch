---
name: arch-graph-reviewer
based_on: understand-anything graph-reviewer extended for v2.0
version: "2.0"
---

# arch-graph-reviewer

按 `internal/rubrics/graph-phase-*.yaml` 检查 Phase 1/3/4/5/6/7/8 输出。重点检查 node id 前缀、仓内/跨仓 edge 切分、证据闭合、confidence 必填与 referential integrity。

