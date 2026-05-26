# 健康度集成视图模板 (`generated/audit/{date}-健康度.md`)

> 由 `arch-pack` 在 `/arch-audit` 收尾时聚合多个事实源产出。
>
> **核心:零新事实**。本视图只重组下面 5 个来源,任何不能追溯到来源的句子都不允许:
>
> 1. `specs/risks.yaml`(风险 + 技术债)
> 2. `specs/decisions.yaml#open_questions`(待答问题)
> 3. `specs/quality.yaml#org_constraints`(KB 漂移命中)
> 4. `arch-library/anti-patterns/*.md`(业界反模式命中清单 — 由 arch-review 在 audit 中产出 findings 后转写)
> 5. `arch-review --mode=drift` findings(若用户跑了 drift audit)

## 硬约束

1. **固定 8 段顺序**,任何一段不允许整段省略(数据空时写"无,目前无 X")
2. **不发明新事实** — 每条结论必须能指到上 5 个来源中的具体 yaml 字段 / md 章节
3. **风险与技术债分开呈现**(沿用 overview 的硬规则)
4. **按严重度排,blocking 项最前**
5. 全文 ≤ 250 行硬上限(超出 = arch-pack 重试)

## 段骨架

```markdown
# {项目名} — 架构健康度 ({YYYY-MM-DD})

> Baseline: <repo>@<short_commit> · 新鲜度 <fresh|possibly_stale|stale|unknown> · 上次 audit <date>

## 1. 健康度评分

| 维度 | 分 (5 分制) | 一句话 | 趋势 |
|---|---|---|---|
| 设计一致性 | {N} | | {↑↓→} |
| 代码工程质量 | {N} | | |
| 可观测性 / 测试 | {N} | | |
| 可演进性 | {N} | | |
| 文档与决策史 | {N} | | |
| 合规与安全 | {N} | | |
| **总分** | **{X / 5}** | {一句话总评} | |

> 趋势对比上次 audit(若有):↑=改善 / ↓=恶化 / →=无变化。首次 audit 无趋势,留空。

## 2. Blocking 级问题(必须本周内动)

按"对业务影响 × 是否阻塞下一步演进"排,**只列真 blocking**。无 blocking 则写"无"。

| ID | 标题 | 类别 | 影响范围 | Owner | 建议动作 |
|---|---|---|---|---|---|
| {R-NNN / D-NNN / Q-NNN} | {一句话} | risk / debt / question | {scope} | {owner} | {一句话} |

## 3. High 级问题清单

### 🔴 High 风险

| ID | 标题 | 影响 | Mitigation | Owner | 引用 |
|---|---|---|---|---|---|
| R-NNN | | | | | `← risks.yaml#risks.R-NNN` |

### 🟡 High 技术债

| ID | 标题 | 类别 | 偿还策略 | Owner | 引用 |
|---|---|---|---|---|---|
| D-NNN | | | | | `← risks.yaml#tech_debt.D-NNN` |

## 4. Medium / Low(摘要)

仅列计数 + 链接,详情见 `specs/risks.yaml`。

- Medium: {N} 风险 / {M} 技术债
- Low: {N} 风险 / {M} 技术债
- 长期未 review 的(`last_reviewed` > 90 天): {N} 条

## 5. 待答问题(Open Questions)

| ID | 问题 | 阻塞 | Owner 建议 | 引用 |
|---|---|---|---|---|
| Q-NNN | | | | `← decisions.yaml#open_questions.Q-NNN` |

## 6. 与 Org KB 漂移

> 来源:`quality.yaml#org_constraints`(banned_patterns / compliance_redlines / network_boundaries / naming_conventions / tech_radar)

| 类别 | 命中条目 | 漂移说明 | 引用 |
|---|---|---|---|
| banned_patterns | {pattern} | | `← quality.yaml#org_constraints.banned_patterns` |
| compliance_redlines | | | |
| network_boundaries | | | |
| naming_conventions | | | |
| tech_radar | | | |

若 KB 未配置(`org_constraints.loaded_from: "(none)"`),本段写:
> Org KB 未配置,本段 degraded。建议在 ~/.understand-arch/kb/ 配置组织级约束后再次 audit。

## 7. 业界反模式命中

> 来源:`arch-library/anti-patterns/*.md`,由 `arch-review` 在 audit 中输出。

按"分布式单体 / 假数据隔离 / Chatty / Observability Gap / 共享代码 / 无契约测试 / 每服务每 DB / 跨服务事务 / 服务粒度漂移 / CI 跟不上 / 缺 owner / 无降级"12 类逐条标:

- ✅ 没问题
- ⚠️ 有迹象({证据})
- ❌ 已踩({影响} → 已落 {R-NNN})

无微服务架构的项目跳过(写"本系统非微服务架构,本段跳过")。

## 8. Drift Audit 结果(若已跑)

若用户在本次 audit 中跑了 `arch-analyze --mode=drift-audit`,本段列:

- 命中架构敏感文件变更数: {N}
- Drift 分级: blocked / degraded / ready
- 关键 drift findings(前 5):
  - {一句话} — 建议 refresh {specs 文件名}

若未跑,本段写:
> 本次 audit 未跑 drift 校验。如需验证 specs 是否真与代码偏离,运行 `/arch-audit --drift`。

## 9. 改造路线图

按"对用户损害 × 是否阻塞 v-next 演进"排:

| 阶段 | 时间 | 动作 | 验收 | 来源 |
|---|---|---|---|---|
| 紧急 | 本周 | {Top blocking 项动作} | {可验证标准} | {R-NNN / D-NNN} |
| 短期 | 1-2 sprint | | | |
| 中期 | 1 季 | | | |
| 长期 | 半年+ | | | |

## 10. 不推荐做的事(non-recommendations)

显式列出**看起来该做但不推荐**的事 — 防陷合理化陷阱。每条带原因。

- ❌ {一句话} — 原因:{为什么}
```

## 反幻觉规则(沿用 overview 模板)

1. 每条数字 / 表格行可追溯到 `specs/*.yaml` 字段或 `arch-library/anti-patterns/*` 章节
2. **禁止**"应该 / 大概 / 通常 / 一般"等弱化词
3. KB 未配置 / drift 未跑等情况显式写出,不能"装作没事"
4. 评分(§1)的依据必须能从其他段找到(eg. "可观测性 / 测试 2/5" 应配套 §3 里相应 D-NNN debt)

## Self-check

- [ ] 8 段全在?顺序对?
- [ ] 全文 ≤ 250 行?
- [ ] §2 Blocking 数 = §3 中 severity=critical 的真子集?
- [ ] §7 反模式 12 类全标(微服务项目)?
- [ ] §9 改造路线图各阶段都有来源 ID?
- [ ] §10 至少 1 条 non-recommendation?

## 与其他产物的关系

- 本视图是 `/arch-audit` 的**主输出**;`generated/overview.md` 不重复本视图详情,只在第 11 段写"上次 audit: {date},总分 {X/5},详情见 audit/{date}-健康度.md"
- 本视图**不替代** `risks.yaml` 等 specs 事实源;删了本视图无所谓(下次 audit 重生成)
