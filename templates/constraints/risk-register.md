# 风险登记册(Risk Register)

> 约束层文件。声明高风险区域 + 高风险变更规则 —— AI 不知道哪里危险,除非告诉它。
> 来源:机器考古(复杂度热点/缺陷聚集)+ 访谈补"出过什么事故"。
> 本文档默认中文,代码标识符保留英文。

## 高风险区域

### CON-NNN:{区域标题}
- 约束:{该区域的变更约束,如 "payment timeout handling 任何修改必须人工 review + 回归测试 + rollback 方案"}
- 依据:{代码事实 / 事故历史}
- 证据等级:observed | inferred | confirmed | uncertain | conflicted
- 违反检测:{如 CI 规则要求该路径 PR 必须带指定 reviewer}
- 状态:proposed | confirmed | rejected | adjusted
- 来源:ai-mined | interview | human
- 备注:{}

---

示例(已确认):

### CON-040:支付超时处理为高风险区
- 约束:services/payment 的 timeout 处理逻辑任何修改必须:1) 生成设计说明 2) 补回归测试 3) 人工 reviewer 审查 4) 提供 rollback 方案
- 依据:`api::module:payment`;2019 timeout 事故
- 证据等级:confirmed
- 违反检测:CI 规则 `require-review: services/payment/**`
- 状态:confirmed
- 来源:interview
- 备注:受访人 王五;关联 ADR-003、SF-008
