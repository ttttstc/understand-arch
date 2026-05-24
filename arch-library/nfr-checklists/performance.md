# Performance NFR Checklist

> 性能维度 + 度量 + 优化路径。`arch-options` / `arch-review` 用来评估方案是否能撑住业务规模。

## 度量(必须百分位,不要平均)

| 指标 | 含义 | 目标范例 |
|---|---|---|
| Latency p50 / p95 / p99 / p99.9 | 响应时间分位 | API: p99 < 200ms;UI 交互: p95 < 100ms |
| Throughput | QPS / RPS / events/sec | 单实例 vs 集群 |
| Concurrency | 并发连接 / 并发 in-flight 请求 | |
| Saturation | CPU / mem / disk IO / network / connection pool | < 70% 健康 |
| Tail latency 比 | p99 / p50 | < 5× 健康;> 10× 可能 GC / queue / lock |
| Time to first byte (TTFB) | 用户视角首字节 | < 200ms 全球;< 100ms 国内 |
| Time to interactive (TTI) | 前端可交互 | < 3s 移动端 4G |

**只报均值 = 撒谎**。p99 是用户实际体验,均值是营销话术。

## 思维模型: USE / RED

### USE(Brendan Gregg,资源视角)

每个资源:
- **U**tilization: 使用率
- **S**aturation: 队列长度(过载迹象)
- **E**rrors: 报错数

### RED(Tom Wilkie,服务视角)

每个服务:
- **R**ate: QPS
- **E**rrors: 错误率
- **D**uration: 响应时间分位

两个一起用:USE 看基础设施,RED 看业务服务。

## 性能 budget(在设计期就分配)

总 budget(eg. p95 < 200ms)拆给各段:

| 段 | budget |
|---|---|
| LB / 网关 | 5ms |
| auth | 10ms |
| 业务逻辑 | 80ms |
| DB 查询 | 50ms |
| 渲染 / 序列化 | 20ms |
| 网络往返 ×2 | 35ms |
| **合计** | **200ms** |

设计期就发现"光数据库就 100ms 走不通" → 必须重设计,而不是上线后发现 SLO 不达标。

## 优化路径(由便宜到贵)

### 1. 测量先于优化(永远)

"Don't guess, profile." 先有数据,再动手:
- 应用层:Prometheus + RED dashboard / Datadog APM
- 进程内:flamegraph / continuous profiling (Pyroscope / Parca)
- DB:慢查询日志 / EXPLAIN
- 前端:Lighthouse / Web Vitals / Chrome DevTools Performance

### 2. 缓存(收益最大)

层次:
- 浏览器 cache(HTTP cache control)
- CDN
- 应用层 cache(Redis / Memcached)
- 进程内 cache(LRU)
- DB query cache / materialized view

注意:
- TTL + 失效策略要设计
- cache stampede(同时失效大量 miss 击穿)防御
- 数据一致性 trade-off 显式

### 3. 减少跨进程 / 跨网络往返

- N+1 query → join / batch / dataloader
- chatty API → 聚合 / GraphQL / BFF
- 远程调用 → 本地 / sidecar / cache

### 4. 异步化

不需要实时返回的工作 → 队列 / event:
- 通知 / 邮件 / 报表 / 索引重建
- 用户感知的同步路径变短

### 5. 并行化

- 多个独立下游 → 并发调(`Promise.all`)
- DB 多表 query → 并行
- 注意并发数控制(不要打挂下游)

### 6. 索引 / DB 优化

- 缺索引 → EXPLAIN 看 full scan
- 索引过多 → 写慢
- 范围查询 + ORDER BY → 复合索引 + 顺序
- 大表分区 / sharding

### 7. 算法 / 数据结构

`O(n²) → O(n log n)` 时常比加缓存便宜。Profile 看到热点函数才动。

### 8. 横向扩展

无状态服务 → 加实例;
有状态服务 → sharding / replicas;
注意:扩到 N 后,某些依赖(DB / 协调服务)可能成为瓶颈。

### 9. 升级硬件 / 换 runtime

- 单实例规格升一档
- JVM → GraalVM Native / Node → Bun
- 通常**最后才考虑**,trade-off 复杂

## 前端性能特殊

- **初始 JS** < 200KB gzipped 健康
- **关键 CSS** inline 在 HTML
- **图片** 响应式 + lazy + webp/avif
- **字体** subset + `font-display: swap`
- **路由** lazy load
- **Web Vitals**: LCP < 2.5s / INP < 200ms / CLS < 0.1
- 服务端渲染(SSR / SSG / RSC)适配场景

参考 `typescript-patterns/build-and-bundle.md`。

## 反模式

- **只看平均**:p99 用户哭泣
- **"先实现再优化"实际上从不优化**:技术债越积越深
- **优化无 benchmark**:改完不知道有没有变好
- **微优化(replace foreach with for)**:profile 没显示是瓶颈就别动
- **缓存当作 silver bullet**:不分场景滥用,一致性问题更头疼
- **scale up 而不是 scale out**:单实例越来越大,故障爆炸半径越大
- **没有性能 budget**:设计期不分配,上线 surprise

## 决策辅助清单(给 arch-options)

- [ ] SLI 用百分位定义(不是均值)?
- [ ] 性能 budget 在设计期就分配了吗?
- [ ] 加新组件评估对总 latency 的贡献?
- [ ] 已有 profile / benchmark 数据?
- [ ] 缓存层次 + 失效策略设计?
- [ ] 异步化合适的工作?
- [ ] DB 索引 review?
- [ ] (前端)Web Vitals 目标 + 监控?

## 参考

- "Systems Performance" — Brendan Gregg(USE 方法论原始出处)
- Google SRE Book — Ch. 6 "Monitoring" (RED 启发)
- web.dev — Web Vitals 实战
- "High Performance Browser Networking" — Ilya Grigorik
