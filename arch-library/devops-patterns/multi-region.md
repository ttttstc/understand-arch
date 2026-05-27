# Multi-Region Deployment

> Scope: 跨地域部署、数据一致性、failover。`arch-frame` 在识别到地理分布 / 容灾 / 跨国合规 concern 时加载。

## 先问"真的需要吗"

跨地域 = 复杂度 × 5,**所有**问题都被放大(网络、一致性、运维、成本)。

可接受的驱动:
- **法规合规**:数据本地化(GDPR / 中国数据出境 / 俄罗斯本地存储)— 必须
- **延迟敏感**:用户在多大洲,跨洋 200ms+ 不可接受
- **可用性**:单 region 灾难恢复(整片云挂掉)
- **流量爆发**:单 region 撑不住

不要的理由:
- "听说大公司都这样" — 你不是大公司
- "防止云服务商挂" — AZ 级冗余通常已足够
- "未来可能需要" — 那未来再说

## 三种部署形态(从简到繁)

### 1. Active-Passive(单 region 写,异地灾备)

主 region 处理所有流量,备 region standby。failover 时切流量。

- ✅ 一致性简单(单点写)
- ❌ 备 region 长期闲置,成本浪费
- ❌ failover 演练不勤 → 真要切时手忙脚乱
- ❌ failback 比 failover 还难

适合:容灾需求 + 用户在单一地域。

### 2. Active-Active(多 region 同时写,无主)

每个 region 处理本地用户流量,数据双向同步。

- ✅ 资源利用率高、延迟低
- ❌ 写冲突要解决:LWW / CRDT / 应用层
- ❌ 一致性弱(最终一致或会话一致)
- ❌ 跨 region 事务几乎不可能

适合:用户地理分散 + 业务能容忍最终一致(社交、内容、IoT)。

### 3. Sharded Active-Active(按用户分片,每 region 拥有一份用户)

用户 X 总是路由到 region A 处理,数据主在 region A,其他 region 只读副本。

- ✅ 写一致性简单(每用户单主)
- ✅ 延迟低(用户就近)
- ❌ 用户跨 region 移动 / 协同复杂
- ❌ 路由层必须有 "用户 X 在哪个 region" 的强一致认知

适合:用户地理稳定 + 强用户隔离(企业 SaaS、游戏)。

## 数据一致性矩阵

| 数据类型 | 推荐策略 |
|---|---|
| 关键账务 | 单 region 写 + 异步副本;跨 region 永远从主读 |
| 用户配置 | 主从异步,容忍秒级延迟 |
| 内容(博客 / 视频) | 全副本异步,CDN 缓存 |
| 实时协作(文档 / 聊天) | CRDT 或主从,房间级 sharding |
| 计数器 / 计费 | 各 region 本地累加,定期对账 |

## Failover 的硬件细节

**RTO**(恢复时间目标)和 **RPO**(数据丢失容忍)必须事先量化。

- RTO < 1 分钟:必须自动 failover + 完整健康检查 + DNS / GSLB 秒级生效
- RTO < 1 小时:可手动触发,但所有步骤必须脚本化
- RPO = 0:同步复制 → 写延迟受跨 region RTT 影响 → 慢
- RPO = 秒级:异步复制 + 接受少量丢失
- RPO = 分钟级:批量备份恢复

跨 region 同步复制(RPO=0)在地理距离上有物理上限 — 跨洋同步几乎不可能保 latency。

## 流量调度

- **DNS-based**:Route53 / Cloudflare,TTL 决定切换速度,客户端 cache 是大坑
- **Anycast**:同 IP 多 region,网络路径短;成本高,适合 CDN/边缘
- **GSLB**(全局负载均衡):基于健康检查 + 地理 + 延迟决策

**客户端 DNS cache** 是 failover 时最常见的"为什么没切"原因。TTL 设短一点(60s 或更短),但要观察 DNS 流量成本。

## 跨 region 网络

- 跨 region 延迟 = 物理距离 + 路由 + 跨云;不要假设 < 100ms
- 跨 region 带宽贵;别让普通业务跑跨 region 调用 — 落 region 内
- VPC peering / Transit Gateway / 云间专线:选型看跨云需求与成本

设计原则:**请求不跨 region**;只有数据同步跨 region。

## Region 隔离的爆炸半径

多 region 真正的价值:**一个 region 挂,其他不挂**。

如果架构让 region A 挂时 region B 也挂(典型:共享 control plane / 共享 IAM / 共享 metadata service),那 multi-region 是装的。

检查:
- control plane 是不是 region 隔离的?
- 跨 region 的依赖能不能列出来?每条都能挂吗?
- 演练:故意挂掉一个 region,其他 region 真的能扛吗?

## 合规与数据本地化

- **GDPR**:欧盟用户数据可以离开欧盟,但需要 SCC / 充足性裁定
- **中国数据出境**:个保法 + 数据出境安全评估,严格
- **俄罗斯 / 印度**:用户数据必须本地存储
- 跨 region 数据流要画出来 + 每条流标合规依据

实务做法:按 region 完全隔离用户数据,跨 region 不流。

## 反模式

- **multi-region 但 control plane 单点**:整体可用性 = control plane 可用性
- **failover 没演练**:真要切时发现脚本过期
- **DNS TTL 1 小时 + 期望秒级 failover**:不可能
- **跨 region 同步 + p99 SLO**:物理上不达标
- **active-active 没冲突解决**:数据互踩,数据修复是噩梦
- **多 region 装 control plane 没装数据面隔离**:省钱省成沙雕

## 决策辅助清单(给 arch-design)

- [ ] 真的需要 multi-region 吗?驱动是什么?
- [ ] 选哪种形态?为什么不选更简单的?
- [ ] RTO / RPO 量化了吗?
- [ ] 一致性方案是什么?写冲突怎么解决?
- [ ] failover 演练频率?上次演练是什么时候?
- [ ] 跨 region 依赖列出来了吗?爆炸半径检查过吗?
- [ ] 合规需求是什么?数据流图画了吗?

## 参考

- "Designing Data-Intensive Applications" — Kleppmann (Ch. 9)
- Google SRE Book — Ch. 8 "Release Engineering"
- AWS / GCP 跨 region 架构白皮书
- "Patterns of Distributed Systems" — Unmesh Joshi
