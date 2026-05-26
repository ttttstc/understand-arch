---
name: arch-brief
description: |
  从 `specs/ + CR + ADR` 生成给人看的视图:更新 `generated/overview.md`(1 页稳定入口) + 按 audience 产 onboarding wiki(6 页)或 management/engineering brief。零新事实,每条结论可回链 source artifact。

  触发词: 出 wiki / 出汇报 / 给 CTO 看 / 整理一份说明 / 给新人写个入门 / executive summary / /arch-brief

  本 skill 不创造新事实,不修 specs。委托 arch-workflow 协调全流程。
---

# arch-brief — 生成人类视图

> 用户级入口 skill(thin wrapper)。实际编排走 `arch-workflow` mode=brief。

## 用户怎么用

```text
/arch-brief --audience=onboarding
/arch-brief --audience=management
/arch-brief --audience=engineering
```

或自然语言:

- "给新人写个 wiki"
- "给 CTO 一份汇报"
- "整理一份给评审会的材料"

## 收到调用后做什么

1. 把 mode=brief 委托给 `arch-workflow`
2. workflow 链路:
   - `arch-pack` 按 audience 生成产物:
     - 任何 audience: 更新 `generated/overview.md`(11 段 ≤200 行)
     - audience=onboarding: 6 页 wiki (`generated/wiki/01-06.md`)
     - audience=management|engineering: `generated/briefs/{date}-{audience}.md`
   - 必要时 `arch-diagram` 嵌图
   - `arch-review` 检查"没有发明新事实"
3. acceptance 按 `internal/acceptance/brief.yaml`

## 不属于本 skill

- 建立或刷新基线 → `/arch-onboard`
- 设计变更 → `/arch-design`
- 审视基线 → `/arch-audit`

## 参考

- `skills/arch-workflow/SKILL.md`
- `skills/arch-pack/SKILL.md`
- `skills/arch-pack/references/overview-template.md`
- `internal/acceptance/brief.yaml`
