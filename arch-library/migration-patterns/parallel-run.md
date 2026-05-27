# Parallel Run / Dual Write & Compare

> Scope: 新老两个实现并行跑,对比结果验证一致性,然后切流。常和 Strangler / Branch by Abstraction 配合,聚焦"验证阶段"的方法论。

## 核心思想

不光"做了新的",还要**主动证明**新的等于老的(在该等的方面)。等价的方式:让两边都跑,对比每条输出。

适合:
- 不能停服迁移
- 业务正确性是硬要求(金融 / 计费 / 计算引擎)
- 老系统行为复杂、文档不全 — "老系统就是规约"
- 风险高,管理层要看到"已验证 N 笔无差异"才肯切

## 三种 parallel 形态

### 1. Dual Write(双写)

```
write request
   ├─→ old system (返回响应给用户)
   └─→ new system (异步,只为对比)
```

- 用户感知**只有老**;新只是"影子"
- 失败的"新写"不影响用户;但**必须 log**,否则数据漂移看不见
- 对比可以延迟跑(夜间 batch)

### 2. Dual Read & Compare(双读对比)

```
read request → old system (主) → 响应给用户
              ↘ new system (影子) ─→ compare → log diff
```

- 用户拿老的;新的只参与对比
- 简单粗暴,适合查询类
- 性能成本:每次请求都打两份下游

### 3. Shadow Traffic(影子流量)

```
real traffic ──→ load balancer ─→ old (用户拿)
                                ╲
                                 → new (镜像副本,不返回给用户)
```

- LB / sidecar(eg. Envoy mirror)层面复制流量
- 应用代码不动
- 适合验证新系统的容量 / 行为 / 性能

## 对比策略

### 字段级对比

每条响应做 deep equal:
- 全等 → ✅
- 顺序不同(数组)→ 排序后再比 / 或语义比较
- 字段值范围内浮动(浮点数)→ 容差对比
- 老系统的 bug 行为 → **保留**(不要"借机修") — 老的就是规约,修改是另一个工单

### 统计级对比

每天/每小时:
- 一致比例 (% match)
- 差异分布(哪些字段最常不一致)
- 差异样本(随机挑 N 条 diff 入 review queue)

### 阈值

- 99.99% match 可以考虑切
- < 99% match 必须查根因(老 bug / 新 bug / 时序问题 / schema 不齐)
- 不要"接受"低于阈值的差异,**每条 diff 都要追责**

## 时序问题(最常见踩坑)

老新两边时间不同步(eg. 老处理早 100ms,新读到了"未来"的数据)→ 对比假阳性。

mitigation:
- 用同一时间快照(snapshot ID / 事务时间)做对比
- 对比延迟跑(几秒后再 compare,等数据稳定)
- 排除明显时序窗口(eg. < 5s 的写入忽略)

## 数据修复

dual write 期间不一致是常态。需要**主动**修复:
- 差异分类: schema 差 / 时序差 / 真 bug
- 修 bug 后,跑"补偿"job 把老数据回填到新
- 跨多月迁移期,补偿 job 跑很多次,要可重入

## 性能预算

并行 = 几乎所有依赖请求 ×2。
- DB / cache / 下游 API: 容量必须 ≥ 2× 平时
- 网络带宽: 镜像流量也算
- 监控存储: 对比 log + diff 记录占空间

如果上线 parallel 之后系统挂了,**不是 parallel 不可行,是没预算容量**。

## 切流前的最后检查

99.99% match 后到 100% 切流之间,做一次完整 cutover rehearsal:
- 灰度 1% → 10% 真实流量到新(用户拿新的响应)
- 同时保持 dual write
- 看用户感知 + 业务指标
- 任何异常立刻切回

cutover 后保持 dual write 至少 1 周 — **回滚选项**还在。

## 老系统下线时机

不是"100% 切流"那一刻,而是"100% 切流 + 一段稳定期 + 备份充分"。常见做法:
- 100% 切流后 1-3 个月,老系统 read-only(不再写)
- 再 3 个月后,数据归档,代码 deprecated
- 半年后真正删

急着删 = 失去回滚选项,大忌。

## 反模式

- **对比不主动看 diff**:diff log 默默存,从不有人读 → 漂移看不见
- **接受低 match 率**:"99% 已经够好" → 没真验证
- **diff 修复成本"接受"**:其实是没敢面对真 bug
- **dual write 不可逆**:写入设计成单向,回滚需要数据修复 → 不是真 parallel
- **没有容量预算**:并行就挂 → 误以为 "parallel 不可行"
- **太早删老系统**:切流后 1 周就删 → 失去回退,等真出问题手忙脚乱

## 决策辅助清单(给 arch-design)

- [ ] 选 dual-write / dual-read / shadow traffic? 为什么?
- [ ] 对比 match 阈值是多少? 谁负责追每条 diff?
- [ ] 时序问题怎么处理?
- [ ] 容量预算扩到 2× 了吗?
- [ ] cutover 后保持 dual 多久?
- [ ] 老系统真正删除的时间表?
- [ ] 数据修复 job 谁写?是否可重入?

## 参考

- "Building Evolutionary Architectures" — Neal Ford et al.
- GitHub Engineering — "Move Fast and Fix Things"(MySQL 升级 parallel run)
- Stripe Engineering — "Online migrations at scale"
