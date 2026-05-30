# 编码风格约定(Coding Conventions)

> 由 onboard 阶段的 arch-constraint-miner **从代码统计**产出(多数派一致的团队习惯,与坏味道相反)。
> 人确认后 **升级进规范层**(naming.md / banned-patterns.md 等),成为 design 的硬约束。
> 关键指标:一致度(match_rate)。95% = 强约定;60% = 只是倾向,不该强制。
> 本文档默认中文,代码标识符保留英文。

## 统计的约定类型

命名约定 / 错误处理约定 / 目录分层约定 / 状态管理与数据获取约定 / 测试约定 / 依赖选型约定。

## 约定清单(按一致度排序)

### CON-NNN:{约定标题}
- 约束:{事实上的团队约定,如 "service 类统一命名为 XxxService"}
- 依据:{统计事实}
- 一致度:{0-1,如 0.95}
- 例外:{不符合的少数,如 "src/legacy/OldSvc.ts"}
- 证据等级:observed | confirmed | inferred | uncertain | conflicted
- 状态:proposed | confirmed | rejected | adjusted
- 来源:ai-mined
- 升级目标:{确认后并入哪个规范层文件,如 naming.md}

---

示例:

### CON-060:service 统一 XxxService 命名
- 约束:领域服务类统一以 `Service` 结尾命名
- 依据:全仓 42 处 service 类,40 处命中
- 一致度:0.95
- 例外:`src/legacy/Billing.ts`、`src/legacy/Pay.ts`
- 证据等级:observed
- 状态:proposed
- 来源:ai-mined
- 升级目标:naming.md
