---
name: arch-diff-judge
description: |
  单次变更影响面分析器。读取当前 CR 与 `specs/`，生成 `change-requests/CR-*/impact.yaml`，覆盖受影响服务、模块、接口、数据模型、事件、权限、部署、配置，以及 scope boundary 和 writeback 目标。

  触发词: 影响面 / blast radius / 改这个会动哪 / 数据模型会不会变 / 回滚怎么做

  本 skill 不扫描全仓建立 baseline，不给最终方案结论，不写代码。
---

# arch-diff-judge

## 角色定位

- 回答“这次变更会影响什么”。
- 以 `specs` 为基线，以 `cr.md` 为变更输入。

## 输入

- `change-requests/CR-*/cr.md`
- `specs/baseline.yaml`
- `specs/risks.yaml`
- 可选局部代码线索

## 输出

- `change-requests/CR-*/impact.yaml`

## 必须覆盖的维度

- `services`
- `modules`
- `apis`
- `data_models`
- `events_messages`
- `permissions`
- `deployments`
- `configs`

每个维度无影响也要显式写 `no_impact`。

## 特别关注

- 模块依赖变化
- 数据模型变化
- 回滚策略
- `scope_boundary.must_change / may_change / should_not_change`
- writeback 后要更新哪些 specs 文件

## 硬规则

1. 不接受没有 CR 的直接调用。
2. 不允许只输出一句“会影响多个模块”。
3. 数据模型变化必须写 migration、backfill、compatibility、rollback_strategy。
4. 每条影响都必须有 `evidence_refs`。

## 验收

- `impact.yaml` 通过 `internal/schemas/cr-impact.schema.json`
- 8 个影响维度完整
- scope boundary 三段齐全
- 回滚策略不等于“revert PR”

## 降级

- baseline 太弱：提示先 refresh specs
- 某维度证据不足：保留 best effort，但进入 derived risk 或 known unknowns

## Write Scope

完整定义见 `internal/tool-contracts/write-scope.yaml#skills.arch-diff-judge`。

- ✅ 可写: `change-requests/${active_cr}/impact.yaml`(仅当前 active_cr,schema validate pass 后才落盘)
- ❌ 禁写: `state.yaml`(走 state_delta) · `specs/**` · `decisions/**` · `generated/**` · 其他 CR

### state_delta
```yaml
state_delta:
  current_phase: impact_analysis
  history_append: {at, action: impact_produced, cr_id}
```

## 参考

- `docs/spec-v1.0.md`
- `internal/schemas/cr-impact.schema.json`
- `internal/tool-contracts/write-scope.yaml`
- `internal/acceptance/design.yaml`
- `references/impact-playbook.md`
- `references/change-induced-risk-rubric.md`
