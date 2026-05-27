---
name: arch-frame
description: |
  arch-design 的内部前置门。澄清 PRD、约束范围、初始化 CR.md frontmatter 与第 1 段背景。
---

# arch-frame

## 定位

`arch-frame` 负责让需求足够清楚再进入方案设计。它只创建或更新 CR.md 的 frontmatter 与“背景与目标”段,不做影响面分析。

## Hard Gate

缺少以下信息时必须先中文追问或生成 `PM问题清单.md`:

- 业务目标与成功标准。
- in scope / non-goals。
- 受影响用户或系统。
- 时间、合规、兼容、回滚约束。
- 已知不能动的边界。

## 写权限

允许写 `change-requests/CR-*/PM问题清单.md` 与 `change-requests/CR-*/CR.md` 的初始化部分;禁止写 specs、wiki、decisions。

