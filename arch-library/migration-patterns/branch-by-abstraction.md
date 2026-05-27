# Branch by Abstraction

> Scope: 在代码内部通过引入抽象层,把"老实现"和"新实现"并存,逐步切换。`arch-frame` 在识别到模块级重写 / 替换底层依赖 / 切第三方库时加载。

## 与 Strangler 的区别

| | Branch by Abstraction | Strangler Fig |
|---|---|---|
| 粒度 | 模块 / 类 / 函数级 | 服务 / 业务能力级 |
| 流量切换 | 进程内,运行时 if/feature flag | 路由层 / API gateway |
| 持续时间 | 天-周 | 月-年 |
| 典型场景 | 换 ORM / 换 cache 库 / 换支付通道 | 单体拆服务 / 跨平台迁移 |

两者**可以组合**:Strangler 划大块,每块内部用 Branch by Abstraction 做精细切换。

## 5 步流程

### Step 1: 抽象出接口

把要替换的功能,**先**抽出一个干净接口(若没有的话):

```typescript
// 之前: 业务代码直接调 OldPaymentProvider.charge(...)
interface PaymentProvider {
  charge(amount: number, method: PaymentMethod): Promise<ChargeResult>;
  refund(chargeId: string): Promise<void>;
}
```

此时所有调用点改为依赖接口 + 注入老实现。**这一步不应该改任何行为**,纯重构。CI 应该全绿。

### Step 2: 加新实现(空壳或半成品也行)

```typescript
class NewPaymentProvider implements PaymentProvider {
  async charge(...) { /* new logic */ }
  async refund(...) { /* new logic */ }
}
```

不需要一次写完。可以先实现一两个方法,其余抛 `NotImplementedError`。

### Step 3: 加运行时切换

```typescript
const provider: PaymentProvider =
  featureFlag('use-new-payment') ? new NewPaymentProvider() : new OldPaymentProvider();
```

切换粒度选项(从粗到细):
- 全局 boolean(简单,但全推或全退)
- 按 user / tenant / 国家
- 按方法(`charge` 用新,`refund` 用老 — 逐方法切)

### Step 4: 逐步切流量 + 监控

- 灰度比例: 1% → 10% → 50% → 100%
- 每步停留时间长到能看到完整业务周期(通常 24h+)
- 监控**业务指标**(支付成功率)+ **技术指标**(latency / error)
- 异常立刻切回

### Step 5: 删除老实现

100% 流量在新路径稳定跑了 1-2 个 sprint → 可以删老实现 + 删 feature flag。

**注意**:**这一步必须做**。不删 = 双份维护成本 + 老代码烂掉。

## 何时不适用

- 老实现没有清晰边界 → 先做边界(Step 1)可能就花了 3 周
- 行为差异巨大(eg. 同步 → 异步)→ 接口都不一样,这是重新设计,不是 Branch by Abstraction
- 切换风险极低(eg. 升级 lodash 小版本)→ 直接换,别引入抽象开销
- 新实现实际上"也是老的另一种封装" → 抽象本身在抽象老的,加这层 = 加复杂度无收益

## 抽象层设计原则

- **必须**封装**当前**老实现的语义,**不要**为想象中的新实现"提前设计"
- 接口尽量小(满足现有调用即可)— 否则新实现不得不也撑这一堆方法
- 不暴露老实现的私有概念(eg. 老 ORM 的 lazy proxy 类型不能漏到接口)
- 错误语义统一定义(否则两实现报错形式不同,调用方两边都要兼容)

## 与 feature flag 系统配合

Branch by Abstraction 高度依赖 feature flag。所以:
- flag 系统必须可靠(挂掉时默认走哪个? 通常老的更安全)
- flag 切换必须**热生效**(否则灰度成本爆)
- flag 切换有审计 log
- 项目里活跃 flag 数有控制(否则组合爆炸,见 `devops-patterns/deployment-strategies.md`)

## 数据/Schema 层面

如果新老实现**共用一份持久化数据**:
- schema 必须双向兼容(参考 Strangler 的 expand-contract)
- 双写期可以加,但要明确何时切单写

如果新老实现**各自有持久化**:
- 那已经不是 Branch by Abstraction,是 Strangler 子集 — 加 dual-read 对比机制

## 反模式

- **抽象层"为未来"过度设计**:撑了接口里 10 个方法,新实现实际只用 3 个 → YAGNI
- **flag 不删**:迁移做完不清理 → 三年后代码里 if/else 还在,无人敢碰
- **新实现没切流量就 merge 进 main**:dead code 累积
- **切到 100% 后不删老实现**:双份维护 + 后人不知道走哪条路
- **新老报错语义不一致**:调用方两边都要 catch,丑得要命
- **接口故意复杂以包容未来"另一个候选"**:不要,等真有候选时再扩接口

## 决策辅助清单(给 arch-design)

- [ ] 老实现的边界清晰吗?能在 1 周内抽出干净接口?
- [ ] 接口是否仅封装现有语义?有"为未来想象"吗?
- [ ] 新老共用持久化吗?如何兼容?
- [ ] 切换由 flag 控制?flag 系统可靠吗?
- [ ] 灰度比例 + SLI 监控有吗?
- [ ] **删除老实现的时间表**写下来了吗?

## 参考

- Paul Hammant, Jez Humble — "BranchByAbstraction"
- "Continuous Delivery" — Humble & Farley (Ch. 13)
- "Refactoring" — Martin Fowler (Strangler-like refactors)
