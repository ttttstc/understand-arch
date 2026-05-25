# arch-diff-judge Impact Playbook

## 1. 必评维度

- services
- modules
- apis
- data_models
- events_messages
- permissions
- deployments
- configs

每一维都必须显式输出“有影响”或 `no_impact`。

## 2. scope boundary 写法

- `must_change`: 不改就做不成
- `may_change`: 当前方案大概率会改，但存在别的选择
- `should_not_change`: 这次不应波及的部分

## 3. 数据模型变化最小要求

每个 data model 变化都要说明：

- `migration`
- `backfill`
- `compatibility`
- `rollback_strategy`

## 4. 回滚策略最低标准

不能只写“revert PR”。

至少要回答：

- 代码如何回退
- 配置如何回退
- 数据如何处理
- 发布顺序如何逆转或止损

## 5. derived risks 触发条件

- 新增跨边界依赖
- 新增共享数据写路径
- 新增单点外部依赖
- 新增不可逆数据步骤
- 新增复杂发布顺序

更细规则见 `change-induced-risk-rubric.md`。
