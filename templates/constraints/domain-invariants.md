# 领域不变量(Domain Invariants)

> 约束层文件。声明领域对象/数据"必须永远成立"的规则 —— 老代码库里最致命、最常被 AI 改坏的隐性契约。
> 来源:机器考古(从代码反推"某字段/状态实际从未被某种方式修改")+ 访谈补"为什么"。
> 本文档默认中文,代码标识符保留英文。

## 约束清单

<!-- 每条遵循约束条目结构。AI 考古给 proposed 初稿(多为 observed/inferred),人确认升 confirmed。 -->

### CON-NNN:{约束标题}
- 约束:{必须永远成立的规则,如 "Invoice 一旦 issued,amount 不可变"}
- 依据:{代码事实,如 "扫描全仓 0 处在 issued 后写 invoice.amount;node: api::model:Invoice"}
- 证据等级:observed | inferred | confirmed | uncertain | conflicted
- 违反检测:{可执行命令,如 `pnpm test contract:invoice-immutable`}
- 状态:proposed | confirmed | rejected | adjusted
- 来源:ai-mined | interview | human
- 备注:{受访人/关联 ADR/关联反常点 SF-xxx}

---

示例(已确认):

### CON-010:Invoice issued 后金额不可变
- 约束:Invoice 进入 issued 状态后,amount_due 不得修改
- 依据:代码全仓 0 处在 status==issued 后写 amount_due;`api::model:Invoice`
- 证据等级:confirmed
- 违反检测:`pnpm test contract:invoice-immutable`
- 状态:confirmed
- 来源:interview
- 备注:受访人 李四 2026-05-20;源于 2019 审计事故,见 ADR-003;关联 SF-012
