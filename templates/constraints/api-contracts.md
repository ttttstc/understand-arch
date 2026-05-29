# 接口契约(API Contracts)

> 约束层文件。声明接口的语义承诺(幂等/错误处理/禁止暴露)——字段一致不等于行为一致。
> 来源:机器考古(从代码反推实际的幂等/错误处理模式)+ 访谈确认承诺。
> 本文档默认中文,代码标识符保留英文。

## 约束清单

### CON-NNN:{约束标题}
- 约束:{接口语义承诺,如 "POST /v1/invoices/{id}/pay 必须幂等"}
- 依据:{代码事实 / 接口节点 id}
- 证据等级:observed | inferred | confirmed | uncertain | conflicted
- 违反检测:{可执行命令,如 `pnpm test contract:payment-api`}
- 状态:proposed | confirmed | rejected | adjusted
- 来源:ai-mined | interview | human
- 备注:{}

---

示例(已确认):

### CON-030:支付接口幂等 + timeout 不得标 failed
- 约束:POST /v1/invoices/{id}/pay 相同幂等键重复请求返回同一 payment_id;网关 timeout 记为 unknown,不得自动标 failed
- 依据:`api::endpoint:POST /v1/invoices/{id}/pay`;现有 timeout 分支走 unknown
- 证据等级:confirmed
- 违反检测:`pnpm test contract:payment-api`
- 状态:confirmed
- 来源:interview
- 备注:受访人 李四;源于 ADR-003(timeout 后可能实际扣款成功)
