# Cost NFR Checklist

> 成本是 NFR 一等公民。`arch-design` 评估方案时**必须**含成本维度,否则会做出"技术漂亮但烧钱"的选择。

## 度量(必须可量化)

| 维度 | 指标 |
|---|---|
| 单位经济 | $ / 月活用户 · $ / 请求 · $ / GB 处理 |
| 基础设施 | 总月账单(分服务) · YoY 增长率 |
| 浪费率 | 闲置资源占比 · 过配比例 · 未用 reserved 比例 |
| 工程效率成本 | 部署 / CI / 开发环境的总时长成本 |

公司不同阶段对应不同关注:
- 早期:守住单位经济,不爆烧
- 中期:总账单增速 < 收入增速
- 后期:浪费率压到 < 10%

## 6 个常见烧钱场景

### 1. 过配 (over-provisioning)

- CPU/mem 申请远超实际使用 → autoscaling / right-sizing
- DB 实例规格过大 → 按 QPS 真实容量降配
- pre-paid 资源闲置

工具:Prometheus / Datadog / k8s VPA、cloud provider cost explorer

### 2. 闲置环境

- 测试环境 24×7 跑(实际只白天用)→ 定时启停
- 旧实验项目 / POC 长期不清理
- 死了的服务还在交账单

定期 "tag-or-die" 审计 — 没 owner / 没 cost-center tag 的资源直接关。

### 3. 数据传输 / 流量

- 跨 AZ / 跨 region / 出公网 流量贵
- CDN 命中率低 → 大量回源
- 日志 / metric 写出量未控

### 4. 数据存储分层

- 热 / 温 / 冷 数据混存于 SSD
- 不做 lifecycle policy → 老备份 / 老日志永久占贵存储
- log retention 远超合规要求

### 5. 商业 SaaS 滥用

- LLM API token 没观测,失控烧
- 监控 / 日志 SaaS 按量计费,cardinality 爆掉账单也爆
- 多人买重复工具

### 6. 不必要的实时

- 离线能跑的非要实时(batch 比 stream 便宜 5-10×)
- 99.99% 可用性需求其实只要 99.9% → 部署成本指数差

## 决策方法论

### 成本 / 价值 比

新增方案的预期成本 vs 业务价值:
- 服务 X 月烧 $5k,但带来 $20k 业务价值 → 划算
- 服务 Y 月烧 $5k,但价值不明 → 重新评估

### TCO(Total Cost of Ownership)

不只是基础设施费,加上:
- 工程师时间(维护 / on-call / 升级)
- license 费
- 培训 / 招聘成本
- 迁移成本(若要换)

### Buy vs Build

外购 SaaS vs 自研。
- **核心差异化能力**: 自研
- **非差异化通用能力**: 外购(认证 / monitoring / queue / DB)
- 隐藏成本: 自研的"我们都会"低估,SaaS 的"贵"高估

### Reserved / Spot / Savings Plan

- 稳定负载:reserved (1y / 3y 锁定打折)
- 突发 / 可重试任务:spot(2-9 折 但可被回收)
- 混合策略 + 长期 commit 一部分

## 反模式

- **没有 cost owner**:全部一个云账号一个 bill → 没人能说"X 服务占 30%"
- **vibe-based capacity planning**:凭感觉申请,从不 review
- **monorepo 全跑 CI**:每个 PR 跑全部 → CI 账单飞
- **观测无 cardinality 治理**:label 爆 → metric SaaS 账单飞(参考 `devops-patterns/observability.md`)
- **dev/test 跟 prod 同规格**:开发环境根本不需要
- **没人看 cost explorer**:每月账单到了才发现暴涨
- **追求 100% 可用性**:99.9 → 99.99 → 99.999 每加一个 9 成本指数级
- **过早 multi-region**:复杂度 ×5 成本 ×3,实际用户都在一国

## Cost-aware Design 原则

- 每个新组件评估月度成本,写到 ADR
- 高成本决策走审批(eg. 新启一个 ES 集群)
- 成本数据可见(看板 / Slack 周报)
- 定期(月度)cost review 例会 — 不是 finops 团队的活,是工程团队的活

## 决策辅助清单(给 arch-design)

- [ ] 方案的月度运营成本估算了吗?$ 单位?
- [ ] 用 reserved / spot 还是 on-demand?为什么?
- [ ] 数据传输 / 存储成本评估了吗?跨 AZ / region?
- [ ] 监控 / 日志 cardinality 治理了吗?
- [ ] dev / test 环境跟 prod 规格一致吗?该不该降?
- [ ] 是否过度可用性 / 过早 multi-region?
- [ ] TCO 含工程师时间吗?
- [ ] Buy vs Build 评估了吗?

## 参考

- AWS / GCP / Azure cost optimization 白皮书
- "Cloud FinOps" — J.R. Storment & Mike Fuller
- "Software Architecture: The Hard Parts" — Mark Richards (cost trade-off 散在各章)
