# Deployment Strategies

> Scope: 蓝绿、滚动、canary、灰度的选择与回滚。`arch-frame` 在识别到部署/发布相关 concern 时加载。

## 5 种策略对照

| 策略 | 机制 | 资源开销 | 回滚速度 | 适用 |
|---|---|---|---|---|
| **In-place** | 直接替换 | 0 额外 | 慢(重新部 v1) | 内部工具、低风险 |
| **Rolling** | 逐批替换 | 几乎 0 | 中(roll back) | 默认无状态服务 |
| **Blue-Green** | 两份完整环境切流 | **2×** | 秒级 | 风险高 / DB schema 兼容 |
| **Canary** | 小流量先上 | ~1.1× | 秒级 | 大流量 / 高风险变更 |
| **Feature flag** | 代码已部署,按 flag 启用 | 0 | 即时 | 业务功能切换 |

## Rolling(默认)

逐 pod / 实例替换。K8s `RollingUpdate` 默认行为。

- `maxSurge` 和 `maxUnavailable` 必须显式设(默认值未必对)
- 健康检查必须有 readiness probe(否则流量打到没准备好的 pod)
- 适合无状态服务 + 向后兼容的变更

陷阱:
- 老新版本同时在线 → API/事件 schema 必须兼容
- 长连接(WebSocket / gRPC stream)被 drain 时要给客户端 reconnect 时间

## Blue-Green

两套完整环境(blue 在线 / green 待命),DNS / LB 切换。

适用:
- 数据库 schema 强变更需要 cutover(虽然推荐用扩展再切的方式避开)
- 资源充足 + 不能容忍灰度期 mixed traffic
- 法务/合规要"明确的切换时点"

代价:
- 资源 2×(部署期)
- 数据库:两套环境必须同时能读写同一份数据,否则不是真 blue-green

## Canary

新版本接收 1% → 5% → 25% → 100% 流量,每步观察 metrics。

适用:
- 大流量 + 风险高 + 难以离线复现的 bug
- 有完善的 observability(没有 metrics 看 = canary 是装的)

要素:
- 路由层支持基于权重 / header / 用户 ID 的切流
- 自动 promotion / rollback 基于 SLI(p99 / error rate / 业务指标)
- canary 阶段时长足够覆盖业务周期(eg. 1 小时太短,夜里没流量看不出来)

工具:Argo Rollouts / Flagger / 服务网格(Istio / Linkerd)+ 监控。

## Feature flag

代码 deploy 不等于 feature release。

- 新功能默认 off,deploy 上线
- 通过 flag 系统(LaunchDarkly / Unleash / 自研)逐渐 opt-in
- 老路径保留,通过 flag 选择

收益:
- 部署风险 ≠ 发布风险(部署是技术,发布是业务)
- 出问题不用回滚部署,关 flag 即可
- 支持 A/B 实验

代价:
- 代码里 flag 分支堆积 — 必须有清理流程(flag debt)
- 多 flag 组合空间爆炸 — 限制每条路径同时活跃的 flag 数

## 数据库 schema 与部署解耦

**永远**先把 DB schema 改成兼容,再 deploy 代码;**永远**先 deploy 代码,再清理废弃 schema。

Expand-Contract 套路:
1. 扩(expand)— 加新列/表,代码两边都兼容
2. 迁(migrate)— 数据回填
3. 缩(contract)— 删旧列/表

跨多次部署完成。**绝不**把 schema 强迫 cutover 和服务 cutover 绑一起。

## 回滚

回滚比部署更重要。每次部署前必须能回答:

- [ ] 怎么回?(命令 / 按钮)
- [ ] 多快?(秒 / 分钟)
- [ ] 数据怎么办?(已写入的新格式数据老代码能读吗?能 → 安全;不能 → 不是真回滚,是事故)

不能纯回滚的变更(DB 不可逆迁移、第三方 API 切换)→ 必须有 forward fix 预案 + 演练。

## 部署频率与批大小

学界共识(Accelerate / DORA):**高频 + 小批 = 低事故率**。

- 每次部署一个小变更 → 出问题快速定位
- 每周一次大爆炸 → 出问题不知道是 30 个变更里哪一个

阻止你高频部署的事情(部署本身 ≥ 30 分钟 / 没有自动化测试 / 没有 canary)就是要优先解决的事情。

## 部署前检查清单

- [ ] CI 全绿
- [ ] DB schema 已扩(或本次不动 DB)
- [ ] 配置变更兼容(老 pod 不会因新 config crash)
- [ ] 回滚路径明确
- [ ] 高风险变更走 canary / feature flag
- [ ] 观测面板正在被人看着(高风险变更)
- [ ] 通知相关团队(发布窗口)

## 反模式

- **大 PR 大部署**:一次 50 个 commit → 出问题 git bisect 1 小时
- **回滚没演练**:回滚命令写在文档里没人跑过 → 真要回时发现命令早过期
- **部署窗口集中**:周五下午发版 + 全公司休假 → 故事讲烂了
- **金丝雀只看 CPU**:不看业务指标 → 业务挂了 CPU 正常,装作没事
- **feature flag 没清理**:三年前的 flag 还在 → 测试矩阵爆炸

## 决策辅助清单(给 arch-design)

- [ ] 这次变更风险等级?(低 → rolling / 中 → canary / 高 → blue-green + flag)
- [ ] DB 是否变化?如果是,有没有走 expand-contract?
- [ ] 回滚路径?多快?
- [ ] canary 自动 promotion 用什么 SLI?有数据吗?
- [ ] feature flag 是否需要?谁负责清理?

## 参考

- "Accelerate" — Forsgren, Humble, Kim
- Google SRE Book — Ch. 22 "Reliable Product Launches"
- Martin Fowler — "Feature Toggles", "BlueGreenDeployment"
