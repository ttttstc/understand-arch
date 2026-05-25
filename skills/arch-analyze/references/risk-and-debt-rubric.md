# Risk and Technical Debt Rubric

## 1. 目标

本文件约束 `arch-analyze` 如何把“看起来不舒服”的问题区分成：

- risk
- technical debt
- known unknown
- 仅观察项

## 2. risk 与 debt 的区别

### risk

更接近“如果现在不处理，未来较大概率出问题”：

- 可用性风险
- 数据一致性风险
- 安全/合规风险
- 发布与回滚风险
- 单点依赖风险
- ownership 缺失导致的响应风险

### technical debt

更接近“当前还能跑，但未来会持续拉高改动成本或放大风险”：

- 边界混乱
- 高耦合
- 过度共享
- 缺测试护栏
- 依赖方向不健康
- 历史兼容包袱过多

### known unknown

证据不足以定性，但这个问题重要到不能忽略：

- 不知道谁是 owner
- 不知道真实部署方式
- 不知道外部依赖 SLA
- 不知道数据写边界

### observation

只是值得注意，但暂时不应进入正式风险或债：

- 命名稍乱
- 单个模块结构不优雅
- 存在少量重复代码

## 3. 风险分类建议

- availability
- reliability
- security
- compliance
- data-integrity
- dependency
- deployment
- operability
- ownership
- scalability

## 4. 技术债分类建议

- boundary-debt
- coupling-debt
- test-debt
- data-debt
- deployment-debt
- observability-debt
- documentation-debt
- dependency-debt

## 5. 风险识别强信号

### 架构组成相关

- 关键组件无 owner
- 组件职责交叉严重
- 数据写边界不清
- 一个链路需要多处同步改动

### 依赖相关

- 深同步调用链
- 关键外部依赖无 fallback
- 共享库改动波及大量组件
- 循环依赖或反向依赖迹象

### 数据相关

- 多组件直写同一数据对象
- migration 路径不清
- rollback 难以定义
- 历史兼容逻辑散落各处

### 运行与部署相关

- 发布顺序复杂但文档缺失
- 没有明确回滚止损点
- 环境差异驱动行为差异
- 运行时关键配置无人负责

## 6. 严重度判定

### critical

- 一旦出事，直接影响核心业务可用性、资金、安全或合规
- 缺少现实可行的快速缓解路径

### high

- 明显会阻碍高频迭代，或在常见故障情境下造成较大影响
- 存在缓解路径，但成本高或不稳定

### medium

- 影响真实存在，但通常需要特定条件才暴露
- 可缓解，但继续放着会逐渐恶化

### low

- 影响有限
- 更适合作为债务记录或观察项

## 7. 每条 risk/debt 最少证据

至少具备以下两类中的一类强证据：

- 代码/配置/契约/部署文件
- Git churn / 依赖拓扑 / 运行边界

仅有“经验判断”时，优先降为 known unknown 或 observation。

## 8. 缓解建议写法

不要写空泛建议，如：

- “建议重构”
- “建议优化架构”

应写成：

- 缩小哪条边界
- 增加哪类护栏
- 明确哪类 owner
- 拆出哪类依赖
- 补哪类文档或回滚路径
