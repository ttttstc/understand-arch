# 合规红线

## 目的

记录安全、隐私、审计、行业监管等必须遵守的约束。

## 规则

- 涉及 PII 的节点必须标记 `data_sensitivity: pii` 并带 evidence。
- 外部数据传输必须说明边界、目的、保留周期与降级策略。
- 合规未知项必须写入 known_unknowns,不能在 wiki 中省略。

