# Event-Driven Architecture

> Scope: 事件驱动架构、消息模式、saga、补偿。`arch-frame` 在识别到消息队列 / 异步流 / 跨服务工作流时加载。

## 事件 vs 命令

| | 命令 (Command) | 事件 (Event) |
|---|---|---|
| 语义 | "请做 X" | "X 已发生" |
| 接收方 | 1 个,指定 | N 个,订阅 |
| 失败语义 | 调用方需要知道 | 发布方不关心 |
| 改 schema | 接收方必须升级 | 订阅方各自决定何时升级 |

混淆是 bug 源头之一。设计时强制问:"这条消息描述的是事实,还是请求?" 事实用过去时命名(`OrderPlaced`),请求用动词(`PlaceOrder`)。

## 典型模式

### 通知模式(Notification)

事件只携带 ID + 类型,订阅方需要时回查发起方。

- ✅ 数据量小,事件总线轻
- ❌ 订阅方依赖发起方在线
- 适合:状态变更通知(`UserActivated`)

### 事件携带状态(Event-Carried State Transfer)

事件携带完整状态,订阅方本地缓存,不回查。

- ✅ 订阅方完全自治,发起方挂了也能用
- ❌ 事件膨胀,schema 演化更难
- 适合:订阅方需要 join 历史的场景

### 事件溯源(Event Sourcing)

不存当前状态,存事件流。状态 = 事件 fold。

- ✅ 完整审计、时间旅行、可重放
- ❌ 学习曲线陡,查询要建投影,schema 演化痛
- 适合:法务/财务/审计强诉求;**绝大多数业务不需要**

### CQRS

读写分离。命令走写模型,查询走专门优化的读模型(多种)。

- ✅ 读写各自扩展,可以为查询场景专门建表
- ❌ 最终一致,UI 要适配
- 注意:CQRS ≠ 事件溯源,可以单独用

## Saga(跨服务工作流)

跨服务事务的现代替代,**不**用分布式 2PC。

### Orchestration(中央编排)

一个 orchestrator 服务驱动各步骤。

```
Orchestrator → A.do() → B.do() → C.do()
                    ↓ fail at C
              compensate A and B
```

- ✅ 流程显式可见,易调试
- ❌ orchestrator 变成上帝服务
- 适合:步骤多、补偿复杂、新流程

### Choreography(协同)

各服务订阅事件,自己决定下一步。

```
A.Done → B subscribes → B.Done → C subscribes
```

- ✅ 完全解耦
- ❌ 流程在哪里?谁也说不清,调试地狱
- 适合:步骤少、参与者稳定、不会频繁改

**默认选 orchestration**,除非有充分理由。

## 补偿(Compensation)

每个 saga 步骤必须有对应的补偿动作。

- 不是回滚 — 而是**业务层抵消**(已发货的订单不能撤销,要走退货流程)
- 补偿可能失败 — 需要重试 + 人工兜底
- 部分动作不可补偿(如已发邮件)— 设计时要把不可补偿步骤放在 saga 末尾

## 消息可靠性的 5 个层级

1. **At-most-once**:发了就忘,可能丢 — 适合可丢的遥测
2. **At-least-once**:可能重 — **默认选择**,所有消费者都必须**幂等**
3. **Exactly-once delivery**:几乎不可能,任何号称的都是骗子
4. **Exactly-once processing**:加幂等 key 或事务消息;复杂但可达
5. **Effective exactly-once**:at-least-once + 业务幂等;**实战推荐**

幂等怎么做:消息带业务唯一 ID,处理前查重(短期 Redis,长期 DB unique 约束)。

## Outbox 模式

跨"DB 写 + 消息发布"两阶段必用。

```
TX {
  写业务表;
  写 outbox 表;
}
后台 worker:
  扫 outbox → 投消息 → 标记已发
```

不用 outbox 直接 "TX commit 后调 broker" = 提交后 broker 挂消息丢。

## 死信(Dead Letter)

消息处理失败 → 重试 N 次 → 入 DLQ。

DLQ **必须**有:
- 告警(不能默默积压)
- 人工处理工具(回放 / 丢弃 / 改写)
- 容量监控

无人值守的 DLQ = 一个看不见的 bug 黑洞。

## Schema 演化

- Avro / Protobuf + Schema Registry — 强制版本兼容检查
- 永远只**加**字段,**不删不改**类型;字段废弃只标 deprecated
- 跨大版本切换走双发(同时发 v1 + v2),订阅方各自迁移完再下 v1

## 排错与可观测

- 每条消息带 trace_id,跨发布→订阅一路传
- 链路追踪要画出来"事件 → 谁订了 → 谁处理了 → 处理后又发了什么"
- 处理延迟 SLO 比 throughput SLO 更常被忘
- broker 自身的运维(磁盘 / 副本 / leader 选举)放在能力清单里

## 反模式

- **共享 broker 当数据库**:订阅方互相消费对方的"中间状态" → 解耦假象
- **用消息做请求-响应**:同步语义硬塞异步,需要等结果 → 用 RPC
- **没 outbox 的双写**:DB 写完 broker 挂 → 数据不一致
- **消费者不幂等**:重试一次数据加倍
- **DLQ 没人看**:积压到磁盘满

## 决策辅助清单(给 arch-design)

- [ ] 这条消息是事实还是请求?命名是否对齐?
- [ ] saga 选 orchestration 还是 choreography?为什么?
- [ ] 每步补偿动作设计了吗?有没有不可补偿步骤?
- [ ] 消费者幂等怎么做?幂等 key 是什么?
- [ ] outbox / inbox 加了吗?
- [ ] DLQ 谁值班?

## 参考

- "Patterns of Enterprise Integration" — Hohpe & Woolf
- "Designing Data-Intensive Applications" — Kleppmann (Ch. 11)
- Microservices.io — saga, outbox patterns
