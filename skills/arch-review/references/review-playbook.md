# arch-review Playbook

## 1. specs 模式检查点

- 4+1 coverage 是否完整
- freshness_status 是否可信
- risks 与 tech debt 是否可用于审视
- evidence_refs 是否闭合
- known unknowns 是否被显式保留

## 2. CR 模式检查点

- `impact.yaml` 8 维是否完整
- 数据模型变化是否具体
- 回滚策略是否可执行
- writeback 目标是否明确
- 是否触碰 org KB 红线

## 3. drift heuristics

优先看：

- 架构敏感文件改动
- 新增或删除关键组件
- 依赖方向变化
- 数据模型变更
- 部署路径变化

## 4. severity rubric

- `error`: 阻塞继续，例如回滚不可执行、关键依赖变化未解释、明显违反 org KB
- `warning`: 可继续，但建议修正，例如 freshness 不确定、owner 缺失、证据不充分
- `info`: 观察项或优化建议

## 5. 中文结论模板

### ready

```text
当前产物已达到继续推进的最低要求，可以进入下一步。
```

### degraded

```text
当前产物基本可用，但仍存在需要尽快补齐的问题：{top_findings}。
```

### blocked

```text
当前不能继续推进，原因是：{blocking_findings}。
建议先处理这些问题，再继续后续步骤。
```
