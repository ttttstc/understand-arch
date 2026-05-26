---
name: arch-design
description: |
  围绕一次需求 / 变更创建 `change-requests/CR-*/`:产 `cr.md`(需求 + 设计入口)+ `impact.yaml`(8 维影响面)+ 条件 `options.md`(方案分歧时)+ 条件 ADR(durable decision)+ `review.yaml`(readiness gate)+ writeback 计划。是设计单次架构变更的入口。

  触发词: 根据 PRD 设计 / 设计这次变更 / 需求怎么落架构 / 开 CR / 出 RFC / 出实施方案 / /arch-design

  本 skill 不写业务代码。委托 arch-workflow 协调全流程。
---

# arch-design — 创建 CR 设计单次变更

> 用户级入口 skill(thin wrapper)。实际编排走 `arch-workflow` mode=design。

## 用户怎么用

```text
/arch-design <PRD 或需求描述>
```

或自然语言:

- "根据这份 PRD 设计架构"
- "我想加 X 能力,设计一下"
- "开个 CR 重构计费模块"

## 收到调用后做什么

1. 把 mode=design 委托给 `arch-workflow`
2. workflow 链路:
   - `arch-frame` 创建 CR(HARD GATE PRD 模糊时阻塞)
   - 检查 specs freshness,stale 时用中文提示
   - `arch-diff-judge` 产 impact.yaml
   - 真实方案分歧时调 `arch-options`
   - durable decision 时调 `arch-adr`
   - `arch-review` mode=cr 跑 readiness gate
3. acceptance 按 `internal/acceptance/design.yaml`

## 不属于本 skill

- 建立基线 → `/arch-onboard`
- 审视基线 → `/arch-audit`
- 生成汇报 → `/arch-brief`

## 参考

- `skills/arch-workflow/SKILL.md`
- `skills/arch-frame/SKILL.md`
- `skills/arch-diff-judge/SKILL.md`
- `internal/acceptance/design.yaml`
