# 网络边界

## 目的

定义服务之间、仓库之间、内外部系统之间的通信边界。

## 规则

- public endpoint 必须标记 boundary。
- 跨仓调用需要在 `cross-repo.json#cross_edges` 中建模。
- 新增外部依赖必须说明 SLA、失败策略和观测点。

