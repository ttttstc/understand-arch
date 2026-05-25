# `specs/overview.md` Template

> 用途：稳定的人类入口。只总结 `specs/*.yaml`、活跃 CR、ADR 中已经存在的事实；不创建新事实。

# {项目名} 架构基线概览

## 1. 系统是什么

- 系统目标：
- 主要用户 / 调用方：
- 当前最重要的业务场景：
- 系统边界与非目标：

## 2. 主要仓库与组件

| 仓库 / 组件 | 职责 | Owner | 关键证据 |
| --- | --- | --- | --- |
| {repo_or_component} | {responsibility} | {owner_or_unknown} | `{evidence_ref}` |

## 3. 关键接口与依赖

- 关键 API / 事件 / 消息：
- 最敏感的上下游依赖：
- 最重要的外部依赖与降级路径：

## 4. 数据与所有权

- 核心数据模型：
- 数据 owner：
- 读写边界与兼容约束：

## 5. 部署与运行约束

- 主要部署单元：
- 运行时关键约束：
- 发布 / 回滚 / 网络边界上的硬限制：

## 6. 风险与技术债

### Top 风险

1. {risk_summary} `{risk_ref}`

### Top 技术债

1. {debt_summary} `{debt_ref}`

## 7. 关键决策与近期变更

- 仍然生效的 ADR：
- 正在改变架构的活跃 CR：
- 尚未 writeback 到 specs 的变化：

## 8. 基线新鲜度与已知未知项

- `last_scanned_commit`：
- `freshness_status`：
- 当前最重要的 `known unknowns`：

## 9. 读者离开本页前应知道

- 这个系统最核心的组成是什么
- 当前最危险的地方是什么
- 哪些结论可信，哪些还需要 refresh / 调查
