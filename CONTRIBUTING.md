# Contributing to understand-arch

> 本文件是 v1.0 新主线的实现入口。任何贡献都应先把仓库对齐到 `specs + CR + governance` 模型，再补细节。

## 项目现状

- **v0.2.x(当前)**: 仓库里仍混有旧的“交付件工厂”实现痕迹。
- **v1.0 目标**: 完整落地 [docs/spec-v1.0.md](./docs/spec-v1.0.md) 定义的 `specs baseline + change request delta + internal review gate + generated views` 方案。

## 设计源文档(开工前必读)

1. **[docs/spec-v1.0.md](./docs/spec-v1.0.md)** —— v1.0 canonical 规格
2. **[docs/office-hours-2026-05-24.md](./docs/office-hours-2026-05-24.md)** —— 设计诊断、架构事实源、schema 草图来源

## 当前设计原则

1. **specs 是稳定事实源**  
   只读 `arch/{project}/specs/`，就应能生成架构现状报告、风险与技术债审视，以及 4+1 视图覆盖判断。
2. **CR 记录单次变更 delta**  
   每次变更只维护相对基线的差异，不复制全量架构。
3. **同一事实只维护一次**  
   Agent 事实用 YAML，给人看的解释用 `overview.md` 与 `generated/` 视图。
4. **Governance 即 moat**  
   append-only ADR、traceability、evidence_refs、acceptance、org KB、writeback gate 是核心价值。
5. **用户可见交互中文优先**  
   用户提示、审计结果、刷新建议默认中文。

## 边界

✅ 可产: `*.md` / `*.yaml` / `*.mmd` / `*.svg|*.png`  
❌ 不产: Terraform / Helm / Pulumi / DDL / ORM migration / CI workflow / 服务骨架 / OpenAPI client / 业务代码

任何要求生成代码、IaC、pipeline 的请求都必须拒绝，并提示用户改用专门的 coding agent 或基础设施工具。

## Build Order

| # | 实施面 | 目标 |
|---|---|---|
| 1 | `internal/schemas/` | 用 `state + specs + CR + org KB` 替换旧 5+1 schema 模型 |
| 2 | `internal/acceptance/` | 用 `specs / audit / CR / brief` 验收替换旧交付件数量验收 |
| 3 | `skills/arch-workflow/` | 收敛为 4 个用户入口: `onboard / design / audit / brief` |
| 4 | `skills/arch-analyze/` | 产出/刷新 `specs/`，实现受控扫描与 freshness 判定 |
| 5 | `skills/arch-frame/` | 创建 CR、加载 org KB、在 design 前做问题界定 |
| 6 | `skills/arch-diff-judge/` | 基于 specs 产 `impact.yaml` |
| 7 | `skills/arch-review/` | 变成内部 gate，负责 specs 审视、CR 审视、drift audit |
| 8 | `skills/arch-adr/` | 仅记录 durable decision，append-only |
| 9 | `skills/arch-diagram/` | 从 specs/CR 生成 Mermaid 与可选 SVG/PNG |
| 10 | `skills/arch-pack/` | 只做 wiki / brief / report 视图导出，不做事实生产 |
| 11 | `skills/arch-options/` / `skills/arch-radar/` | 条件调用，不进入默认主链 |
| 12 | `arch/_template/` / `arch/README.md` | 对齐新目录结构与用法 |
| 13 | `arch-library/` | 只保留对新 workflow 真有帮助的 seed 内容 |
| 14 | `internal/phases/eval-design.md` | 适配新 `change-requests/` 路径与内部插入逻辑 |

## 实现约定

- 每个 `SKILL.md` 必须说明:
  - 角色定位
  - 输入输出契约
  - 关键流程
  - 硬规则
  - 验收
  - 降级
- 任何会扫描代码或大范围读仓的 skill 都要明确:
  - 是否必须 subagent
  - freshness 判定方式
  - 失败时如何降级
- 所有结构化 YAML 都必须通过 `internal/schemas/*.json`。
- 所有架构断言都必须能回链 `evidence_refs`。
- 公开给用户的动作只有:
  - `/arch:onboard`
  - `/arch:design`
  - `/arch:audit`
  - `/arch:brief`
- 其他 skill 默认作为内部能力存在。

## SKILL.md 自检

- [ ] 用户语义与 `docs/spec-v1.0.md` 一致
- [ ] 不再引用旧的 5+1 证据模型或 9 文件/17 章强制交付模型
- [ ] 输入输出路径落在 `arch/{project}/specs/`、`change-requests/`、`decisions/`、`generated/`
- [ ] 验收规则围绕完整性、traceability、freshness、writeback，而不是文件数堆砌
- [ ] 用户可见提示默认中文

## 借鉴说明(非依赖)

我们借鉴，但不强依赖:

- **[Understand-Anything](https://github.com/Lum1104/Understand-Anything)**  
  借鉴扫描算法分层: `project scanner → file analyzer → architecture analyzer → graph reviewer → incremental update`。
- **[fireworks-tech-graph](https://github.com/yizhiyanhua-ai/fireworks-tech-graph)**  
  可选渲染后端，不装时必须优雅降级到 Mermaid。

本仓库产自己的规范产物，不依赖外部工具的目录结构、CLI、JSON 格式或运行时存在。
