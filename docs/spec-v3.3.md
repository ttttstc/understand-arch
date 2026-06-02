# understand-arch v3.3 Spec(CR 特性设计质量升级)

> Version: 3.3 · Status: Draft · 基于:`docs/spec-v3.2.md`(增量 delta,不重写 v3.0/v3.1/v3.2)
> 主题:把 `/arch-design` 从「能生成 14 段 CR.md」升级为「能生成一份研发可照做、评审可抓问题、决策可追溯的架构特性设计文档」。

---

## 0. 摘要

v3.0 解决架构理解底座,v3.1 补规格约束层,v3.2 补生产级出图能力。v3.3 不继续增加展示产物,而是补齐用户真正落地时最关键的一环:

> CR.md 不能只是格式正确,必须像一份资深架构师交付的技术方案。

本轮借鉴 `mattpocock/skills` 的工程方法:

- 小而清晰的 skill primitive,不要把所有事情塞进一个大提示词。
- 写方案前先追问需求、术语、约束和 ADR,不要把含糊 PRD 直接包装成自信 CR。
- 实施计划按 vertical slice 拆,而不是按 schema/API/UI/test 横向拆。
- 架构改进要关注 deep module、接口边界、复杂度隐藏、调用方体验和可替代方案。

v3.3 的核心增量:

1. **CR.md 架构特性设计规范**:在既有 14 段内强化写作合同,不改 14 段标题。
2. **pre-grill 阶段**:在 `/arch-design` 正式生成 CR 前,先追问 PRD、术语、约束、ADR 和非目标。
3. **vertical slices 实施计划**:CR §9 从步骤清单升级为可验收的端到端切片。
4. **接口与 deep module 评审**:CR §4 必须解释接口边界、复杂度隐藏、备选方案与取舍。
5. **项目语言文档**:沉淀领域词、角色、状态、组件命名,供 wiki / CR / review 共用。
6. **可选 `/arch-improve`**:输出架构改进 RFC 候选,不直接改代码。

---

## 1. 全局规约(继承)

v3.3 继承以下铁律:

1. **LLM 语义推断只在 Skill/subagent 内执行**。Node/Python 只做确定性读写、校验、合并、渲染。
2. **不推翻 v3.0 hard fork UA 底座**。扫描编排继续继承 Understand-Anything。
3. **不修改 v3.2 图能力路线**。fireworks 出图保持默认 SVG,Mermaid 保持降级。
4. **所有面向人的产物默认中文**。代码标识符、命令、schema 字段保留英文。
5. **CR.md 仍是单文件 14 段结构**。v3.3 只加强段内合同,不改标题、不拆多文件。
6. **confirmed 约束与规范层仍是硬约束**。proposed 约束仍是软阻塞,允许用户 override 并留痕。

---

## 2. 需求来源

### 2.1 当前 `/arch-design` 的问题

| 维度 | v3.1/v3.2 现状 | v3.3 要解决 |
|---|---|---|
| CR 结构 | 14 段完整,段级写权限正确 | 段内质量不够硬,容易变成模板填空 |
| 需求澄清 | `arch-frame` 有 hard gate | 追问不够像资深 reviewer,对术语/ADR/约束/非目标挑战不足 |
| 详细设计 | 要求可实施 | 缺少接口质量、deep module、复杂度边界、备选设计对比 |
| 实施步骤 | 容易按层拆 | 需要按 vertical slice 拆,每个切片能独立验收 |
| Review | 能校验结构和约束 | 需要校验「研发能否照做」「接口是否合理」「取舍是否可信」 |
| 语言一致性 | 全局中文规约 | 缺少项目语言表,不同 CR/wiki 可能对同一概念换词 |

### 2.2 可借鉴能力

参考 `mattpocock/skills` 的能力形态:

- `grill-with-docs`:先读上下文和 ADR,再追问方案,逼出隐含假设。
- `improve-codebase-architecture`:关注 deep module、接口设计、架构摩擦、RFC。
- `to-prd`:把含糊输入整理为结构化 PRD,强调目标、非目标、用户路径。
- `to-issues`:按 vertical slice 拆 issue,避免横向任务切分。
v3.3 只吸收这些方法,不搬迁代码,不新增外部依赖。

---

## 3. 目标与非目标

### 3.1 目标

1. `/arch-design` 生成的 CR.md 更像业界标准 Tech Spec / RFC,研发能照做。
2. 写 CR 前必须经过 pre-grill,明确目标、非目标、术语、约束、ADR、开放问题。
3. CR §4 详细设计必须包含接口边界、数据变化、流程、失败模式、约束符合性、备选设计取舍。
4. CR §9 实施步骤必须按 vertical slices 输出,每个切片有验收标准和人机协作边界。
5. senior review 增加「可实施性」「接口质量」「取舍质量」「切片质量」rubric。
6. 新增项目语言文档,让 wiki / CR / diagram / review 使用一致术语。
7. 可选新增 `/arch-improve`,用于输出架构改进候选 RFC,不直接改代码。

### 3.2 非目标

- 不改变 CR.md 14 段标题。
- 不拆分 CR.md 为多文件。
- 不新增 graph schema 或 arch-layer schema 字段。
- 不让 Node 脚本生成语义判断。
- 不自动创建 GitHub issue。
- 不自动改业务代码。
- 不替代 `/arch-interview`;pre-grill 问的是本次变更,interview 沉淀的是项目长期隐式知识。

---

## 4. CR.md 架构特性设计规范

v3.3 沿用既有 14 段:

1. `## 1. 背景`
2. `## 2. 现状`
3. `## 3. 方案概述`
4. `## 4. 详细设计`
5. `## 5. 替代方案`
6. `## 6. NFR`
7. `## 7. 风险`
8. `## 8. 改动清单`
9. `## 9. 实施步骤`
10. `## 10. 回滚`
11. `## 11. 测试`
12. `## 12. 待定`
13. `## 13. 关联`
14. `## 14. Review`

### 4.1 段内强制合同

| 段落 | v3.3 强制要求 |
|---|---|
| 1 背景 | 说明业务触发、目标用户、价值、非目标;禁止只复述 PRD |
| 2 现状 | 引用当前架构事实、组件边界、痛点、相关约束/ADR |
| 3 方案概述 | 说明设计原则、核心取舍、为什么现在这样改 |
| 4 详细设计 | 必须包含 §4.1-§4.8 子节,见 §4.2 |
| 5 替代方案 | 至少 2 个真实备选;说明为何不选;没有备选 = finding |
| 6 NFR | 性能、可靠性、安全、兼容性、可观测性、可维护性,不相关要说明原因 |
| 7 风险 | 风险必须有触发条件、影响、缓解手段、回滚/观测信号 |
| 8 改动清单 | 继续保留 core impacted set / adjacent review set,并关联 graph node / file |
| 9 实施步骤 | 必须按 vertical slices,见 §6 |
| 10 回滚 | 必须说明数据、配置、接口、发布开关的回退路径 |
| 11 测试 | 必须覆盖单测、契约、集成、迁移、回滚、观测验证 |
| 12 待定 | 开放问题必须有 owner、截止条件、阻塞程度 |
| 13 关联 | 关联 PRD、ADR、约束、graph 节点、架构图、历史 CR |
| 14 Review | append-only,记录 senior review findings 和 retry 历史 |

### 4.2 §4 详细设计子节

`## 4. 详细设计` 必须包含以下子节,顺序固定:

```markdown
### 4.1 能力变化
### 4.2 组件与边界
### 4.3 接口与契约
### 4.4 数据与状态
### 4.5 流程与失败模式
### 4.6 约束符合性
### 4.7 接口质量与复杂度隐藏
### 4.8 观测与运维
```

说明:

- `4.6 约束符合性` 继承 v3.1,格式不降级。
- `4.7 接口质量与复杂度隐藏` 是 v3.3 新增重点,必须回答:
  - 新接口是否把复杂度藏在稳定边界后面?
  - 调用方是否容易正确使用、难以误用?
  - 是否制造 shallow module?
  - 是否泄漏实现细节?
  - 是否需要 adapter / port / facade / domain service?
  - 2-3 个备选接口设计分别是什么,取舍是什么?

### 4.3 CR 风格禁止项

CR.md 禁止出现:

- 工具元叙述:如「本工具扫描到」「根据 arch-layer」「subagent 认为」。
- 空泛句:如「提升可维护性」「增强稳定性」但没有具体机制。
- 横向实施拆分:如只列「改 schema」「改 API」「改 UI」「写测试」。
- 伪替代方案:如「不做」作为唯一替代方案。
- 无证据架构判断:如「该模块复杂」但没有图谱、文件、调用链或约束支撑。
- 混合语言叙述:中文句子里夹英文架构词,除非是代码标识符或产品名。

---

## 5. Pre-grill 阶段

### 5.1 定位

pre-grill 是 `/arch-design` 的前置阶段,用于阻止含糊 PRD 直接变成自信 CR。

它不是长期知识访谈,也不产出项目约束层。它只服务本次设计。

### 5.2 输入

- 用户 PRD / 变更说明 / 自然语言需求
- `specs/arch-layer.json`
- per-repo `knowledge-graph.json`
- `rules/*.md`
- `rules/constraints/*.md`
- `decisions/ADR-*.md`
- 历史 `change-requests/**/CR.md`
- 可选:用户补充的业务背景

### 5.3 输出

pre-grill 输出 JSON:

```json
{
  "problem_statement": "",
  "goals": [],
  "non_goals": [],
  "user_or_actor": [],
  "domain_terms": [
    {
      "term": "",
      "meaning": "",
      "source": "prd|code|rule|adr|user",
      "confidence": "confirmed|observed|inferred|uncertain|conflicted"
    }
  ],
  "constraint_hits": [],
  "adr_hits": [],
  "architecture_questions": [],
  "blocking_questions": [],
  "assumptions": [],
  "needs_adr": false,
  "needs_interview": false,
  "design_readiness": "ready|needs_user_answer|draft_only"
}
```

### 5.4 阻塞规则

必须暂停并问用户:

- `blocking_questions.length >= 3`
- 有 confirmed/规范层约束冲突,且无法通过设计绕开
- PRD 目标与现有 ADR 明显冲突
- 核心领域术语为 `conflicted`
- 影响面跨安全/合规/数据不可逆变更,但缺少验收标准

允许继续但必须写入 CR §12:

- 非核心术语 `uncertain`
- proposed 约束被触碰但用户选择 override
- 影响面只命中 adjacent review set
- 需要后续补 ADR,但不阻塞低风险设计

### 5.5 SKILL 调度模板

`/arch-design` 在 `arch-frame` 前先 dispatch `arch-pre-grill`:

```text
Mode: CR pre-grill.
Input: user PRD/request, graph, arch-layer, rules, constraints, ADRs, historical CRs.
Task:
1. Clarify problem, goals, non-goals, user/actor, domain terms.
2. Check whether the request conflicts with confirmed rules, constraints, or ADRs.
3. Identify blocking questions that must be answered before design.
4. Identify assumptions that may be carried into CR.md.
5. Decide whether an ADR or /arch-interview is needed.
Return JSON only. All user-facing text in Chinese.
```

---

## 6. Vertical Slices 实施计划

### 6.1 原则

CR §9 不再输出横向任务清单,必须输出可验收的端到端切片。

每个 slice 应该包含从入口到结果的最小闭环:

- 用户/系统触发
- 组件改动
- 数据/状态改动
- 接口/契约改动
- 测试与验收
- 回滚或降级点

### 6.2 Slice 模板

```markdown
### Slice 1: {切片名称}
- 目标:{这一片完成后用户或系统能获得什么}
- 范围:{涉及组件 / graph node / 文件}
- 具体改动:
  - {改动 1}
  - {改动 2}
- 验收:
  - {可执行测试 / 人工验收 / 观测指标}
- 回滚:
  - {如何只回滚这一片}
- 人机边界:{AFK | HITL}
- 依赖:{前置 slice 或外部条件}
```

### 6.3 AFK / HITL 标注

每个 slice 必须标注:

| 标注 | 含义 |
|---|---|
| `AFK` | agent 可以在既定设计下独立实现和验证 |
| `HITL` | 需要人类确认领域语义、产品取舍、合规、数据迁移或不可逆操作 |

如果 slice 涉及以下内容,默认 HITL:

- 删除或迁移生产数据
- 修改账务、权限、安全、合规逻辑
- 改变对外 API 语义
- 违反或 override proposed/confirmed 约束
- 与 ADR 冲突或需要新 ADR

---

## 7. 项目语言文档

### 7.1 产物

新增:

```text
.understand-arch/{project}/rules/project-language.md
```

该文件是人可编辑的项目语言表,用于统一 wiki、CR、diagram、review 的表述。

### 7.2 内容结构

```markdown
# Project Language

## 领域词
| 术语 | 含义 | 推荐用法 | 禁用/避免 | 证据 |
|---|---|---|---|---|

## 用户与角色
| 角色 | 含义 | 来源 |
|---|---|---|

## 状态与事件
| 状态/事件 | 含义 | 所属流程 | 来源 |
|---|---|---|---|

## 组件命名
| 组件 | 推荐中文名 | 代码标识符 | 说明 |
|---|---|---|---|

## 禁止混用
| 不推荐 | 推荐 | 原因 |
|---|---|---|
```

### 7.3 生成与消费

- `/arch-onboard` 可由 narrative/capability analyzer 生成初稿,状态为 proposed。
- `/arch-interview` 可补充或修正。
- 人确认后,CR/wiki/review 必须使用推荐术语。
- reviewer 发现同一概念多名混用时,记为 finding。

---

## 8. Deep Module 与接口质量

### 8.1 新增内部 subagent

新增:

```text
agents/arch-interface-designer.md
```

职责:

- 基于 PRD、impact、graph、arch-layer、rules、ADR,分析本次设计的接口和模块边界。
- 提出 2-3 个接口设计备选。
- 判断是否形成 deep module,是否隐藏复杂度。
- 判断调用方是否容易正确使用,是否需要 adapter/facade/port。
- 输出给 `arch-solution-designer` 消费,不直接写 CR.md。

### 8.2 输出 JSON

```json
{
  "module_boundary_assessment": [],
  "interface_options": [
    {
      "name": "",
      "description": "",
      "caller_experience": "",
      "complexity_hidden": "",
      "tradeoffs": [],
      "risks": [],
      "recommendation": "recommended|acceptable|rejected",
      "evidence_refs": []
    }
  ],
  "deep_module_findings": [],
  "shallow_module_risks": [],
  "recommended_design": "",
  "questions_for_user": []
}
```

### 8.3 Review 规则

senior reviewer 必须检查:

- §4.7 是否存在。
- 是否至少有 2 个真实接口/边界备选。
- 推荐方案是否解释调用方体验。
- 是否识别复杂度放在哪里。
- 是否避免把内部状态、临时对象、数据库结构直接泄漏给调用方。
- 是否说明为何不把逻辑散落到多个 shallow modules。

---

## 9. `/arch-improve`(可选 P1)

### 9.1 定位

`/arch-improve` 用于用户主动要求:

- “这个项目哪里架构不好?”
- “哪里值得重构?”
- “哪个模块应该拆或合?”
- “帮我找 deep module 机会。”

它不改代码,不直接生成实施 PR,只输出架构改进 RFC 候选。

### 9.2 输入

- graph
- arch-layer
- rules/constraints
- ADR
- historical CR
- suspicious-findings
- coding-conventions

### 9.3 输出

```text
.understand-arch/{project}/improvements/IMPROVE-YYYY-NNN-<slug>.md
```

结构:

```markdown
# 架构改进候选:{标题}

## 1. 问题
## 2. 证据
## 3. 架构摩擦
## 4. 改进方案
## 5. 替代方案
## 6. 风险与收益
## 7. 建议切片
## 8. 是否建议转 CR
```

### 9.4 与 `/arch-design` 的关系

- `/arch-improve` 发现机会。
- 用户确认后,可转为 `/arch-design` 的 PRD 输入。
- 不自动创建 CR。

---

## 10. 实施顺序

### Impl-1:补 spec 与文档

- 新增 `docs/spec-v3.3.md`
- README/README.zh 增加 v3.3 能力摘要(实现时做)

### Impl-2:项目语言文档

- `/arch-onboard` 生成 `rules/project-language.md` 初稿
- `/arch-wiki`、`/arch-design`、reviewer 读取该文档
- 新增 deterministic 校验:文件存在、章节存在、空表允许但必须声明未识别

### Impl-3:pre-grill

- 新增 `agents/arch-pre-grill.md`
- 修改 `skills/arch-design/SKILL.md` 流程,在 `arch-frame` 前 dispatch
- 阻塞规则落入 SKILL
- blocking questions 输出给用户,不生成 CR

### Impl-4:CR 段内合同

- 修改 `skills/arch-design/SKILL.md`
- 修改 `agents/arch-solution-designer.md`
- 修改 `engine/arch/cr-md-editor.mjs` validate:检查 §4.1-§4.8 子节、§9 slice 模板
- 不修改 14 段标题

### Impl-5:vertical slices

- `arch-solution-designer` 输出 §9 slices
- `arch-impact-analyzer` 输出 core/adjacent 与 slice 关联
- reviewer 检查每个 slice 的验收、回滚、AFK/HITL

### Impl-6:interface designer

- 新增 `agents/arch-interface-designer.md`
- `/arch-design` 在 impact 后、solution 前 dispatch
- `arch-solution-designer` 消费 interface JSON 写 §4.7 与 §5

### Impl-7:senior review rubric

- 更新 `agents/arch-senior-reviewer.md`
- design review 增加 4 个维度:
  1. 可实施性
  2. 接口质量
  3. 架构取舍质量
  4. 切片质量
- finding 分 blocker/major/minor,blocker 不允许 pass

### Impl-8:`/arch-improve`(P1)

- 新增 `skills/arch-improve/SKILL.md`
- 新增 `agents/arch-improvement-analyzer.md`
- 输出 improvement RFC 候选
- 不进入 v3.3 P0 gate,可分支实现

### Impl-9:验收样例

- 构造一个小型 sample PRD
- 对 sample workspace 跑 `/arch-design`
- 对 Typola 真实项目跑一份低风险 CR
- 验证 CR 可读、可实施、slice 可验收

---

## 11. 验收标准

### 11.1 P0 gate

- [ ] `/arch-design` 必须先执行 pre-grill。
- [ ] blocking questions 达阈值时不生成 CR。
- [ ] CR.md 仍有且只有 14 段标准标题。
- [ ] §4 包含 `4.1` 到 `4.8` 全部子节。
- [ ] §4.6 约束符合性未退化。
- [ ] §4.7 有接口质量与复杂度隐藏分析。
- [ ] §5 至少有 2 个真实替代方案。
- [ ] §9 只有 vertical slices,没有纯横向任务清单。
- [ ] 每个 slice 有验收、回滚、AFK/HITL。
- [ ] senior review 会拦截模板化 CR、缺备选、缺 slice、缺接口取舍。
- [ ] 所有面向人文本中文,无工具元叙述。

### 11.2 P1 gate

- [ ] `rules/project-language.md` 生成并被 `/arch-design` 消费。
- [ ] 同一概念混用被 reviewer 识别。
- [ ] `arch-interface-designer` 输出被写入 CR §4.7 和 §5。
- [ ] `/arch-improve` 可产出改进候选 RFC。

### 11.3 实测命令

实现后必须跑:

```text
npm run verify
node engine/arch/cr-md-editor.mjs validate --file <sample CR.md>
```

真实项目验收:

```text
/arch-design <Typola 低风险 PRD>
```

验收者人工检查:

- 一个不知道 understand-arch 的资深研发能否照着 CR 实施。
- 架构师能否从 §4/§5 看出真实取舍。
- PM/Tech Lead 能否从 §9 看出交付顺序和风险边界。

---

## 12. 禁止行为

- 禁止修改 CR.md 14 段标题。
- 禁止把 pre-grill、interface design、improvement analysis 写进 Node 脚本。
- 禁止用「不做」冒充替代方案。
- 禁止让 §9 输出横向任务清单。
- 禁止 CR 中出现工具元叙述。
- 禁止没有证据就声称某模块复杂、风险高、耦合重。
- 禁止 confirmed 约束冲突仍给 approve。
- 禁止 `/arch-improve` 自动改代码或自动开 CR。

---

## 13. 与已有版本关系

| 版本 | 保留 | v3.3 增量 |
|---|---|---|
| v3.0 | UA hard fork、graph、arch-layer、wiki、dashboard、CR 14 段 | 不动底座 |
| v3.1 | 约束层、访谈、5 级证据、CR §4.6 | pre-grill 与 CR 质量升级消费这些资产 |
| v3.2 | fireworks 出图、SVG 默认、style 引导 | CR 可关联架构图,但本轮不扩图 schema |

v3.3 的定位不是「更多产物」,而是「更可信的方案设计」。
