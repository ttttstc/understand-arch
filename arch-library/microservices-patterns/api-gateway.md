# API Gateway / BFF / Aggregation

> Scope: 网关、BFF、聚合层的边界与反模式。`arch-frame` 在识别到多客户端 / 多服务前端聚合时加载。

## 三种角色不要混

| 角色 | 职责 | 谁负责 |
|---|---|---|
| **API Gateway** | 流量入口、鉴权、限流、路由、协议转换、监控 | 平台/SRE 团队 |
| **BFF (Backend-For-Frontend)** | 给**特定客户端**(iOS / Android / Web)做的聚合层,管 UI 数据形状 | 前端团队或与前端紧密协作的小组 |
| **Aggregation Service** | 跨服务做业务级聚合(eg. "订单详情" = 订单 + 商品 + 物流) | 业务领域团队 |

混在一起 = 上帝服务 = 单点 = 谁也不想改。

## API Gateway 的职责清单(只做这些)

- 鉴权 / 鉴权令牌透传
- 限流 / 熔断 / 重试 / 超时
- 协议转换(HTTP ↔ gRPC ↔ WebSocket)
- 灰度路由 / A-B 流量切分
- 日志 / metrics / tracing 接入点
- TLS 终结

**不做**:业务逻辑、字段聚合、缓存业务数据、状态机。这些越界 = 哥斯拉化。

选型:Kong / Envoy / Nginx / 云厂商 LB+API GW(AWS API GW, Cloudflare Workers)。

## BFF 何时需要

要 BFF 当且仅当:
- ≥ 2 个端(eg. iOS + Web + 商家后台)
- 端对数据形状 / 字段筛选有显著差异
- 直调下游会让 mobile 包大或带宽爆

否则:**不要 BFF**。一个端就一个 BFF = 复杂度白送。

每端**独立**一个 BFF;不要"一个 BFF 服务 3 个端" — 又退化成上帝服务。

## Aggregation Service 何时需要

业务级聚合该是**领域服务**的一部分(eg. "OrderDetailQueryService" 在订单领域里),不是单独的 aggregation layer。

抽出单独 aggregation 服务的少数合理理由:
- 跨多个领域的复合查询,且无法落到任一领域(eg. "用户全景" 横切 5 个 BU)
- 性能瓶颈集中在聚合上,需要专门优化(预聚合 / cache / CQRS read model)

## 数据聚合的两种取向

### Fan-out at request time

调用方一次请求 → 网关/BFF 并发调 N 个下游 → 聚合返回。

- ✅ 数据新鲜
- ❌ 长尾延迟(p99 由最慢的下游决定)
- ❌ 一跳挂全挂

mitigation:并行 + 部分降级(关键字段挂 → 失败;辅助字段挂 → 返默认值并标 partial)。

### Pre-aggregation (CQRS read model)

后台事件驱动维护一份聚合表,查询打这张表。

- ✅ 查询超快、稳定
- ❌ 最终一致(秒级延迟)
- ❌ 多一套基础设施

适合:高 QPS 读、可接受秒级延迟、聚合复杂。

## 字段筛选 / over-fetching

REST 默认全字段 → 客户端浪费。解法:

- **GraphQL** — 客户端指定字段;但服务端 N+1 / depth-limit / cost-control 是新坑
- **Fields/Sparse fieldset** — REST 加 `?fields=a,b` 参数;够用且简单
- **专门接口** — BFF 暴露每端定制的接口

选型决策树:
- 单一前端 + 字段需求稳定 → 普通 REST + 必要时加 fields 参数
- 多端 + 字段差异大 → BFF
- 真正的探索式 UI + 复杂关联 → GraphQL(接受其复杂度)

## 鉴权与会话

网关做**身份认证**(谁),下游服务做**业务授权**(能不能)。

- 网关验 token → 注入 user claims 到下游 header
- 下游服务 trust header(因为流量只能从网关来)
- 下游服务依然要做"这个用户能不能动这条数据"的授权,**不能**只信网关

零信任部署:即使内网,下游也要验 token。代价是性能 + 复杂度,看威胁模型。

## 限流与熔断

- **限流粒度**:全局 / 接口 / 用户 / API key / 租户 — 至少有两层(全局 + 用户)
- **熔断**:依赖挂时 fast-fail,不要把请求队列灌爆 — Hystrix 弃用了,选 Resilience4j / Polly / Envoy outlier detection
- **退避**:重试要带抖动指数退避;重试次数 ≤3
- **超时**:每跳都要超时,且越靠下游越短(留时间给上游)

## 反模式

- **业务逻辑在网关**:状态机 / 校验 / 字段拼接 → 该回到领域服务
- **一个 BFF 服务多个端**:复杂度爆炸
- **网关直查 DB**:绕过下游服务 → 数据所有权破
- **没有限流**:一个客户端 bug 打挂下游
- **同步聚合无超时**:p99 失控
- **鉴权全压下游**:每个下游重复实现鉴权 → 不一致

## 决策辅助清单(给 arch-options)

- [ ] 网关/BFF/aggregation 三角色分清了吗?
- [ ] BFF 真的需要吗?端数 ≥ 2?
- [ ] 数据聚合走 fan-out 还是 pre-aggregation?延迟 vs 新鲜度怎么权衡?
- [ ] 网关做了限流吗?分了哪几层?
- [ ] 鉴权在哪一层?下游会不会再验?

## 参考

- "Microservices Patterns" — Chris Richardson (Ch. 8)
- Sam Newman, "Backends For Frontends"
- "GraphQL at Twitter" / "Netflix BFF" 经验帖
