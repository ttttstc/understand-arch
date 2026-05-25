# `specs/overview.md` Template

> 用途:稳定的人类入口。只总结 `specs/*.yaml`、活跃 CR、ADR 中已经存在的事实;**不创建新事实**。
>
> 本模板让不同 LLM / 不同时间跑出来形态一致、长度可控、内容可追溯。

## 硬约束

1. **固定 11 段顺序**,任何一段都不允许整段省略(若 source 不足,该段写"暂无 / 待补 — 见 known_unknowns Q-NNN")
2. **全文 ≤ 200 行**(含 frontmatter 与空行),超出 = arch-pack 失败重试
3. **每段单独 ≤ 段上限**(见各段标题旁注)
4. **任何数字 / 表格行必须可追溯到 specs/*.yaml 字段或 ADR / CR 路径**
5. **禁止弱化词**:"应该 / 通常 / 大概 / 一般" → 一律走"已知/未知"二分
6. **风险与技术债分开呈现**(不允许混在一张表)

## 段骨架

```markdown
# {项目名} — 架构基线概览

> Baseline: <repo>@<short_commit> · 最后刷新 <YYYY-MM-DD HH:MM> · 新鲜度 <fresh|possibly_stale|stale|unknown>

## 1. 一句话定位 (≤3 行)

{项目名}是一个 {系统类型}, 主要服务 {目标用户/调用方}, 当前 {阶段}。

**必答**: 是什么 / 服务谁 / 在哪个阶段?
**来源**: `specs/baseline.yaml#project.description`

## 2. 当前目标与边界 (≤10 行)

**当前目标**:
- {目标 1} `← baseline.yaml#project`
- {目标 2}

**明确不做**:
- {non-goal 1}

**主要场景**:
{1-2 句话}

**必答**: 当前 1-3 个最重要目标 / 显式不做什么 / 主要场景?
**来源**: `baseline.yaml#project` + 活跃 CR `cr.md` 头部

## 3. C4 图导览 (≤8 行)

- [`context.mmd`](diagrams/c4-context.mmd) — 系统边界 + 外部系统
- [`container.mmd`](diagrams/c4-container.mmd) — 主要部署单元 + 协议
- (按 `critical_flows` 决定是否加序列 / 数据流 / 部署图)

**必答**: 哪些 C4 图存在 + 各自看什么?
**来源**: `specs/diagrams/*.mmd`

## 4. 主要仓库与组件 (≤20 行)

| 仓库 | 主语言 | Owner | 主要 component | 一句话 |
|---|---|---|---|---|
| {repo} | {lang} | {owner_or_unknown} | {component} | {one-liner} `← baseline.yaml#components` |

**必答**: 仓库清单 + 各仓主要 component + 一句话职责?
**来源**: `baseline.yaml#repositories` + `baseline.yaml#components`

## 5. 关键接口与依赖 (≤15 行)

- **对外接口**: {N} 个 API / {M} 个事件(完整清单见 `baseline.yaml#interfaces`)
- **关键外部依赖**:
  - {dep-name} — owner {team}, SLA {target}, 缺位影响 {scope}

**必答**: 对外接口数 + 关键事件数 + 关键外部依赖 + 各依赖的 owner/SLA?
**来源**: `baseline.yaml#interfaces` + `baseline.yaml#external_dependencies`

## 6. 关键业务链路 (≤15 行)

| 链路 | 触发 | 主要组件 | 失败影响 |
|---|---|---|---|
| {flow_id} | {trigger} | {comp1 → comp2 → comp3} | {impact} `← baseline.yaml#critical_flows` |

**必答**: 至少 3 条 critical_flow 的"触发 → 主要组件 → 失败影响"?
**来源**: `baseline.yaml#critical_flows`

## 7. 关键数据模型与所有权 (≤15 行)

| 数据模型 | Owner | 写边界 | 兼容/回滚 |
|---|---|---|---|
| {model} | {owner} | {who_writes} | {compat_strategy} `← baseline.yaml#data_models` |

**必答**: top 5 数据模型的"owner + 谁能写 + 兼容策略"?
**来源**: `baseline.yaml#data_models` + `baseline.yaml#ownership`

## 8. 部署与运行约束 (≤12 行)

- **部署单元**: {N} 个,形态 {容器/VM/桌面/serverless}
- **关键 runtime config**: {会改变调用路径的配置清单}
- **核心 NFR 目标**: 可用性 {N%} · p99 latency {N ms} · 成本预算 {$/月}
- **回滚最难处**: {若有,1-2 行}

**必答**: 部署形态 + 关键 runtime config + 核心 NFR 目标值 + 回滚硬点?
**来源**: `baseline.yaml#deployment_units` + `quality.yaml#runtime_constraints` + `quality.yaml#nfrs`

## 9. Top 风险与 Top 技术债 (5 + 5 行)

**🔴 Top 5 风险**(按 severity desc):

| ID | 标题 | 影响 | Owner | 状态 |
|---|---|---|---|---|
| R-001 | {title} | {scope} | {owner} | {status} `← risks.yaml#risks` |

**🟡 Top 5 技术债**(按 impact):

| ID | 标题 | 类别 | 偿还策略 | Owner |
|---|---|---|---|---|
| D-001 | {title} | {category} | {paydown_strategy} | {owner} `← risks.yaml#tech_debt` |

**必答**: 各前 5 项,**两者分开呈现**?
**来源**: `risks.yaml`

## 10. 关键决策与活跃 CR (≤15 行)

**最近 ADR**:
- [ADR-NNN]({path}): {一句话} ({date}) `← decisions.yaml#accepted`

**活跃 CR**:
- [{CR-id}](../change-requests/{cr-id}/cr.md) — {状态 frame/impact/review/ready} — {一句话} `← state.yaml#active_cr`

**必答**: 最近 5 个 accepted ADR + 当前活跃 CR(若有)?
**来源**: `decisions.yaml#accepted` + `state.yaml#active_cr`

## 11. 新鲜度与已知未知 (≤10 行)

- **状态**: {fresh|possibly_stale|stale|unknown}
- **上次扫描**: <repo>@{commit} ({date})
- **当前**: <repo>@{commit}
- **变化命中**: {N} 个架构敏感文件 `← baseline.yaml#changed_files_since_scan`
- **Known unknowns**: {N} 项,top:
  - [Q-NNN] {一句话}

{如果 status != fresh,**必须**给中文 refresh 建议:}
> 当前架构基线可能已过期。代码变化命中了 {命中类型},建议运行 `/arch:onboard --refresh` 后再继续设计或审计。

**必答**: freshness + commit 对照 + 命中文件数 + known_unknowns 数量 + (非 fresh 时)refresh 建议?
**来源**: `baseline.yaml#freshness_status` + `#changed_files_since_scan` + `#known_unknowns`
```

## 反幻觉硬规则

每条要写进 overview.md 的句子,arch-pack 必须能回答:

1. **来源是什么?** — 必须能指到 `specs/*.yaml#path` 或 `decisions/ADR-NNN.md` 或活跃 `change-requests/CR-*/cr.md`
2. **数字从哪来?** — 任何数字(组件数 / NFR 目标值 / risk severity)必须来自 YAML 字段,不能是估算
3. **是否被掩盖?** — known_unknowns 不允许在 overview 中"包装成已知"

若某段 source 不足,该段写:
```markdown
> 当前 baseline 暂未覆盖本段。原因见 `baseline.yaml#known_unknowns.Q-NNN`,
> 建议运行 `/arch:onboard --refresh` 后再补。
```

**禁止**:
- 用"应该""通常""大概"等弱化词包装事实
- 引入 ADR / risk 编号但不附路径
- 自由发挥的"系统介绍"段落 — 一切走模板

## Self-check(arch-pack 跑完后逐项过)

- [ ] 11 段都在?顺序对?
- [ ] 全文 ≤ 200 行?
- [ ] 每段 ≤ 段上限?
- [ ] 每个数字 / 表格行可追溯到 specs?
- [ ] frontmatter Baseline / 刷新时间 / 新鲜度 三段齐?
- [ ] 没有 "应该" "通常" "大概" 等弱化词?
- [ ] 风险与技术债分开呈现(不同表格)?
- [ ] 活跃 CR(若有)被链出?
- [ ] 新鲜度 != fresh 时附了中文 refresh 建议?

任意未通过 = arch-pack 重试(最多 2 次),仍不过 → 升级用户决策。

## 给 verify loop 的 hook

arch-pack 跑完产 overview.md 时,在 `.metrics.jsonl` 追加:

```json
{
  "skill": "arch-pack",
  "artifact": "specs/overview.md",
  "line_count": 187,
  "sections_present": 11,
  "self_check_passed": true,
  "source_artifacts_cited": ["specs/baseline.yaml", "specs/risks.yaml", "decisions/ADR-001.md"],
  "hallucination_flags": []
}
```

这是 Eval Loop 在 v1.1 自动化"overview 稳定性回归测试"的钩子。

## 与 generated/wiki/ 的关系

- `overview.md`(本文): **1 页稳定入口**,200 行硬上限
- `generated/wiki/01-05`: 展开视图,每页详细 — 是 overview 的下钻,**不重新引入事实**

| overview 段 | 对应 wiki 页 |
|---|---|
| 4. 主要仓库与组件 | `01-系统全景.md` + `02-组件与依赖.md` |
| 5. 关键接口与依赖 | `02-组件与依赖.md` |
| 6-7. 业务链路 / 数据 | `03-数据与关键链路.md` |
| 8. 部署与运行 | `04-质量属性与运行约束.md` |
| 9-10. 风险 / 决策 | `05-风险、决策与近期变更.md` |

overview ≠ wiki 摘要,**overview 是稳定入口**,wiki 是展开。
