---
name: arch-pack
description: |
  人类视图导出器。把 `specs / CR / ADR` 组装成 `generated/overview.md`、onboarding wiki、brief 等可读材料。**只重组现有事实**,不创造新事实。**完全不动 `specs/**`**;所有人类视图落在 `generated/` 下。

  触发词: 生成 wiki / 出汇报 / 给领导看 / 整理一份给新人 / 导出说明

  本 skill 不生成结构化基线,不替代 ADR,不写代码。
---

# arch-pack

## 角色定位

- 只负责"给人看"
- 输入是可信事实(specs/CR/ADR),输出是可读视图
- **稳定的人类入口是 `generated/overview.md`**(归 generated/,不再在 specs/)
- `generated/wiki/` 是展开视图,不是事实源

## 输入

- `specs/*.yaml`(全)
- 可选 `change-requests/CR-*`
- 可选 `decisions/ADR-*`
- `audience=onboarding|management|engineering`

## 输出

| 路径 | 何时产 |
|---|---|
| `generated/overview.md` | 任何 audience 都更新(1 页稳定入口) |
| `generated/wiki/01-06.md` | audience=onboarding(6 页,新增 06-能力雷达) |
| `generated/audit/{date}-健康度.md` | `/arch-audit` 收尾时(系统问题集成视图) |
| `generated/briefs/{audience}-{date}.md` | audience=management|engineering |
| `generated/diagrams/*` | 给 wiki/brief 嵌图时(委托 arch-diagram) |

## 约束

1. **不发明新事实** — 每条结论必须能追溯到 `specs/*.yaml` 字段、ADR 路径或活跃 CR
2. **不写 `specs/**`** — 关键边界。即便 overview.md 看起来像"specs 的解释",它依然落在 `generated/`
3. 管理层摘要简短(≤1 页),强调风险、决策、影响
4. onboarding wiki 解释系统现状,不是直接转储 YAML
5. overview 和 5 页 wiki **不能各自维护不同版本的事实** — 都从同一份 specs 重组

## 人类视图分层

### 1 页稳定入口:`generated/overview.md`

任何人第一次进入项目应先读的一页。**11 段固定结构,200 行硬上限**(详见 `references/overview-template.md`)。回答:

- 这是什么系统
- 主要由哪些仓库与组件构成
- 关键接口、依赖、数据、部署约束是什么
- 现在最大的风险、技术债、关键决策、活跃 CR 是什么
- 这份基线是否过期

### 展开视图:`generated/wiki/`

audience=onboarding 时默认生成固定 6 页(`references/wiki-pages-template/`):

1. `01-系统全景.md`
2. `02-组件与依赖.md`
3. `03-数据与关键链路.md`
4. `04-质量属性与运行约束.md`
5. `05-风险、决策与近期变更.md`
6. `06-能力雷达.md`(业务能力地图视图,从 `specs/baseline.yaml#capabilities[]` 重组)

每页规则:
1. 每页只回答一类问题
2. 先结论,后细节
3. 允许引用图,但图不是唯一表达
4. source 不足时显式写 `known unknowns`,不脑补

### 系统问题集成视图:`generated/audit/{date}-健康度.md`

`/arch-audit` 收尾时由 arch-pack 聚合产出:risks / debt / open_questions / KB 漂移 / drift findings / 业界反模式命中,**零新事实**,固定 10 段(评分 / blocking / high / medium 摘要 / open questions / KB 漂移 / 反模式命中 / drift 结果 / 改造路线图 / non-recommendations),全文 ≤ 250 行硬上限。详见 `references/health-check-template.md`。

### 受众化摘要:`generated/briefs/`

audience=management|engineering 时产 `{date}-{audience}.md`。

## 验收

- `generated/overview.md` 已更新(11 段齐 + ≤200 行)
- 若 audience=onboarding,5 页 wiki 全产出
- 若 audience=management|engineering,brief 已落在 `generated/briefs/`
- 关键结论可回链到 specs/CR/ADR

## 降级

- 缺少足够 source artifacts:提示先跑 onboard 或 design
- 某些图缺失:允许仅输出文字版
- 某页 source 不足:保留页面结构,显式标注 `known unknowns`

## Write Scope

完整定义见 `internal/tool-contracts/write-scope.yaml#skills.arch-pack`。

- ✅ 可写:
  - `generated/overview.md`(11 段固定结构,≤200 行硬上限)
  - `generated/wiki/*.md`(onboarding 时 6 页)
  - `generated/audit/{date}-健康度.md`(/arch-audit 收尾时,≤250 行)
  - `generated/briefs/*.md`
  - `generated/diagrams/*`(委托 arch-diagram 时)
- ❌ **严格禁写** `specs/**`(关键边界 — arch-pack 不动事实层)
- ❌ 禁写 `decisions/**` / `change-requests/**` / `state.yaml`

### state_delta
```yaml
state_delta:
  current_phase: brief_generated
  history_append:
    ts: "..."
    skill: arch-pack
    action: brief_generated
    status: ok
    ref:
      audience: onboarding|management|engineering
      target_paths: ["generated/overview.md", "generated/wiki/...", ...]
```

## 参考

- `docs/spec-v1.0.md`
- `internal/tool-contracts/write-scope.yaml`
- `internal/acceptance/brief.yaml`
- `references/wiki-playbook.md`
- `references/overview-template.md`
- `references/wiki-pages-template/01-系统全景.md`
- `references/wiki-pages-template/02-组件与依赖.md`
- `references/wiki-pages-template/03-数据与关键链路.md`
- `references/wiki-pages-template/04-质量属性与运行约束.md`
- `references/wiki-pages-template/05-风险、决策与近期变更.md`
- `references/wiki-pages-template/06-能力雷达.md`
- `references/health-check-template.md`
