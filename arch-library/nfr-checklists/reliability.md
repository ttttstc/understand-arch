# Reliability NFR Checklist

> 给 `arch-design` / `arch-review` 用的可靠性维度核查表。**不是百科**,是"该问什么 / 该怎么量化 / 反模式"。

## 度量(必须可量化,否则不算 NFR)

| 指标 | 定义 | 目标范例 |
|---|---|---|
| 可用性(availability) | `(总时间 - 不可用时间) / 总时间` | 99.9%(月停机 ≤ 43 分钟)/ 99.99%(≤ 4.3 分钟) |
| MTTR(平均修复时间) | 从告警到恢复的中位时间 | < 30 分钟(中型系统) |
| MTBF(平均故障间隔) | 两次故障的中位间隔 | > 30 天 |
| Error rate | `失败请求 / 总请求` (按用户视角) | < 0.1% |
| Error budget | `(1 - SLO) × 时间窗口` | 剩 0% 时冻结发版 |
| Recovery point (RPO) | 灾难时能容忍丢多少数据 | 0(同步)/ 秒级(异步)/ 分钟级(批) |
| Recovery time (RTO) | 灾难时多久能恢复 | < 1 分钟 / < 1 小时 / < 1 天 |

**不可量化的"我们要高可用" = 不算需求**。强制写数字。

## 6 个维度自检

### 1. 失败的种类被设计了吗?

- 单实例挂(进程崩 / OOM)
- 节点挂(机器 / pod 死)
- AZ 级挂(整片云挂)
- Region 级挂(整地域)
- 依赖挂(DB / cache / 第三方 API)
- 网络分区
- 数据腐化(磁盘 bit flip / 软件 bug)

每条都要回答:**发生时,系统行为是什么?**

### 2. 关键路径有 fallback 吗?

- DB 挂 → 走只读副本?走缓存?返回最近一次成功值?
- 下游 API 挂 → 缓存的旧值?默认值?降级 UI?
- 鉴权挂 → 拒所有(更安全)还是放行(更可用)?

trade-off: **CAP** 选择必须显式。"金融场景宁可拒绝也不放行" / "推荐场景宁可放行旧数据"。

### 3. 重试 / 超时 / 熔断 / 限流 都齐了吗?

- 每跳必须超时(默认无穷大 = 灾难)
- 重试要带 jittered exponential backoff
- 重试次数 ≤ 3,且**只重试幂等操作**
- 熔断在依赖挂时 fast-fail,不让请求堆积
- 限流分层(全局 + 用户)

### 4. 部署 / 发布是不是可靠性的破坏源?

70% 生产事故来自变更。检查:
- 部署可灰度? 可回滚? 多快?
- DB schema 与代码部署解耦(expand-contract)?
- 发版频率高(高 = 单次变更小 = 事故损失小)?

参考 `devops-patterns/deployment-strategies.md`。

### 5. 灾难恢复演练过吗?

- 上次拉断 region 是什么时候?(没演练 = 没具备能力)
- 上次恢复备份是什么时候?
- 上次起 standby 接管是什么时候?
- DR runbook 写了吗?谁能照着跑?

### 6. 数据可恢复吗?

- 备份策略(频次 / 保留 / 异地)
- 备份**测试恢复**(很多公司有备份没人验证能不能恢复)
- 点对点 PIT(point-in-time recovery)
- 业务级回退(eg. 用户误删能恢复吗?)

## 反模式

- **"我们用了 k8s 所以可靠"**:k8s 是工具不是 SLO
- **没有 SLI / SLO**:可靠性没法量化也没法迭代
- **MTTR 长但报告里写'快速恢复'**:看真实 incident 时间线
- **重试无 backoff**:挂了一瞬间 10× 流量打过去 → 进一步崩
- **依赖没超时**:goroutine / thread 堆积 → OOM
- **DR 只有方案没演练**:真挂时方案过期
- **备份没测过恢复**:发现时备份是空 / 损坏 / 加密 key 丢
- **error budget 喊冻结发版,实际上线该上线**:SLO 是装的

## 决策辅助清单(给 arch-design / arch-review)

- [ ] SLO 量化写下来了?(可用性 / latency / error rate / RPO / RTO)
- [ ] 失败种类全覆盖? 每条有行为?
- [ ] 关键路径的 fallback 是什么? CAP 选择显式?
- [ ] 超时 / 重试 / 熔断 / 限流 齐?
- [ ] 部署可灰度 + 回滚?
- [ ] DR 演练频率? 上次什么时候?
- [ ] 备份恢复测过吗?
- [ ] error budget 谁看? 用光后真的冻结发版吗?

## 参考

- Google SRE Book — Ch. 3 "Embracing Risk"、Ch. 4 "SLOs"、Ch. 11 "Being On-Call"
- "Release It!" — Michael Nygard
- AWS Well-Architected Framework — Reliability Pillar
