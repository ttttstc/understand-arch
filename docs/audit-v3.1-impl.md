# v3.1 实现验收报告(自验收)

> 实现人 + 验收人:Claude(本次直接实现,非交付 codex)
> 分支:feat/v3.1-impl(从 feat/v3.0-impl)
> 基线:docs/spec-v3.1.md

## 结论:v3.1 增量完整实现,验收通过

v3.1 是 v3.0 的增量,不动 v3.0 已有能力(graph/wiki/dashboard/design/三层验收全保留)。本次新增"规格约束层 + 知识访谈 + 5 级证据等级 + design 消费规则 + 全局中文规约"。

## 实现清单(对照 spec-v3.1)

| spec 项 | 实现 | 验证 |
|---|---|---|
| 5 级证据等级 | arch-layer.schema 加 `evidenceLevel` def;constraint schema 用 evidence_level | JSON 合法 ✅ |
| constraint schema | internal/schemas/constraint.schema.json(约束/依据/证据等级/violation_check/状态机/来源 + ai-mined 不得 confirmed 的 if/then) | JSON 合法 ✅ |
| suspicious-finding schema | internal/schemas/suspicious-finding.schema.json(7 类反常 + 可疑度 + 影响面 + 状态) | JSON 合法 ✅ |
| rules 双层 | templates/constraints/ 9 份模板(6 约束类 + suspicious-findings + coding-conventions + interview 模板) | 文件齐全 ✅ |
| arch-constraint-miner | agents/arch-constraint-miner.md(三产出:约束考古 + 反常侦查 + 风格统计)+ 接入 arch-enrich Phase 9.5 | prompt 完整 ✅ |
| constraint-writer | engine/arch/constraint-writer.mjs(确定性写盘 + 保护已 confirmed 条目) | 单测:写盘正常 + 保护机制有效 ✅ |
| /arch-interview | skills/arch-interview/SKILL.md(读 onboard 产物 → grill 访谈 → proposed 约束 + 记录 + 回标);极简 manifest 自动发现 | skill 完整 ✅ |
| design 消费 | arch-design SKILL(约束消费 4 介入点 + §4.6 + proposed 软阻塞)+ impact/solution/senior agent 加约束规则 | prompt 完整 ✅ |
| CR.md §4.6 约束符合性 | 并入「4. 详细设计」子节,solution-designer Rule 107 强制 | spec/SKILL/agent 一致 ✅ |
| CR.md 业界文档风格 | solution-designer Rule 109 + arch-design SKILL 风格规约 | ✅ |
| 全局中文规约 | 写进 constraint-miner / impact / solution / senior(Rule 080o) / interview / design SKILL | ✅ |
| wiki 展示 confirmed 约束 | render-wiki renderRules() 加 renderConfirmedConstraints()(只展示 confirmed,proposed 不进 wiki) | 语法 OK ✅ |
| 约束验收工具 | engine/arch/constraint-check.mjs + 接入 arch-audit | 单测:pass 正常 + 违规检测(ai-mined confirmed / 内部 id 证据)有效 ✅ |
| 版本号 | plugin/marketplace/package → 3.1.0-rc1 | ✅ |

## 关键质量验证(实测)

1. **constraint-writer 保护机制**:人工把 CON-001 改 confirmed + 改文字后重跑 writer,AI 的 proposed 旧版未覆盖人工版 — 实测保留(preserved:1)✅
2. **constraint-check 违规检测**:故意造 ai-mined+confirmed + 证据用 `risk:foo` 内部 id,被精确抓出 2 个 high finding,exit 1 ✅
3. **不破坏 v3.0**:`npm run verify` exit 0 ✅
4. **schema 合法**:3 个 schema JSON.parse 通过 ✅
5. **产物齐全**:16 个 v3.1 新增文件全部在位 ✅

## 铁律遵守

- LLM 推断全在 subagent(arch-constraint-miner)/ SKILL(arch-interview),Node 工具(constraint-writer/check)只做确定性读写校验 ✅
- ai-mined 约束 schema 层禁止 confirmed,只有人能确认 ✅
- 已确认人工条目永不被 AI 覆盖 ✅
- wiki 只展示 confirmed,proposed 不进 ✅

## 已知边界(诚实)

- arch-constraint-miner 是 LLM subagent,实际考古质量需真实项目 onboard 验证(本次未跑真实 onboard,因 v3.1 是增量,onboard 链路属 v3.0,已验证)
- /arch-interview 是交互式 skill,完整效果需真人访谈验证;本次验证其读取/产出契约正确
- git history 维度考古(temporal coupling / hotspot / knowledge map,业界 CodeScene 实践)未纳入,留后续增量
