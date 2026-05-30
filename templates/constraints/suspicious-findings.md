# 反常点清单(Suspicious Findings)

> 由 onboard 阶段的 arch-constraint-miner **自动侦查**产出(不是访谈时临时做)。
> 作用:① 埋雷预警 —— 哪怕没人访谈,这份清单本身就是给架构师/新人的风险地图;
>       ② 访谈来源 —— `/arch-interview` 读取本文件,从高分反常点开始 grill 老员工。
> 结构见 `internal/schemas/suspicious-finding.schema.json`。本文档默认中文。

## 侦查的 7 类反常点

| 类型 | anomaly_type | 信号 |
|---|---|---|
| 奇怪实现 | odd-implementation | 同步本可异步 / 深嵌套 / 绕路调用 |
| 定制逻辑 | custom-logic | 针对特定值/客户/环境的 if / magic number |
| 逻辑不通 | illogical | 恒真恒假条件 / 写了不用的返回 / 矛盾校验 |
| 无效/可疑引用 | invalid-reference | 孤立节点 / import 不用 / 高频依赖却无测试 |
| 吞掉异常 | swallowed-exception | catch 空处理 / 错误静默 |
| 反模式但稳定 | stable-antipattern | 上帝模块 / 循环依赖 / 跨层调用却一直没改 |
| 有冲突 | conflicted | 代码/测试/文档/考古结果互相矛盾 |

## 反常点(按可疑度 × 影响面 排序)

### SF-NNN:{标题}
- 类型:{anomaly_type}
- 位置:{file:line 或 node id}
- 怀疑理由:{AI 为什么觉得反常,详细}
- 推测:{可能的原因}
- 可疑度:{1-10}
- 影响面:low | medium | high | critical
- 状态:pending-interview | answered | converted-to-constraint | dismissed
- 解答:{受访人 + 日期,若已访谈}
- 关联约束:{CON-xxx,若已转约束}

---

示例:

### SF-008:支付超时被同步阻塞处理
- 类型:odd-implementation
- 位置:`services/payment/handler.ts:142`
- 怀疑理由:支付主链路用同步阻塞等待对账服务返回,会拖慢响应;通常这类应异步
- 推测:可能是有意为之(强一致需求),也可能是历史遗留
- 可疑度:8
- 影响面:high
- 状态:pending-interview
