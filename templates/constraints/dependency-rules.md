# 依赖方向规则(Dependency Rules)

> 约束层文件。声明模块间"谁不能依赖谁"——AI 为走最短路径最容易破坏的约束。
> 来源:机器考古(从代码反推"实际从不互相 import 的模块对")+ 访谈确认是否硬约束。
> 本文档默认中文,代码标识符保留英文。

## 约束清单

### CON-NNN:{约束标题}
- 约束:{依赖方向规则,如 "billing-core 不得 import payment-adapter"}
- 依据:{代码事实,如 "扫描 0 处 billing-core→payment-adapter import"}
- 证据等级:observed | inferred | confirmed | uncertain | conflicted
- 违反检测:{可执行命令,如 `depcruise --config dep.config.js services/billing-core`}
- 状态:proposed | confirmed | rejected | adjusted
- 来源:ai-mined | interview | human
- 备注:{}

---

示例(已确认):

### CON-020:billing-core 不依赖 payment-adapter
- 约束:billing-core 不得 import 或同步调用 payment-adapter
- 依据:全仓扫描无此方向依赖;`api::module:billing-core`、`api::module:payment-adapter`
- 证据等级:confirmed
- 违反检测:`depcruise --config dependency-cruiser.config.js services/billing-core`
- 状态:confirmed
- 来源:interview
- 备注:受访人 王五 2026-05-20;分层架构硬约定
