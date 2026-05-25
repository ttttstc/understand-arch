---
name: arch-frame
description: |
  变更界定器。把 PRD、需求描述、issue 或口头诉求整理成 `change-requests/CR-*/cr.md`，并在 design 前加载 org KB、识别非目标、NFR、验收标准与关键未知项。必要时阻塞设计，先让用户补齐信息。

  触发词: 框定需求 / 先定义这次变更 / 开一个 CR / PRD 先收敛一下 / 这需求边界是什么

  本 skill 不扫描代码，不产架构现状事实，不做影响面推理。
---

# arch-frame

## 角色定位

- 回答“这次要改什么，为什么改”。
- 创建 CR 入口。
- 加载 org KB，为后续设计和评审注入约束。

## 输入

- PRD / issue / 用户对话
- `${ARCH_PROJECT_DIR}`
- 可选 `cr_slug`

## 输出

- `change-requests/CR-YYYY-NNN-{slug}/cr.md`
- `state.yaml` 中的 `active_cr`、`kb_loaded`、`current_phase`
- 必要时产生阻塞问题列表

## `cr.md` 最低结构

1. 背景与目标
2. 范围
3. 明确不做的事
4. 验收标准
5. NFR
6. 关键依赖与上下游
7. 已知未知项

## org KB 加载

读取：

- `banned-patterns.yaml`
- `compliance-redlines.yaml`
- `network-boundaries.yaml`
- `naming-conventions.yaml`
- `tech-radar.yaml`

规则：

- 缺目录：标 `not_configured`
- 缺单文件：标 `not_loaded`
- schema 错：阻塞并提示用户修复

## 阻塞条件

出现以下情况时，默认阻塞 `design`：

- 验收标准不可验证
- non-goals 缺失
- NFR 完全缺位
- 上下游依赖不清
- 关键数据/权限边界不清

## 硬规则

1. 用户可见提示默认中文。
2. non-goals 必须显式写出。
3. 不能把模糊需求直接放进 `arch-diff-judge`。
4. org KB schema 错必须 fail loud。

## 验收

- `cr.md` 已建立，且最小结构完整
- `state.yaml.active_cr` 已通过 state_delta 请求更新(arch-workflow 实际写入)
- `kb_loaded` 状态准确
- 阻塞时给出具体中文问题，不给空泛建议

## 降级

- 输入只有一句自然语言：允许先建轻量 CR，再提示用户补充
- 用户坚持不回答：允许继续，但在 `cr.md` 内部留痕,并通过 state_delta.overrides_append 请求 workflow 写入

## Write Scope

完整定义见 `internal/tool-contracts/write-scope.yaml#skills.arch-frame`。

- ✅ 可写: `change-requests/${active_cr}/cr.md`(仅当前 active_cr)
- ❌ 禁写: `state.yaml`(走 state_delta) · `specs/**` · `decisions/**` · `generated/**` · 其他 CR 目录

### state_delta(返 workflow)

字段对齐 `internal/schemas/state.schema.json`(`history[]` 必填 `ts/skill/action`,可选 `phase/status/summary/ref`;`overrides[]` 必填 `ts/scope/reason`,可选 `by`)。

```yaml
state_delta:
  active_cr: "CR-2026-NNN-{slug}"
  kb_loaded: {banned_patterns, compliance_redlines, network_boundaries, naming_conventions, tech_radar}
  current_phase: cr_frame
  history_append:
    ts: "2026-05-25T..."
    skill: arch-frame
    action: cr_created
    status: ok
    ref: {cr_id: "CR-2026-NNN-{slug}"}
  overrides_append:                       # 仅在用户跳过 HARD GATE 等场景
    ts: "2026-05-25T..."
    scope: "HARD_GATE"
    reason: "用户确认在 NFR 不完整下继续进入 design"
    by: "user"
```

## 参考

- `docs/spec-v1.0.md`
- `internal/schemas/state.schema.json`
- `internal/tool-contracts/write-scope.yaml`
- `internal/acceptance/design.yaml`
- `references/frame-playbook.md`
