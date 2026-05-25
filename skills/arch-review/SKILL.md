---
name: arch-review
description: |
  内部架构评审 gate。默认不直接暴露给用户，供 `onboard`、`design`、`audit`、`brief` 内部调用。负责 specs 审视、CR 审视、可选 drift audit，并生成 readiness 与 findings。

  触发词: 内部 gate / specs review / CR review / drift audit / writeback gate

  本 skill 只识别问题，不修问题，不写代码。
---

# arch-review

## 角色定位

- `specs` 模式：审视当前基线是否完整、可信、过期。
- `cr` 模式：审视某次变更是否可进入实现或 writeback。
- `drift` 模式：对照代码变化验证 specs 是否偏离现实。

## 输入

- `mode=specs|cr|drift`
- `specs/*.yaml`
- 可选 `change-requests/CR-*`
- 可选 Git diff / 代码仓

## 输出

- `change-requests/CR-*/review.yaml` 或内部 review 结果
- 中文结论与下一步建议

## 审视重点

### specs 模式

- 4+1 视图覆盖
- `freshness_status`
- 风险与技术债是否可用
- evidence closure
- known unknowns 是否被掩盖

### cr 模式

- impact 是否完整
- 数据模型变化与回滚是否可执行
- writeback 目标是否明确
- 是否违反 org KB

### drift 模式

- 中间 commit 变更是否命中架构敏感文件
- specs 是否与代码结构失配

## 硬规则

1. 所有 findings 都要有 `evidence_refs`。
2. `readiness` 只能是 `ready / degraded / blocked`。
3. `audit` 发现 stale 或 unknown 时必须用中文建议 refresh。
4. 不允许用“没有发现问题”掩盖证据不足。

## 验收

- `review.yaml` 通过 `internal/schemas/cr-review.schema.json`（CR 场景）
- readiness 与 findings 一致
- 用户可见结论是中文

## 降级

- 无 Git：不能做强 drift 结论，只能给 `unknown`
- org KB 未配置：标记但不中断

## Write Scope

完整定义见 `internal/tool-contracts/write-scope.yaml#skills.arch-review`。

**核心原则**: arch-review **只识别问题,不修问题**。

| mode | ✅ 可写 | ❌ 禁写 |
|---|---|---|
| `specs` | **无文件落盘**(findings 通过 returns_to_workflow 给 workflow) | 全部 |
| `cr` | `change-requests/${active_cr}/review.yaml`(schema validate pass;readiness=ready 后禁重写) | 同 CR 内 cr.md / impact.yaml / options.md / traceability.yaml · 其他 CR · `specs/**` · `decisions/**` · `generated/**` · `state.yaml` |
| `drift` | **无文件落盘** | 全部 |

### state_delta
```yaml
state_delta:
  current_phase: specs_review | cr_review | drift_audit
  history_append:
    at: "..."
    action: review_completed
    mode: specs|cr|drift
    readiness: ready|degraded|blocked
    findings_count: N
```

## 参考

- `docs/spec-v1.0.md`
- `internal/tool-contracts/write-scope.yaml`
- `internal/acceptance/audit.yaml`
- `internal/acceptance/design.yaml`
- `references/review-playbook.md`
- `references/specs-review-rubric.md`
- `references/drift-heuristics.md`
