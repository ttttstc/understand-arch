---
name: arch-onboard
description: |
  建立或刷新当前项目的架构基线 specs/。扫描代码仓 → 产 `specs/baseline.yaml` + `quality.yaml` + `risks.yaml` + `decisions.yaml` + `traceability.yaml` + 稳定 Mermaid 图,并自动计算 `freshness_status`。是新接手项目或定期重建基线时的入口。

  触发词: 接手 / 摸熟 / 全景 / baseline / 先看现状 / 建立架构基线 / 给个 overview / 这是个什么系统 / refresh specs / 更新基线 / /arch-onboard

  本 skill 不写业务代码,不生成 IaC / DDL / CI / 服务骨架。委托 arch-workflow 协调全流程。
---

# arch-onboard — 建立/刷新架构基线

> 用户级入口 skill(thin wrapper)。实际编排走 `arch-workflow` mode=onboard。

## 用户怎么用

```text
/arch-onboard
```

或自然语言:

- "帮我看懂这套系统"
- "给这个仓库建一份架构基线"
- "刷新 specs"

## 收到调用后做什么

1. 把 mode=onboard 委托给 `arch-workflow`
2. workflow 按 `internal/acceptance/onboard.yaml` 执行 acceptance loop
3. 关键产物:
   - `specs/baseline.yaml`(含内嵌 capabilities[] 字段)
   - `specs/quality.yaml`
   - `specs/risks.yaml`
   - `specs/decisions.yaml`
   - `specs/traceability.yaml`
   - `specs/diagrams/*.mmd`
   - `generated/overview.md`(1 页稳定入口)
   - `generated/wiki/01-06.md`(6 页 onboarding 展开)

## 不属于本 skill

- 设计单次变更 → `/arch-design`
- 审视已有 specs 可信度 → `/arch-audit`
- 生成给人看的 wiki/brief → `/arch-brief`

## 参考

- `skills/arch-workflow/SKILL.md`(协调器,本 skill 委托给它)
- `docs/spec-v1.0.md` § 用户暴露面
- `internal/acceptance/onboard.yaml`
