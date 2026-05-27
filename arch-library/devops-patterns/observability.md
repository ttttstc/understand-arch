# Observability

> Scope: logging / metrics / tracing / 告警。`arch-frame` 在识别到生产服务 / 多服务 / SLO 关切时加载。

## 三支柱 + 第四支柱

| | 用途 | 工具典型 |
|---|---|---|
| **Logs** | 单次事件的"发生了什么" | Loki / ELK / Datadog Logs |
| **Metrics** | 时间序列的"有多少 / 多快" | Prometheus / Datadog / VictoriaMetrics |
| **Traces** | 跨服务的"链路怎么走的" | Jaeger / Tempo / Datadog APM |
| **Profiles** (新) | "代码到底慢在哪行" | pyroscope / Parca / continuous profiling |

**不要全上**。按规模上:
- 单服务 / 小规模 → logs + 基础 metrics 即可
- 多服务 / 跨进程调用 → 必须 tracing
- 性能瓶颈难定位 → profiling

## Logs 的常见错误

- **结构化**:JSON,不是纯文本。`logger.info("user_id=%s did %s", uid, action)` 不可查 → 用 `logger.info("user_action", user_id=uid, action=action)`
- **级别**:DEBUG / INFO / WARN / ERROR / FATAL 必须有清晰语义,不是凭手感
  - WARN = 可恢复但值得关注;ERROR = 用户请求失败;FATAL = 进程要挂
  - 别把 WARN 当 INFO 打 → 告警噪声
- **PII**:用户密码 / 身份证 / token 永远不写 log;有合规要求时主动审计
- **trace_id 必带**:每条 log 都要能反查到所属 trace
- **采样**:高频路径打 100% INFO log = 钱包出血;按 trace 头部采样

## Metrics 的反模式

- **指标爆炸(cardinality)**:label 里放 user_id → 千万个时间序列 → Prometheus 撑爆
  - 规则:label 取值集合 < 100 才安全;> 1000 是事故
- **只看平均**:p50 美得很,p99 用户哭泣 — 必须报百分位
- **没有 SLI**:有一堆指标但没人知道哪些代表"业务好不好"
- **报警与指标无关**:报警阈值拍脑袋定 → 0.5s 还是 0.8s? 看 SLI 历史分布

## Tracing 的实践

- **OpenTelemetry**(OTLP)是事实标准 — 不要再选 Jaeger / Zipkin 私有协议
- **每跳必有 span**:HTTP / gRPC / DB / cache / MQ
- **trace 跨异步**:事件消费时把 trace_id 透传,否则消息一进 queue 链路就断
- **采样策略**:
  - 头部采样(decide on entry):简单,但事后不能"挑出失败请求"
  - 尾部采样(decide on exit):能挑失败/慢请求 100% 保留,需要 collector 缓冲
- **采样率**:正常 1-5%,问题排查时拉到 100%

## SLI / SLO / SLA(从外到内一致)

- **SLI**(Service Level Indicator):用户能感知的指标(latency / availability / correctness)
- **SLO**(Service Level Objective):内部目标(99.9% 5xx < 0.1% / p95 < 200ms)
- **SLA**(Service Level Agreement):对外承诺,通常宽于 SLO

SLI 必须**从用户视角**测,不是从服务器视角。"网关响应 99% < 100ms" 不等于"用户 99% < 100ms"(还有 DNS + LB + 客户端处理)。

误差预算(Error Budget):100% - SLO = 允许失败的预算。预算用光 → 冻结发版,先恢复可靠性。

## 告警(alerting)

**好告警的判据**:
1. 是否真的需要人立刻动?(否 → 改 dashboard,不告警)
2. 告警时人知道做什么?(否 → 写 runbook)
3. 告警与 SLO 关联?(否 → 大概率噪声)

**告警疲劳是 #1 杀手**。100 条告警 / 周 = 全员 ignore。

告警分级:
- **page**:必须立刻起床 — 严格控制,只给"用户在受影响"
- **ticket**:工作日处理即可
- **info**:dashboard 看就行,不通知

## Dashboard 设计

每个服务至少有:
- **黄金信号**(Google SRE):latency / traffic / errors / saturation
- **业务指标**:订单/分钟、登录成功率、关键转化
- **依赖健康**:每个下游的 latency / error rate
- **资源**:CPU / mem / disk / GC

不要做 50 个图的 dashboard — 没人看;一屏说清"健康吗 / 有事吗 / 在哪"。

## 跨服务排错套路

排错时该有的标准动作:
1. 看业务指标:用户感知到的是什么?
2. 看入口服务的 error rate / latency
3. 顺 trace 找最慢/失败的 span
4. 跳到对应服务的 logs,按 trace_id 滤
5. 找到根因后,看是不是有早期信号本该告警(没告 → 加告警)

如果第 1-3 步不能在 5 分钟内完成,观测性就是不够的,先补观测再排错。

## 成本控制

观测数据是有钱包成本的。

- log 按级别采样;DEBUG 默认关
- metrics 按 cardinality 治理;定期审计高基数 label
- trace 采样 1-5%,问题排查再拉高
- 长期归档 ≠ 热查询,分层存储
- 真观察到的 alert / dashboard 才保留,never-used 的 metric 删

## 反模式

- **logs 当 metrics 用**:打一堆 log 然后 grep 算 QPS → 该用 counter
- **metrics 当 logs 用**:把 trace_id 当 label → cardinality 爆
- **trace 不覆盖异步**:消息进 queue 链路断
- **告警阈值拍脑袋**:0.5s 还是 1s? 看历史分布
- **没有 runbook 的 page**:半夜起床手忙脚乱
- **观测系统自身不可观测**:Prometheus 挂了没告警 → 出事时盲飞

## 决策辅助清单(给 arch-design)

- [ ] SLI 定义了吗?是用户视角吗?
- [ ] 三支柱覆盖了吗?跨服务 trace 通了吗?
- [ ] 告警分级 + runbook 全了吗?
- [ ] cardinality 审计了吗?
- [ ] 观测系统挂了有兜底告警吗?

## 参考

- Google SRE Book — Ch. 6 "Monitoring", Ch. 4 "SLOs"
- "Observability Engineering" — Charity Majors et al.
- OpenTelemetry 官方文档
