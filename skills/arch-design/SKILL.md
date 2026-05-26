---
name: arch-design
description: |
  围绕一次需求或变更创建 change-requests/CR-*/:产 cr.md(需求 + 设计入口)+ impact.yaml(8 维影响面)+ 条件 options.md(方案分歧时)+ 条件 ADR(durable decision)+ review.yaml(readiness gate)+ writeback 计划。是设计单次架构变更的入口。

  触发词: 根据 PRD 设计 / 设计这次变更 / 需求怎么落架构 / 开 CR / 出 RFC / 出实施方案 / 迁移方案 / 重构方案 / 拆分 / 拆服务 / /arch-design

  本 skill 不写业务代码。
---

# arch-design — 创建 CR 设计单次变更

## 角色

- 用户级入口,直接触发 design 流程
- 自己编排 design 链路;共享逻辑读 `internal/orchestration/playbook.md`
- 维护 `state.yaml`(本 skill 活跃期间作为单 writer)

## 输入

- PRD / 需求描述 / issue / 用户对话
- `${ARCH_PROJECT_DIR}`
- 可选 `--cr-slug <kebab-case>`
- 可选 `--continue`(续跑 `state.yaml#active_cr`)

## 输出

| 路径 | 何时产 |
|---|---|
| `change-requests/CR-YYYY-NNN-{slug}/cr.md` | 总是 |
| `change-requests/CR-*/impact.yaml`(8 维) | 总是 |
| `change-requests/CR-*/options.md` | 条件:真实方案分歧时 |
| `decisions/ADR-NNN-*.md`(append-only) | 条件:durable decision 时 |
| `change-requests/CR-*/review.yaml`(readiness gate) | 总是 |
| `change-requests/CR-*/traceability.yaml` | 总是 |
| `agent/证据/影响面-{cr-slug}.yaml`(若用 ua-augmented) | 条件 |
| `state.yaml`(`active_cr` + history append) | 总是 |

## 链路(7 step)

1. **freshness 前置检查**: 读 `specs/baseline.yaml#freshness_status`。stale / unknown 时**中文提示**用户先 refresh(或显式继续);详见 `internal/orchestration/playbook.md` § freshness
2. **dispatch arch-frame**: 创建 CR(若新需求)或恢复 active_cr;加载 org KB 注入 `kb_loaded`;PRD HARD GATE 检测(≥3 个 specific 未答问题 → 阻塞产 PM问题清单.md)
3. **dispatch arch-diff-judge**: 基于 specs 产 `impact.yaml`(8 维:services / modules / apis / data_models / events_messages / permissions / deployments / configs)+ scope_boundary + rollback_strategy
4. **dispatch arch-options**(条件): 真实架构分歧时(≥2 可行路径 / 数据模型策略差异 / 触碰 KB 红线分支),产 options.md
5. **dispatch arch-adr**(条件): durable decision(跨 CR / 改边界 / 影响组织约束)时,产 ADR-NNN-*.md(append-only)
6. **dispatch arch-review**: mode=cr,产 review.yaml(readiness=ready / degraded / blocked)
7. **writeback 计划**: review.yaml.readiness=ready 后,产 writeback proposal(更新哪些 specs 字段、为什么、来自哪个 CR)

## 关键路口(用户确认)

- **HARD GATE 触发**: 命中 ≥3 specific 问题时,workflow 暂停在 `awaiting-pm-confirmation`,中文列问题,用户在 `PM问题清单.md` 答完后继续
- **stale 提示**: freshness 不通过时,先问"建议刷新 specs 再设计;是否先跑 onboard --refresh?"
- **options 选择**: arch-options 产多方案时,用户选定后才进 arch-adr

## acceptance

跑完 `internal/acceptance/design.yaml`:
- structural: cr-files + cr-schemas + no_writes_outside_scope + adr-append-only
- semantic 4 项: impact-depth / dependency-and-data / rollback / writeback-ready
- 失败 2 次 retry → 第 3 次升级用户决策

## 硬规则

1. PRD 不清晰时(HARD GATE 命中)**必须阻塞**,不允许凭空设计
2. `impact.yaml` 8 维必须显式覆盖(无影响维度也要写 `no_impact` + 理由)
3. 数据模型变化必须含 migration / backfill / compatibility / rollback_strategy
4. 回滚策略**不允许只写 "revert PR"**(必须覆盖 code/config/data/deploy 4 类)
5. **CR 一旦 review.yaml.readiness=ready,整目录禁重写**(只能新 CR 或 OVR override)
6. 老 ADR markdown 文件**永不修改**;supersede 关系记 `specs/decisions.yaml#superseded[]`
7. 触碰 org KB 红线不允许隐藏

## 降级

| 失败模式 | 行为 |
|---|---|
| 输入只有一句话 | 允许建轻量 CR,在 cr.md 标 known_unknowns 提示用户补充 |
| baseline 太弱 | 中文提示先 refresh,但用户可 override 继续(留 OVR-NNN) |
| 某 impact 维度证据不足 | 保留 best effort,进入 derived_risks 或 known_unknowns |
| arch-review failed 3 次 | 写盘 readiness=blocked,详列阻塞项 |

## Write Scope

完整定义见 `internal/tool-contracts/write-scope.yaml#skills.arch-design`。

- ✅ 可写:`state.yaml`(限本次 CR 范围) · `.metrics.jsonl`
- ✅ 子 skill 间接写:`change-requests/${active_cr}/**` · `decisions/ADR-NNN-*.md`(只新建,不改老 ADR)· `agent/证据/影响面-{cr}.yaml`
- ❌ 禁写:`specs/**`(specs 修改走 writeback 流程,不在 design 阶段直改) · `generated/**`(归 brief)

详见 `internal/orchestration/playbook.md` § state_delta merge protocol。

## 参考

- `internal/orchestration/playbook.md`
- `internal/acceptance/design.yaml`
- `internal/schemas/cr-impact.schema.json` / `cr-review.schema.json` / `cr-traceability.schema.json`
- `skills/arch-frame/SKILL.md`(HARD GATE)
- `skills/arch-diff-judge/references/impact-playbook.md`
- `skills/arch-options/references/options-rubric.md`
- `skills/arch-adr/references/adr-playbook.md`
