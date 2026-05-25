---
name: arch-adr
description: |
  严格 append-only 的 ADR 记录器。只在某个决策值得长期保留时**新建** `decisions/ADR-NNN-*.md` 文件。**老 ADR markdown 文件本身永不修改** — supersede 关系全部记在 `specs/decisions.yaml#superseded[]`,由 arch-workflow 写入。不记录每一次实现细节,只记录 durable decision。

  触发词: 记个 ADR / 这个决定值得留下来 / 架构决策记录

  本 skill 不替用户做决策,不修改既有 ADR 内容。
---

# arch-adr

## 角色定位

- 记录跨 CR、会长期影响未来设计的决策
- **严格 append-only**:老 ADR 文件 commit 后永远只读
- supersede 关系不写进老 ADR markdown(避免修改),走 `decisions.yaml#superseded[]`

## 输入

- 当前 CR(`change-requests/${active_cr}/cr.md`)
- 选定方案(从 cr.md 或 options.md)
- 相关证据(`specs/*.yaml`)

## 输出

仅以下两件:

1. **新文件**: `decisions/ADR-NNN-{slug}.md`(NNN 三位连续编号)
2. **state_delta + decisions.yaml delta**(交给 workflow 写入,本 skill 不直接写 `specs/decisions.yaml`)

## 硬规则

1. **编号连续**:NNN = max(existing) + 1
2. **老 ADR markdown 文件绝不修改 / 删除**(包括"加 supersede 头部"也禁止)
3. 决策必须有 `evidence_refs` 支撑
4. 非 durable 的内容不硬写 ADR(参考 `references/adr-playbook.md#不该写 ADR 的内容`)
5. supersede 时:
   - 新 ADR 自身记录 `Supersedes: ADR-OLD`(在新文件 frontmatter)
   - 老 ADR markdown 文件 **不动**
   - arch-adr 在返回值里带 `decisions_index_delta.superseded_append`,workflow 写入 `decisions.yaml`

## ADR 模板

新建 ADR 必须套 `references/adr-template.md`,保留:

- `Supersedes:` 字段(supersede 时填,否则 `null`)
- `Supersede Notes`(可选段)
- `v1.1 Fitness Spec Placeholder`(预留)

## 验收

- 新文件编号连续
- 老 ADR 文件未被修改(git diff 验证)
- 新 ADR 含 evidence_refs
- supersede 关系通过 `decisions_index_delta` 而非修改老 ADR 实现

## 降级

- 编号冲突(并发场景):重试一次,仍冲突 → 报错给用户人工分配
- evidence 不足:不写 ADR,改回 cr.md 内 "Decision Log" 段(实现层取舍走 CR,不走 ADR)

## Write Scope

完整定义见 `internal/tool-contracts/write-scope.yaml#skills.arch-adr`。

- ✅ **只能新建** `decisions/ADR-NNN-*.md`(三位连续编号)
- ❌ **严格禁修改** 任何已存在的 `decisions/ADR-*.md` 文件正文(append-only 真意)
- ❌ 禁写 `specs/decisions.yaml`(supersede 关系走 state_delta.decisions_index_delta,workflow 实际写入)
- ❌ 禁写 `state.yaml` / 其他 `specs/*` / `generated/**` / `change-requests/**`

### state_delta(返 workflow)

```yaml
state_delta:
  current_phase: adr_recorded
  history_append:
    at: "..."
    action: adr_added
    adr_id: "ADR-NNN"
    cr_id: "${active_cr}"
  decisions_index_delta:           # workflow 写入 specs/decisions.yaml
    accepted_append:
      - adr_id: "ADR-NNN"
        title: "..."
        accepted_at: "..."
        path: "decisions/ADR-NNN-{slug}.md"
        evidence_refs: [...]
    superseded_append:             # 仅 supersede 场景
      - old_adr_id: "ADR-OLD"
        new_adr_id: "ADR-NNN"
        at: "..."
        reason: "..."
```

workflow 收到后:
1. 验证 `accepted_append` 中 adr_id 不在既有 accepted 列表里(避免重复)
2. 验证 `superseded_append` 中 old_adr_id 存在且未被其他 ADR supersede
3. append-only 写入 `specs/decisions.yaml`,**不删除任何既有条目**

## 参考

- `docs/spec-v1.0.md`
- `internal/schemas/specs-decisions.schema.json`
- `internal/tool-contracts/write-scope.yaml`
- `references/adr-playbook.md`
- `references/adr-template.md`
