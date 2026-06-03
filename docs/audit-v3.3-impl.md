# understand-arch v3.3 实现验收

> 分支:`feat/v3.3-impl`  
> 规格:`docs/spec-v3.3.md`  
> 状态:实现完成,待人工验收真实项目 CR 流程

---

## 1. 实现范围

v3.3 聚焦 `/arch-design` 质量升级,不修改 graph schema / arch-layer schema / v3.2 出图能力。

已实现:

- `arch-pre-grill`:正式设计前澄清目标、非目标、术语、约束、ADR、阻塞问题。
- `arch-option-designer`:在正式 CR 前生成 `CR-OPTION.md`,默认 A/B/C 三个候选方案。
- `arch-interface-designer`:在选定候选方案后分析接口边界、deep module、复杂度隐藏与 shallow module 风险。
- `arch-project-language-analyzer` + `project-language-writer.mjs`:onboard 阶段生成 `rules/project-language.md`。
- `arch-improvement-analyzer` + `/arch-improve`:输出架构改进候选 RFC,不自动改代码、不自动创建 CR。
- `cr-md-editor.mjs validate`:校验 14 段、§4.1-§4.8、§9 vertical slices、`CR-OPTION.md` 关联。
- `cr-md-editor.mjs validate-option`:校验 `CR-OPTION.md` 的 A/B/C 方案、横向对比、推荐意见、人类决策区。
- `arch-senior-reviewer`:新增 v3.3 评审维度:可实施性、接口质量、架构取舍质量、切片质量。

---

## 2. P0 Gate 对照

| Gate | 实现 |
|---|---|
| `/arch-design` 先执行 pre-grill | `skills/arch-design/SKILL.md` workflow step 2 |
| 阻塞问题达阈值不生成 CR | `arch-design` workflow step 3 |
| 先生成 `CR-OPTION.md` | `arch-design` workflow step 8-10 |
| 默认 A/B/C 三方案 | `agents/arch-option-designer.md` + validate-option |
| 未确认不写正式 CR | `arch-design` workflow step 10 |
| CR.md 保持 14 段标题 | `cr-md-editor.mjs` 继续使用标准 `CR_HEADINGS` |
| §4 包含 4.1-4.8 | `DETAIL_SUBSECTIONS` + validate |
| §4.6 未退化 | `arch-design` 与 `arch-solution-designer` 保留约束符合性 |
| §4.7 接口质量 | `arch-interface-designer` + reviewer rule |
| §9 vertical slices | `cr-md-editor.mjs validate` + reviewer rule |
| 中文、无工具元叙述 | agent prompt 与 reviewer rules |

---

## 3. P1 Gate 对照

| Gate | 实现 |
|---|---|
| `rules/project-language.md` | `arch-project-language-analyzer` + `project-language-writer.mjs` + `arch-enrich` Phase 9.6 |
| 术语混用 review | `arch-senior-reviewer` v3.3 rule 080aa |
| interface 输出写入 CR §4.7/§5 | `arch-design` workflow + `arch-solution-designer` v3.3 rules |
| `/arch-improve` | `skills/arch-improve/SKILL.md` + `arch-improvement-analyzer` |

---

## 4. 实测命令

已执行:

```text
pnpm arch:test
npm run verify
```

结果:

```text
2 test files passed
7 tests passed
npm run verify exit 0
```

覆盖:

- v3.3 CR validate 通过。
- 缺 vertical slices 的 CR 被拒绝。
- v3.3 CR-OPTION validate 通过。
- 缺方案 C 的 CR-OPTION 被拒绝。
- v3.2 diagram dispatch 既有测试保持通过。
- core test/build 与 dashboard test/build 保持通过。

---

## 5. PR #19 Review 修复

已按 PR #19 评审意见修复:

| 项 | 修复 |
|---|---|
| cr-md-editor 冗余三元表达式 | `findMissingInOrder` 简化为直接 `text.indexOf(heading)` |
| pre-grill 与 arch-frame 职责重叠 | `arch-frame` 明确消费 pre-grill JSON,只做增量 framing |
| `design_readiness=draft_only` 未处理 | `/arch-design` workflow 增加 draft-only 分支与低置信草稿标注要求 |
| 推荐意见正则漏检 | `validate-option` 支持 `推荐: 采用 方案 B` |
| 测试覆盖缺口 | 新增缺 §4 子节、缺 AFK/HITL、project-language writer 测试 |
| Electron 特定术语 | `arch-interface-designer` 改为通用 runtime/framework/internal details |
| improvement analyzer 双输出灵活性 | 默认 Markdown,显式请求时支持 `{ markdown, summary }` JSON |

新增测试后:

```text
pnpm arch:test
3 test files passed
12 tests passed
```

---

## 6. 待人工验收

建议用 Typola 或 sample workspace 走一次真实 `/arch-design`:

1. 输入一个低风险 PRD。
2. 确认先产出 `CR-OPTION.md`。
3. 选择方案 B 或按推荐继续。
4. 生成正式 `CR.md`。
5. 检查 §4.7、§5、§9、§13、§14 是否满足 v3.3 spec。
