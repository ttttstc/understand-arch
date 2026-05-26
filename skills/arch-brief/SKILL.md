---
name: arch-brief
description: |
  从 specs / CR / ADR 生成给人看的视图:更新 generated/overview.md(1 页稳定入口) + 按 audience 产 onboarding wiki(6 页)或 management/engineering brief。零新事实,每条结论可回链 source artifact。

  触发词: 出 wiki / 出汇报 / 给 CTO 看 / 整理一份说明 / 给新人写个入门 / executive summary / /arch-brief

  本 skill 不创造新事实,不修 specs。
---

# arch-brief — 生成人类视图

## 角色

- 用户级入口,直接触发 brief 流程
- 自己编排 brief 链路;共享逻辑读 `internal/orchestration/playbook.md`
- 维护 `state.yaml`(本 skill 活跃期间作为单 writer)
- **零新事实**(只重组现有 specs / CR / ADR)

## 输入

- `${ARCH_PROJECT_DIR}`
- `--audience=onboarding|management|engineering`(默认 onboarding)
- 可选 `--source=specs|cr|adr-set`(默认 specs)
- 可选 `--cr <cr-id>`(audience=engineering 时聚焦某 CR)

## 输出

| 路径 | 何时产 |
|---|---|
| `generated/overview.md`(11 段 ≤200 行) | 任何 audience 都刷新 |
| `generated/wiki/01-06.md`(6 页) | audience=onboarding |
| `generated/briefs/{date}-{audience}.md` | audience=management|engineering |
| `generated/diagrams/*`(若嵌图) | 条件 |
| `state.yaml`(history append) | 总是 |

## 链路(5 step)

1. **prereq 检查**: specs/ 完整?不完整 → 中文提示先 `/arch-onboard`
2. **source 选定**: 默认 specs;audience=engineering + `--cr` → 聚焦该 CR + relevant specs 段
3. **dispatch arch-pack**: 按 audience + source 生成产物:
   - 任何 audience: 更新 `generated/overview.md`(11 段固定,详见 `arch-pack/references/overview-template.md`)
   - onboarding: 6 页 wiki(`arch-pack/references/wiki-pages-template/01-06.md`)
   - management: ≤1 页摘要,聚焦风险 / 决策 / 影响 / 资源诉求
   - engineering: 中等长度,聚焦依赖 / 接口 / 数据边界 / 运行约束 / 当前 CR writeback
4. **dispatch arch-diagram**(必要时): source=generated-view,把派生图嵌进 wiki/brief
5. **dispatch arch-review** 内部 review: 检查"没有发明新事实"(关键结论 vs specs 字段比对)

## 关键路口(用户确认)

- **audience 不明**: 若用户没指定,中文询问"给谁看?onboarding(新人入职)/ management(领导汇报)/ engineering(同事 review)"
- **source 不足**: 若 specs / CR / ADR 不够支撑 audience 期望深度,中文告知并建议先 `/arch-design` 或 `/arch-onboard --refresh`

## acceptance

跑完 `internal/acceptance/brief.yaml`:
- structural: generated-brief + overview-line-budget(≤200 行) + no_writes_outside_scope
- semantic 3 项: audience-fit / source-faithful / content-complete
- 失败 2 次 retry → 第 3 次升级用户决策

## 硬规则

1. **零新事实**: 每条结论必须能追溯到 `specs/*.yaml` 字段、ADR 路径或活跃 CR
2. management 摘要 ≤1 页(超出 = arch-pack 失败 retry)
3. overview.md 严格 ≤200 行 + 11 段固定结构
4. 禁止 weasel words("应该""通常""大概""一般" → 一律走"已知/未知"二分)
5. 风险与技术债**强制分开呈现**(不允许混在一张表)
6. 不允许 brief 引入 specs/ 之外的事实

## 降级

| 失败模式 | 行为 |
|---|---|
| source 不足 | 保留页面结构,显式标 `known unknowns`,不脑补 |
| 某些图缺失 | 允许仅输出文字版,标 "图待补" |
| overview 超 200 行 retry 2 次仍失败 | 写盘但标 degraded,提示缩减 |
| 内部 review 检测到新事实 | 强制 retry,定位违规句 |

## Write Scope

完整定义见 `internal/tool-contracts/write-scope.yaml#skills.arch-brief`。

- ✅ 可写:`state.yaml` · `.metrics.jsonl`
- ✅ 子 skill 间接写:`generated/overview.md` · `generated/wiki/**` · `generated/briefs/**` · `generated/diagrams/**`(arch-pack / arch-diagram 落盘)
- ❌ 禁写:`specs/**`(关键边界 — brief 不动事实层) · `decisions/**` · `change-requests/**`

## 参考

- `internal/orchestration/playbook.md`
- `internal/acceptance/brief.yaml`
- `skills/arch-pack/references/overview-template.md`(overview 11 段)
- `skills/arch-pack/references/wiki-pages-template/01-06.md`(6 页 wiki 模板)
- `skills/arch-pack/references/health-check-template.md`(audit 用,但 audience=management 可借鉴评分维度)
