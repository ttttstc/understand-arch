# {项目名} — 架构工作区入口

> 由 `arch-workflow` 在每次 mode 跑完后自动刷新。**这是你应该最先看的文件。**

## 当前状态

| 字段 | 值 |
|---|---|
| Mode 上次跑 | <onboard / audit / design / brief> |
| Phase | <phase 名> · <pending / in_progress / done / degraded / blocked> |
| Baseline | <repo@commit> |
| 上次刷新 | <ISO 8601> |
| Acceptance | <pass / 7-of-8 / fail> |
| Degraded? | <true / false> · 原因: <一行简述,详见 agent/状态.yaml#degraded_reasons> |

## 健康度速读

(每次刷新由 arch-pack 从 audit / risk 数据汇总到这里 ≤5 行)

- 总体: <X / 5>(<一句话评价>)
- 高优风险数: <N>
- 待答问题数: <N>
- 已落 ADR: <N>

## 全部产物导航

### 📚 持续更新

- [`知识库/`](知识库/) — 7 页架构知识库(首页 + 6 主题页);**新接手看这个**
- [`架构图/`](架构图/) — Container / 关键 flow 序列图

### 🧾 决策与设计史(append-only)

- [`决策史/`](决策史/) — ADR 文件
- [`设计变更/`](设计变更/) — 每次变更一目录(设计文档 + 实施方案 + 评审报告)

### 📋 阶段性输出(append-only)

- [`审计/`](审计/) — `{date}-体检.md` / `{date}-评审-{topic}.md` / `{date}-PR评审-{pr-id}.md`
- [`汇报/`](汇报/) — `{date}-{audience}.md`(管理层 / 决策层 / 开发者 / 入职)

## 给执行者(写过 PR 的人)看的

- 我现在要改 X → 看 [设计变更/](设计变更/) 找最近的 change 目录,read 设计文档 + 实施方案
- 我要 review PR → 用 `/arch-review --mode=code`,产物落 [审计/](审计/)
- 我要做架构汇报 → 用 `/arch:brief --audience=management`,产物落 [汇报/](汇报/)

## 给引擎 / 高级用户看的

- [`../agent/`](../agent/) — workflow 状态 + 5+1 yaml 证据 + override 审计 + 指标
- 这部分通常人不需要看;但**审计追溯/调 prompt** 时是真理源
