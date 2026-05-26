---
name: arch-workflow
description: |
  架构知识工作流编排器。对用户只暴露 4 个入口：`onboard / design / audit / brief`。负责创建/恢复 `arch/{project}/` 工作区，编排 `arch-analyze`、`arch-frame`、`arch-diff-judge`、`arch-review`、`arch-pack`、`arch-diagram`、`arch-adr`、`arch-options` 等内部能力，并维护 `state.yaml`、acceptance gate、freshness 提示与 writeback 历史。

  触发词:
  - onboard: 接手 / 摸熟 / 全景 / baseline / 先看现状 / 建立架构基线
  - design: 根据 PRD 设计 / 设计这次变更 / 需求怎么落架构 / 开 CR
  - audit: 审视架构 / 审计 / 看看 specs 过没过期 / refresh 要不要跑
  - brief: 出 wiki / 出汇报 / 给 CTO 看 / 整理一份说明

  本 skill 只编排，不写业务代码，不生成 IaC / DDL / CI / 服务骨架。
---

# arch-workflow

## 角色定位

- 面向用户的统一入口。
- 维护 `arch/{project}/state.yaml`。
- 让内部 skill 在正确时机跑正确的动作。
- 在每个用户入口结束时执行 acceptance。

## 用户可见入口

### `/arch-onboard`

目标：建立或刷新 `specs/`。

默认链路：
1. 创建或恢复 `arch/{project}/`
2. 跑 `arch-analyze --mode=baseline-refresh`
3. 跑 `arch-diagram --source=specs`
4. 跑内部 `arch-review --mode=specs`
5. 需要人类视图时，调 `arch-pack --audience=onboarding`

### `/arch-design`

目标：围绕一次需求创建 `change-requests/CR-*`。

默认链路：
1. `arch-frame`
2. 检查 `specs/baseline.yaml.freshness_status`
3. 必要时建议先 refresh
4. `arch-diff-judge`
5. 条件运行 `arch-options`
6. 条件运行 `arch-adr`
7. `arch-review --mode=cr`
8. 产出 writeback proposal

### `/arch-audit`

目标：在不默认扫描全仓的前提下，审视当前 `specs` 是否可信。

默认链路：
1. `arch-review --mode=specs`
2. 如果 `freshness_status=stale|unknown`，用中文提示建议 refresh
3. 只有用户确认时才调 `arch-analyze --mode=drift-audit`

### `/arch-brief`

目标：从已有 `specs / CR / ADR` 生成给人看的视图。

默认链路：
1. 选择来源：`specs`、某个 CR、或 ADR 集合
2. `arch-pack`
3. 必要时 `arch-diagram --source=generated-view`
4. 内部 review 检查“没有发明新事实”

## 状态管理

`state.yaml` 至少维护：

- `project`
- `public_entry`
- `current_phase`
- `status`
- `active_cr`
- `kb_loaded`
- `history`
- `overrides`
- `pending_actions`
- `suggested_next_action`

## 编排规则

1. 所有用户可见提示默认中文。
2. `review` 不单独暴露给用户，作为内部 gate 存在。
3. `audit` 默认不扫全仓，只读 `specs/`。
4. 任何 `design` 在 `specs` 明显过期时都必须给 refresh 建议。
5. `brief` 只能重组现有事实，不能补写新事实。
6. 遇到禁止产物请求时必须拒绝。

## 断点续跑

- 若 `state.yaml` 存在，则从 `current_phase` 恢复。
- 若存在 `active_cr`，`design` 默认续跑该 CR。
- 若上次停在 `blocked`，先向用户说明阻塞原因，再决定是否重试。

## Acceptance

- `onboard` 对应 `internal/acceptance/onboard.yaml`
- `design` 对应 `internal/acceptance/design.yaml`
- `audit` 对应 `internal/acceptance/audit.yaml`
- `brief` 对应 `internal/acceptance/brief.yaml`

流程：
1. 先跑 structural checks
2. 再跑 semantic checks
3. 失败后最多 retry 2 次
4. 第三次失败升级为用户决策

## 降级

- `org KB` 不存在：继续，但在 `state.yaml.kb_loaded` 里标 `not_configured`
- `specs` 缺文件：提示先跑 `/arch-onboard`
- Git 不可用：`freshness_status=unknown`，降级为内容完整性审视
- fireworks 不可用：图降级为 Mermaid

## Write Scope(权限契约)

完整定义见 `internal/tool-contracts/write-scope.yaml#skills.arch-workflow`。

- ✅ **唯一可写**: `state.yaml`(全字段;`history` / `overrides` 仅 append) · `.metrics.jsonl`(仅 append)
- 🔍 可读: 全工作区 + KB
- ❌ 禁写: `specs/**` / `decisions/**` / `change-requests/**` / `generated/**`

### state_delta merge 协议

`arch-workflow` 是 **`state.yaml` 的唯一 writer**。其他 skill 在产出最后**必须**返回 `state_delta`,workflow 合并写入。所有字段名对齐 `internal/schemas/state.schema.json`。

```yaml
# arch-frame 返回示例
state_delta:
  active_cr: "CR-2026-003-shortlink-rate-limit"
  kb_loaded: {banned_patterns: loaded, ...}
  current_phase: cr_frame
  history_append:                    # → state.yaml.history[] (append-only)
    ts: "2026-05-25T..."
    skill: arch-frame
    action: cr_created
    status: ok
    ref: {cr_id: "CR-2026-003-shortlink-rate-limit"}
  overrides_append:                  # 可选 → state.yaml.overrides[]
    ts: "2026-05-25T..."
    scope: "HARD_GATE"
    reason: "用户授权跳过缺失 NFR 校验"
    by: "user"
```

字段规约(详见 `state.schema.json`):
- `history[].{ts, skill, action}` 必填;`{phase, status, summary, ref}` 可选
- `overrides[].{ts, scope, reason}` 必填;`{by}` 可选

workflow 合并规则:
1. 验证字段是否在 `state.schema.json` 允许范围
2. `history` / `overrides` 字段**仅追加**,不覆盖既有
3. 合并冲突 → 拒绝 + 给出冲突字段名,要求子 skill 修正
4. 合并成功 → 写盘 + `.metrics.jsonl` 留痕

### Dispatch 时记录 allowed_writes

每次 dispatch 子 skill 前,在 `.metrics.jsonl` 写一条:

```json
{"ts":"...","action":"dispatch","skill":"arch-analyze","mode":"baseline-refresh","allowed_writes":["specs/baseline.yaml","specs/quality.yaml","..."],"active_cr":null}
```

acceptance 的 `no_writes_outside_scope` check 用 git diff 与这些记录对比,任何越界 = 失败。

## 参考

- `docs/spec-v1.0.md`
- `internal/schemas/MANIFEST.md`
- `internal/schemas/state.schema.json`
- `internal/tool-contracts/write-scope.yaml`
- `internal/acceptance/*.yaml`
- `internal/phases/eval-design.md`
- `references/workflow-playbook.md`
