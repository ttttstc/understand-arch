---
name: arch-options
description: |
  条件式方案对比器。仅当某次 CR 存在真实架构分歧时运行，生成 `change-requests/CR-*/options.md`，并显式比较影响面、依赖变化、数据模型变化、回滚路径以及 org KB 约束。

  触发词: 给我几个方案 / 这个需求怎么选 / 方案对比 / trade-off

  本 skill 不默认进入主链，不替用户做最后拍板。
---

# arch-options

## 角色定位

- 只在存在真实分歧时运行。
- 不把“一个显而易见的实现选择”包装成多方案。

## 输入

- `cr.md`
- `impact.yaml`
- `specs/`
- org KB

## 输出

- `change-requests/CR-*/options.md`

## 硬规则

1. 没有真实分歧时不要硬造两套方案。
2. 若给多个方案，必须明确比较:
   - 影响面
   - 模块依赖变化
   - 数据模型变化
   - 回滚路径
3. 不得隐藏 KB 违规。

## 验收

- options 真有差异
- 比较维度完整
- 推荐理由清楚

## Write Scope

完整定义见 `internal/tool-contracts/write-scope.yaml#skills.arch-options`。

- ✅ 可写: `change-requests/${active_cr}/options.md`(仅当前 active_cr)
- ❌ 禁写: `state.yaml` · `specs/**` · `decisions/**` · `generated/**` · 其他 CR

### state_delta(可选,仅在产 options 时返)
```yaml
state_delta:
  history_append:
    ts: "..."
    skill: arch-options
    action: options_produced
    status: ok
    ref: {cr_id: "${active_cr}", option_count: N}
```

## 参考

- `docs/spec-v1.0.md`
- `internal/tool-contracts/write-scope.yaml`
- `internal/acceptance/design.yaml`
- `references/options-rubric.md`
- `references/options-table-template.md`
