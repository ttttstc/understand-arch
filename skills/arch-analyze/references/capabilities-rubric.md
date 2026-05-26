# 业务能力抽取手册

> 约束 `arch-analyze` 如何从代码 + README + PRD 抽取 `specs/baseline.yaml#capabilities[]`(v1.0 收敛:内嵌于 baseline,不再独立 `specs/capabilities.yaml`),避免:
>
> - 把"组件"当能力(eg. 写"order-service" 当能力)
> - 把"技术动作"当能力(eg. 写"调用第三方 API" 当能力)
> - 漏掉真存在但无独立组件的能力(eg. "导出报表"散在多个 component 内)
> - 把"潜在但未实现"的能力当已有

## 1. 什么算业务能力

业务能力 = **系统对外提供的、用户/客户/上游可感知的"做某件事"的能力**。

判定要点:

- 一句话能讲清"系统能干什么"(对外视角,不是对内的技术动作)
- 离开实现细节也成立(更换技术栈不影响能力是否存在)
- 通常对应业务部门的关切(产品 / 运营 / 销售能说"我要这个能力")

### ✅ 算能力的例子

- 订阅计费(认识用户的计费周期、扣款、提醒、续费)
- 内容推荐(根据用户历史推送他可能感兴趣的内容)
- 库存盘点(在指定时间点冻结库存做对账)
- 风控判定(对每笔订单输出风险评分)
- 客服工单流转(从受理到关闭的状态机)
- 用户身份认证
- 文件上传到云存储
- 多语言切换
- 移动端推送

### ❌ 不算能力(常见误判)

| 错误归类 | 为什么不是能力 | 正确归类 |
|---|---|---|
| `payment-service` | 是组件名,不是能力 | 该组件**承载**的"订阅计费 / 一次性收款 / 退款" 才是能力 |
| `调用 Stripe API` | 是技术动作 | "国际信用卡收款" 是能力,Stripe 是其实现 |
| `Redis 缓存` | 是基础设施 | "毫秒级 token 校验" 是能力,Redis 是其实现 |
| `日志聚合` | 是横切关切 | 若日志聚合直接给业务用(eg. 客服查询用户操作),则"用户行为查询"是能力;否则不算 |
| `JWT 鉴权` | 是技术方案 | "用户身份认证" 是能力 |

## 2. 抽取来源(信号强度从高到低)

1. **README / docs/** — 项目自述中描述"系统能做什么"的段落(强信号)
2. **产品文档 / PRD** — 若 `${ARCH_PROJECT_DIR}` 下有 product docs,直接抽
3. **路由 / 入口点** — `routes/*` / `controllers/*` / API 接口名(以业务动词命名的接口往往映射一个能力)
4. **顶层目录命名** — `src/billing/` / `src/recommendation/` 等业务域命名的目录
5. **CR 历史 / ADR** — 已落 ADR 中提到的能力域
6. **测试用例命名** — `describe('subscription billing')` 等 BDD 风格测试名

如以上信号都不充分,**不要硬抽**;留 `known_unknowns` 并提示用户补 PRD。

## 3. 字段填写规则

### `id`

`CAP-NNN` 三位连续编号。新增能力总是 max(existing) + 1。

### `name`

中文优先,2-6 字最佳。例:"订阅计费"、"内容推荐"、"风控判定"。

### `description`

一句话(≤30 字),说明该能力对业务的价值。**对内视角不算**(不写"提供 REST API 让客户端访问账户信息" — 太技术;写"用户能查询自己的账户状态")。

### `category`(可选)

业务域分组。同 category 在汇报时聚合到同一 slide。常见:

- 账务 / 用户 / 内容 / 推送 / 协同 / 风控 / 运营 / 数据 / 基础设施

### `importance`

| 值 | 判定 |
|---|---|
| `core` | 挂了整个业务不能跑(eg. 电商的"下单") |
| `supporting` | 挂了业务降级但能跑(eg. "推荐" — 没推荐用户可以自己搜) |
| `peripheral` | 挂了用户基本无感(eg. "管理后台导出报表") |

如有疑问,问"如果这能力消失 24h,业务方会怎么反应?"全员告警 = core;部分团队抱怨 = supporting;无人提及 = peripheral。

### `maturity`

| 值 | 判定 |
|---|---|
| `mature` | 上线 ≥3 个月,无重大 incident,SLA 达标 |
| `evolving` | 上线但仍活跃迭代,有已知改进点 |
| `experimental` | 灰度 / 内测 / 小流量验证中 |
| `deprecated` | 计划下线但还在跑(看 ADR / CR) |
| `missing` | **PRD/README 提到但未实现**(典型 gap 信号) |

### `supporting_components[]`

- `component`: 必须是 `baseline.yaml#components` 里存在的名字。若不在,**说明你创了野组件**,先回去补 components
- `role`:
  - `primary` — 业务流的主路径必经组件(一般 1-2 个)
  - `secondary` — 主路径调用的辅助组件
  - `shared` — 横切共享(eg. auth / logging / monitoring)

`maturity: missing` 时可以为空数组,表示能力被识别但未实现。

### `user_facing`

- `true` — 最终用户(产品的 customer / end user)能感知该能力是否存在
- `false` — 内部基础设施级(eg. "异步任务队列""灰度切流")

汇报给业务方时优先列 `user_facing: true` 的能力。

### `gaps[]`

本能力当前的缺陷,**必须可关联到 risks.yaml#risks 或 open_questions**:

```yaml
gaps:
  - description: "回滚能力不足:订阅扣款后无法自动退款"
    related_risks: ["R-007"]
    related_open_questions: ["Q-003"]
```

### `external_dependencies[]`

本能力依赖的外部系统名(必须存在于 `baseline.yaml#external_dependencies`)。

## 4. 输出双写

v1.0 收敛:抽取结果**直接写 `specs/baseline.yaml#capabilities[]`**(全字段内嵌),不再产独立的 `specs/capabilities.yaml`,杜绝索引同步漂移。

## 5. 增量更新规则

- onboard 首跑:全量抽取
- baseline-refresh:对比代码新增 component / 新 API / 新业务域目录 → 候选新能力 → **必须人工 review** 后才追加(防止机器幻觉造一堆 "rest-api-handler" 类伪能力)
- design CR 引入新能力:由 `arch-frame` 在 cr.md 里点明 "新增能力 CAP-NNN: xxx",writeback 时由 workflow append 进 baseline.yaml#capabilities[]

## 6. 最小可用门槛

onboard 收尾要求:

- `capabilities[]` 至少包含 **3 条 user_facing=true** 的能力(否则项目要么太小、要么 PRD 信号不足,标 known_unknowns)
- 每条能力的 `supporting_components` 引用都能在 `baseline.yaml#components` 找到(引用完整性)
- 每条 `gaps[]` 引用的 `R-NNN` 都能在 `risks.yaml#risks` 找到(引用完整性)

## 7. 反模式

| 反模式 | 后果 | 修法 |
|---|---|---|
| 把每个 service 当能力(`CAP-001=order-service`) | 颗粒度错;能力数量 = 组件数量 = 没增量信息 | 重抽:从"系统能干什么"反推 |
| 一条能力堆 ≥10 个 supporting_components | 颗粒度过粗;能力定义太大 | 拆分;eg. "支付" 拆成 "订阅计费 / 一次性收款 / 退款 / 跨币种结算" |
| 全是 user_facing=true,无 false | 缺基础设施级能力识别(eg. "异步任务队列") | 补内部能力 |
| 能力清单与 README 描述不一致 | LLM 抽取偏离 PRD | 优先信任 README;baseline.yaml#capabilities[] 必须能找到 README 的对应描述 |
| `maturity: missing` 而无 gap 描述 | 标了 gap 但没说为什么 missing | 必须在 gaps[] 写清"why missing + 业务影响" |

## 8. 给汇报的辅助

抽取完成后,`generated/overview.md` 第 4 段"主要仓库与组件"可以追加一行能力摘要(eg. "本系统覆盖 8 个业务能力,3 core / 4 supporting / 1 peripheral;1 项 gap 待补");详情留 `generated/wiki/06-能力雷达.md`(audience=onboarding 时产)。
