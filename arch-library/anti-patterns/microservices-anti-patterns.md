# Microservices Anti-Patterns

> 微服务常见翻车姿势。`arch-review` 在审计 / `arch-options` 在权衡时,对照此清单识别已踩或将踩的坑。

## 1. 分布式单体(Distributed Monolith)

**症状**: 服务拆了但部署必须同步;改一个服务要同时改 N 个;发版日全队就位。

**根因**:
- 服务边界沿"技术层"而非"业务能力"切
- 共享 DB / 共享 schema / 共享 DTO 库
- 接口耦合(同步调用链 ≥3 跳)

**修**:
- 重新画限界上下文(参考 `microservices-patterns/service-decomposition.md`)
- 切断共享 DB → 每服务自己的 schema
- 共享 DTO 库 → 各自从 schema(OpenAPI/Proto)生成

## 2. 假数据隔离(Shared Database)

**症状**: 两个服务读写同一张表;改 schema 全连环动;A 服务的写让 B 服务的查询返错结果。

**根因**: "拆服务但不想拆数据库" — 拆了 50%。

**修**:
- 引入数据所有权: 每张表只能被 1 个服务直接写
- 跨服务读: 调 API 或订事件
- 老 brownfield 用 dual-write(参考 `migration-patterns/parallel-run.md`)逐步切

## 3. Chatty Microservices(同步调用瀑布)

**症状**: 一个用户请求触发 ≥5 跳同步 RPC;p99 失控;任一跳挂全挂。

**根因**:
- 切粒度太细(每个 CRUD 一个服务)
- 没做聚合层 / BFF
- 同步表达异步语义(notification 用 RPC 而非事件)

**修**:
- 合并粒度过细的服务
- 加 BFF / aggregation layer(参考 `microservices-patterns/api-gateway.md`)
- saga / event 取代深同步链(参考 `microservices-patterns/event-driven.md`)

## 4. 缺乏可观测性(Observability Gap)

**症状**: 用户报障 → 工程师不知道哪个服务 / 哪个版本 / 哪一跳出问题;排错 30 分钟以上。

**根因**:
- 没有跨服务 tracing
- 没有统一日志聚合
- service 日志互相找不到关联 trace_id

**修**: OpenTelemetry + 跨服务传 trace_id + 统一 dashboard(参考 `devops-patterns/observability.md`)

## 5. 共享代码 / 共享类型库

**症状**: 改一行 `@org/shared-types`,5 个服务都要升 + 重发;每次升都有不兼容惊喜。

**根因**: 把"我们都用的对象"抽到共享 lib,但跨服务版本一直滞后。

**修**:
- 每服务从 schema 自己生成 → 不共享代码
- 必要的横切(eg. logger format)做成可选 lib + 严格 semver + 长期向后兼容

## 6. 没有契约测试

**症状**: 服务 A 改 API,服务 B 升级时才发现挂;集成测试在临上线时报错。

**根因**: 只测自己的服务,不测"我和别人的接口"。

**修**:
- Consumer-driven contract tests(Pact / Spring Cloud Contract)
- API schema 检查(breaking change linter)
- 在 CI 跑 contract test 而非全 e2e

## 7. 数据库 Per-Service 错误极端(Each-Service-Each-DB)

**症状**: 30 个服务 30 个 DB;DBA 哭了;backup / monitoring / capacity planning ×30。

**根因**: 把 "每服务自己 schema" 误解为 "每服务自己 cluster"。

**修**:
- 多服务**可以**共享 DB cluster,只要 schema 隔离
- 真实数据规模大才需要独立 cluster
- 物理隔离的成本要算进 TCO

## 8. 跨服务分布式事务

**症状**: A 服务调 B,B 调 C,要保证三方都成功或都回滚;选了 2PC;系统经常卡死。

**根因**: 把单体时代的 ACID 思维硬套到分布式。

**修**: saga(orchestration 或 choreography)+ 补偿 + 最终一致(参考 `microservices-patterns/event-driven.md` saga 章节)

## 9. 服务粒度漂移

**症状**: 半年后服务数从 5 变 50;一半是"thin wrapper around a table";另一半成了"上帝服务"包揽 70% 业务。

**根因**: 没有服务粒度审查机制;拆服务不需 ADR。

**修**:
- 任何新服务必须 ADR(回答:为什么不是模块?限界上下文是什么?owner 是谁?)
- 定期(季度)review:粒度太细 → 合;粒度太大 → 拆

## 10. CI/CD 跟不上拆分

**症状**: 服务 N 个,但 CI 还是单 monorepo build 全跑;部署还是手动 N 次;发版日全队上岗。

**根因**: 微服务的核心收益是"独立发布",CI/CD 没适配 = 收益落地不了。

**修**:
- 独立 build / 独立 deploy pipeline 每服务一份
- 影响面分析(Turborepo / Nx 的 affected)只跑动了的
- 蓝绿 / canary / feature flag 自动化

## 11. 缺 owner

**症状**: PagerDuty 报警 → "这是谁的服务?" → 全员 ignore → 持续故障。

**根因**: 服务拆出来但 ownership 没分;或者 owner 离职没人接手。

**修**:
- 每服务必须有 owner team + backup
- service catalog(Backstage / 自建)显式 ownership
- on-call rotation 明确

## 12. 没有降级 / 熔断

**症状**: 一个非关键服务挂 → 全站不可用;cascading failure;一个慢下游拖死整链路。

**根因**: 用了 RPC 但没用 resilience 工具;假设依赖永远健康。

**修**:
- Resilience4j / Polly / Envoy outlier detection
- 关键路径有 fallback(参考 `nfr-checklists/reliability.md`)
- 重试 + 超时 + 熔断 + 限流四件套必备

## 决策辅助清单(给 arch-review)

review 微服务架构时,逐条对照本清单。每条标:
- ✅ 没问题
- ⚠️ 有迹象(列出证据)
- ❌ 已踩(列出影响)

每个 ❌ 必须落 R-NNN 进入 `agent/证据/风险与技术债台账.yaml`。

## 参考

- "Microservices Patterns" — Chris Richardson
- "Monolith to Microservices" — Sam Newman
- "Building Microservices" — Sam Newman (2nd ed)
- microservices.io patterns catalog
