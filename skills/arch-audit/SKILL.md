---
name: arch-audit
description: |
  审视当前 `specs/` 是否完整、可信、过期。默认只读 specs/,不重扫代码仓。产 `generated/audit/{date}-健康度.md` 集成视图(评分 + Top 风险 + 待答问题 + KB 漂移 + 反模式命中 + 改造路线图)。`freshness_status=stale|unknown` 时用中文建议 refresh;用户授权后可跑 drift audit 真实扫代码对比。

  触发词: 审视架构 / 审计 / 健康度 / 看看 specs 过没过期 / refresh 要不要跑 / 架构体检 / /arch-audit

  本 skill 不修问题,只识别问题。委托 arch-workflow 协调全流程。
---

# arch-audit — 审视 specs 可信度与新鲜度

> 用户级入口 skill(thin wrapper)。实际编排走 `arch-workflow` mode=audit。

## 用户怎么用

```text
/arch-audit
```

或自然语言:

- "现在的 specs 还能信么"
- "做个架构体检"
- "看看哪些地方过期了"

## 收到调用后做什么

1. 把 mode=audit 委托给 `arch-workflow`
2. workflow 链路:
   - `arch-review` mode=specs 审视基线
   - 若 freshness_status=stale|unknown,中文提示是否跑 `--drift`
   - 用户同意时调 `arch-analyze` mode=drift-audit
   - `arch-pack` 产 `generated/audit/{date}-健康度.md`(10 段集成视图)
3. acceptance 按 `internal/acceptance/audit.yaml`

## 不属于本 skill

- 建立或刷新基线 → `/arch-onboard`(或 `/arch-onboard` 后选 refresh)
- 设计变更 → `/arch-design`
- 生成汇报 → `/arch-brief`

## 参考

- `skills/arch-workflow/SKILL.md`
- `skills/arch-review/SKILL.md`
- `skills/arch-pack/references/health-check-template.md`
- `internal/acceptance/audit.yaml`
