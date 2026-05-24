# Contributing to understand-arch

> 本文件是任何贡献者(Codex / Claude / Cursor / 人)填写剩余 v1.0 skill 骨架的入口。

## 项目现状

- **v0.2.0(当前)**:**全骨架阶段**。**10/10 skill 骨架已写**(含编排器),完整实现待接手。
- **v1.0 目标**:9 个 skill 全部 functional + 验收 loop 工作 + 5+1 yaml schema 验证通过 + `arch-library/` v1.0 seed。

## 设计源文档(开工前必读)

1. **[docs/spec-v1.0.md](./docs/spec-v1.0.md)** —— v1.0 完整规格(canonical 参考)
2. **[docs/office-hours-2026-05-24.md](./docs/office-hours-2026-05-24.md)** —— 设计诊断 + premises + YAML schema 草图 + 8 founder signals

## 设计三大支柱(任何展开都不得违反)

1. **以交付件为中心** —— 输出是可验收的产物组合,不是聊天结论
2. **5+1 YAML schema-locked 契约层** —— subagent 与主上下文之间用结构化 yaml,每条判断回链 `evidence_refs`
3. **Governance 即 Moat** —— append-only ADR + 反合理化清单 + 企业 KB + 验收 loop。**LLM 越能"乱产"越需要 governance**。

## 边界(只产描述类)

✅ **可**产:`*.md` / `*.yaml` / `*.mmd` / `*.svg|png`(via fireworks-tech-graph)
❌ **不**产:Terraform / Helm / DDL / `.gitlab-ci.yml` / `.github/workflows/*` / 服务骨架 / OpenAPI 客户端代码 / 业务代码

任何要求 src/IaC/pipeline 生成的请求 → **拒绝并提示用 Cline / aider / IaC 工具**。

## Build Order(按此顺序展开)

| # | 文件 | 状态 |
|---|---|---|
| 1 | `skills/arch-workflow/SKILL.md` —— 编排器骨架 | ✅ 骨架已写 |
| 2 | `internal/schemas/*.json` —— 6+5 个 JSON Schema(见 `internal/schemas/MANIFEST.md`) | ⬜ 待实现 |
| 3 | `skills/arch-frame/SKILL.md` —— PRD HARD GATE + KB 加载 + architecture_profile | ✅ 骨架已写 |
| 4 | `skills/arch-analyze/SKILL.md` —— 4 档 depth subagent + 2 阶段算法 | ✅ 骨架已写 |
| 5 | `skills/arch-diff-judge/SKILL.md` —— 变更影响 subagent | ✅ 骨架已写 |
| 6 | `skills/arch-options/SKILL.md` —— 4 列权衡矩阵 + org KB 对照 | ✅ 骨架已写 |
| 7 | `skills/arch-adr/SKILL.md` —— append-only 7 段 | ✅ 骨架已写 |
| 8 | `skills/arch-diagram/SKILL.md` —— fireworks 主 + Mermaid 降级 | ✅ 骨架已写 |
| 9 | `skills/arch-review/SKILL.md` —— doc/code 双模式 | ✅ 骨架已写 |
| 10 | `skills/arch-pack/SKILL.md` —— audience × format,17 章实施方案模板 | ✅ 骨架已写 |
| 11 | `skills/arch-radar/SKILL.md` —— 行业对标(按需) | ✅ 骨架已写 |
| 12 | `arch-library/` v1.0 seed —— 每域 ≤200 行(见 MANIFEST) | ⬜ 待实现 |
| 13 | `internal/phases/eval-design.md` | ⬜ 待实现 |
| 14 | `internal/acceptance/{mode}.yaml` × 4 | ⬜ 待实现 |
| 15 | `arch/{project}/` template + sample | ⬜ 待实现 |

## 实现约定

- **每个 SKILL.md 必含**:frontmatter(name + description + triggers) / 角色定位 / 输入输出契约 / 行为(关键流程) / 硬规则 / 验收 / 降级 / 参考文件清单
- **每个原子 skill 必声明**:`subagent: required | conditional | none`
- **subagent-required skill 必给出**:触发阈值 / prompt template / 返回 schema / 失败降级
- **5+1 yaml 资产产权**:见 spec §5
- **跨 skill 引用**:用 skill name(不要硬编路径),例 "委托给 `arch-analyze --depth=manifest`"
- **`${ARCH_PROJECT_DIR}`** 是路径占位符,workflow 注入

## marketplace.json 注册

v0.2.0 起 marketplace.json **已注册全部 10 个 skill 骨架**(SKILL.md 是合法 frontmatter,不会让 `/plugin install` 崩)。

Codex 实装时按 Build Order 逐个 flesh out,无需再改 marketplace.json。**实装完一个,在 SKILL.md 自检 checklist 走一遍,再继续下一个**。

## SKILL.md 自检(展开完后)

- [ ] frontmatter 触发词覆盖 spec §9 的相应条目
- [ ] 硬规则段对应 spec §7 的不变量
- [ ] 验收段有 ≥3 个可验证项
- [ ] 降级段含 ≥2 个真实场景
- [ ] 引用的 references 文件都列出来

## 借鉴说明(非依赖)

我们**学但不依赖**:
- **[Understand-Anything](https://github.com/Lum1104/Understand-Anything)**(22.7k⭐) —— 借鉴 2 阶段代码分析模式(deterministic script + LLM 解释)
- **[wshobson/agents](https://github.com/wshobson/agents)**(35.8k⭐) —— 借鉴 ADR skill 范式
- **[fireworks-tech-graph](https://github.com/yizhiyanhua-ai/fireworks-tech-graph)**(7k⭐) —— 用作 `arch-diagram` 的**可选**渲染后端,不装则降级 Mermaid

以上**均非必装依赖**。本套件保持独立。
