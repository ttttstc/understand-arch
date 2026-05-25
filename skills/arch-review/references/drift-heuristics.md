# Drift Heuristics

## 1. 目标

本文件约束 `arch-review --mode=drift` 如何判断“代码现实”是否偏离 `specs`，避免把任何差异都夸大成 drift。

## 2. 高价值 drift 信号

### 组件层

- 新增关键组件但 `specs/baseline.yaml.components` 未出现
- 某个关键组件已消失，但 specs 仍把它当主路径
- 组件职责明显变化，但 overview 与 baseline 仍是旧描述

### 依赖层

- 关键依赖方向发生变化
- 新增跨边界依赖
- 同步调用链变深
- 新增关键外部依赖

### 数据层

- 新增关键数据实体
- 写边界变化
- migration 明显发生但 specs 未记录
- 回滚策略与当前实现不匹配

### 部署层

- 新增部署单元
- 发布顺序变化
- 环境关键差异扩大
- 关键 runtime config 新增或含义变化

## 3. 不应轻易判 drift 的情况

- 单个函数实现变化
- 文案或样式变化
- 测试重构
- 局部重命名但边界不变
- 代码整理但职责不变

## 4. drift 分级建议

### blocked

- 关键组件、数据、部署边界已经与 specs 大幅不符
- 继续基于当前 specs 做设计高概率误导团队

### degraded

- 有明显偏差，但主要边界仍可辨认
- specs 还可用，但需要尽快 refresh

### ready

- 未发现影响架构判断的显著偏差

## 5. 输出要求

每条 drift finding 要回答：

- 偏了什么
- 偏差发生在哪层
- 会误导哪类决策
- 建议 refresh 哪个 specs 文件
