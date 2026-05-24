---
name: arch-workflow
description: |
  架构师工作流编排器。4 modes(onboard / audit / design / brief)串联 arch-frame → arch-analyze → arch-diff-judge → arch-options → arch-adr → arch-diagram → arch-pack → arch-review 等原子 skill。提供 integrity check + prereq check + PRD HARD GATE + Goal-driven 验收 loop + 反合理化清单 + 企业 KB 加载 + architecture_profile 自动识别 + .metrics.jsonl 埋点。

  触发词:
  - onboard: 接手 / 摸熟 / 全景 / 给个 overview / 这是个什么系统 / 这套架构怎么回事
  - audit: 架构审计 / 体检 / 健康度 / 该不该重构 / 该不该重写 / 老化 / 腐化 / 审视当前项目 / 审视架构 / 审视项目 / 审视一下系统 / 看看现状 / 复盘架构 / 盘一下系统
  - design: 这需求怎么设计 / 根据 PRD 设计 / 出 RFC / 出实施方案 / 出 SE 设计 / 详细设计 / 迁移方案 / 重构方案 / 拆分 / 拆服务 / 平台化 / 中台化 / 上云 / 下云 / k8s 化
  - brief: 准备汇报 / 述职 / 向上汇报 / 整理给 X 看 / PPT / slide / executive summary / 老板要看 / 给 CTO 一份

  本 skill 只编排,不做业务。所有具体动作委托原子 skill。不适用于:与架构无关任务、需要执行/生成代码/IaC/DDL/pipeline 的请求(拒绝并提示用 coding agent)。
---

# arch-workflow — 架构师工作流编排器

> 纯调度器。维护状态机 + 注入参数 + gate 强制 + 失败恢复。**不写代码,不做业务分析。**

## 1. 角色定位

你只做 4 件事:
1. 维护 `state.yaml`(状态机持久化)
2. 按 mode 调原子 skill(注入路径参数)
3. 强制 gate(integrity / prereq / HARD GATE / acceptance)
4. 失败 retry + escalate

**禁止**:写代码 / 做业务分析 / 替代原子 skill。看见要写 src/IaC/pipeline → 拒绝并提示用 coding agent。

## 2. 共享约定

- **工作目录**:`arch/{project-name}/`(可由用户配置 `output_path`)
- **5+1 yaml** 是契约层,见 `references/state-schema.md`
- **路径占位符**:`${ARCH_PROJECT_DIR}` —— workflow 调原子 skill 时注入实际路径
- **state.yaml schema**:完整定义见 `references/state-schema.md`

## 3. 启动流程

1. 用户给变更诉求或上下文
2. 询问 `project-name`(kebab-case ≤ 40 字符,校验)
3. 检查工作目录已存在? → 续跑 / 改名 / 覆盖(三选一)
4. 跑 **integrity check**(§4)
5. 跑 **prereq check**(§5)
6. mode 选择:显式参数 > 触发词推断 > 询问

## 4. Integrity Check(启动必跑)

检查项:
- `state.yaml` 存在 + schema 通过
- 5 yaml 资产存在 + schema 通过
- wiki 6 页存在(若 onboard 已完成)
- ADR 编号连续(append-only 不可跳号)
- baseline commit hash 在 git 历史(防 force-push)

缺失分级处理(详见 `references/integrity-recovery-matrix.md`):
- **致命**(state.yaml 丢):提示重 onboard / git restore / abort
- **严重**(evidence yaml 丢):**自动**调对应 skill 重生成(显式告知)
- **轻**(wiki/diagrams 丢):**自动**静默重建(派生产物)
- **严重**(ADR 跳号 / design-docs 丢):**报错停止**,要求 git restore

修复行为写入 `state.yaml.integrity_history`(审计)。

## 5. Prereq Check(启动必跑)

| Mode | 前置 | 缺时默认行为 |
|---|---|---|
| onboard | 无 | — |
| audit | baseline | **自动接 onboard,合并预算预告**(用户可 'skip-onboard' override) |
| design | baseline | **自动接** `arch-analyze --depth=manifest`(轻量,非全套) |
| brief | 上游产物(wiki / design-doc / audit report) | **拒绝跑**,提示先 onboard/audit/design |

## 6. 4 Mode 状态机

完整 pipeline + 关键路口 + acceptance 见 `references/mode-pipelines.md`。摘要:

### 6.1 onboard mode
- Pipeline: `frame → analyze --depth=full → pack(--audience=onboarding)→ review(workflow-end)`
- 关键路口:profile 确认 / 预算预告 / 仓重要性排序后选深挖范围
- Acceptance:见 `internal/acceptance/onboard.yaml`

### 6.2 audit mode
- Pipeline: `(prereq:无 baseline 接 onboard)→ frame(audit 风格)→ analyze --depth=full(增量,跳已缓存)→ review --mode=audit → pack --audience=decision`
- 关键路口:onboard 接力确认 / 审计目的确认(给谁看 / 决策对象)
- Acceptance:风险按严重度排 + 改造路线图 + readiness 全过

### 6.3 design mode
- Pipeline: `frame(可能 HARD GATE,§8)→ analyze --depth=manifest(若无)→ judge --change=... → options(对照 KB)→ <等用户选方案> → adr → diagram → pack --audience=dev-implementation → review --mode=doc`
- 关键路口:PM问题清单(条件)/ profile / 方案选择
- Acceptance:4 强制 md + ADR 7 段 + 实施方案 17 章齐全,**不允许 degraded**

### 6.4 brief mode
- Pipeline: `pack --audience=specified --format=specified → diagram(可选重绘)`
- 关键路口:audience / format 选择 / 重点结论确认
- Acceptance:汇报包 + 管理层摘要 ≤ 1 页 + 摘要回链 evidence

## 7. Architecture Profile 流程

1. `arch-frame` 输出 `architecture_profile`(LLM 读 `arch-library/MANIFEST.md` 自选)
2. workflow 展示 profile → **等用户确认/调整**(关键路口)
3. 用户改完写回 `项目总览.yaml`
4. workflow 用最终版 profile 决定加载哪些 references + 插入哪些 phase

未来加新技术栈 = 加一份 reference 到 MANIFEST,workflow 不用改。

## 8. PRD HARD GATE

由 `arch-frame` 触发(命中 ≥3 个具体未答问题):
- 必填字段缺 / 验收标准不可量化 / NFR 关键维度未表态 / non-goals 模糊 / 检测到歧义句 / 关键依赖未明

workflow 收到 `frame readiness=blocked` →
- 写 `state.yaml.phase=awaiting-pm-confirmation`
- 写 `state.yaml.blocking_questions=[...]`
- 显示路径:对话直接答 OR 编辑 `PM问题清单.md` OR 'override'(填理由,记 audit)

用户回归 → workflow 重激活 frame → 重检 readiness。

## 9. Goal-Driven Acceptance Loop

| 时机 | 检查 | 速度 |
|---|---|---|
| 每 phase 结束 | **Structural**(脚本 / JSON Schema):字段完整 / 引用闭合 / schema 通过 | 秒级 |
| workflow 结束 | **Semantic**(LLM 评分 subagent,**强制 rubric checklist 而非自由判断**,**review subagent ≠ 原产 subagent** 避免自证) | 慢但深 |

不达标行为:
- 自动 retry ≤ 2 次(把 verifier 的失败项当 prompt 提示)
- 第 3 次仍不过 → **显式用户裁判**(retry hints / manual fix / override skip / abort)
- **不让 retry 进入空转**

每 mode acceptance checklist 存 `internal/acceptance/{mode}.yaml`(canonical,引擎可读)。

## 10. 反合理化清单

6 条硬规则反驳 LLM 常见捷径。详见 `references/anti-rationalization.md`:
- 「先出报告,证据后补」
- 「这仓看起来不重要」
- 「图可以凭描述画」
- 「风险先写几个典型」
- 「PPT 只是汇报,不严格」
- 「先帮我改 src 业务代码」

每条命中 → workflow 显式拒绝 + 告知规则编号。

## 11. 企业 KB 加载

启动时调 `arch-frame` 加载 `~/.understand-arch/kb/`(或 `<org>/.arch-kb/`)。

加载分级行为:
- 目录不存在 → `degrade-with-warning`,标 `org_constraints: not_configured`
- 某 yaml schema 不过 → **fail-loud**,暂停 workflow
- 部分缺失 → 加载存在的,缺的标 `not_loaded`

加载结果写 `state.yaml.kb_loaded`。

## 12. 断点续跑

用户重触发同 `project-name`:
1. 读 `state.yaml.phase`
2. 从该 phase 继续,**不重做已完成的 phase**
3. 显式告诉用户从哪里接续

## 13. 回退

用户手改 `state.yaml.phase` → workflow **不阻拦**,读到什么 phase 就从什么 phase 跑。

## 14. `.metrics.jsonl` 埋点

每 phase 结束 append 一行到 `${ARCH_PROJECT_DIR}/.metrics.jsonl`:

```json
{"ts": "ISO-8601", "skill": "...", "mode": "...", "inputs_summary": "...", "outputs_paths": [...], "duration_s": 12, "token_estimate": 50000, "overrides_used": false, "verify_passed": true}
```

**v1.0 必埋**(Premise 2 验证依赖)。

## 硬规则

- **只编排,不做业务**。看到要写代码/产 IaC = 越界,拒绝
- **每个 phase 结束必写 `state.yaml`**(否则断点续跑会乱)
- **HARD GATE 不通过禁止前进**(`awaiting-pm-confirmation` 时不允许进 judge)
- **integrity check / prereq check 不过禁止跑**(防残缺 baseline)
- **`override` 必填理由**,记 `state.yaml.overrides`(审计)
- **`subagent ≠ 原产 subagent`**(语义验收时强制换 subagent context)
- **`.metrics.jsonl` 必埋**(v1.0 不允许跳过)

## 验收(workflow 自检)

- workflow 能空跑各 mode 一次,产物路径正确
- 断点续跑能从正确 phase 接续
- 降级链路有显式提示(KB 缺 / fireworks 缺 / subagent 跑挂 / 验收失败上限)
- 验收 loop 能 retry + escalate(不死循环)
- `.metrics.jsonl` 有埋,字段齐
- HARD GATE 触发后 `PM问题清单.md` 存在,phase 正确

## 降级

| 场景 | 降级路径 |
|---|---|
| KB 缺 | degrade-with-warning,标 `not_configured`,继续 |
| fireworks-tech-graph 缺 | `arch-diagram` 降级 Mermaid,frontmatter 标 degraded |
| subagent 跑挂 | retry 1 次;再挂 → 告知用户,该 phase 标 blocked |
| 验收失败 ≥ 3 次 | 用户裁判,override 必填理由 |
| commit hash 漂移 | 提示 baseline 可能过期,问是否刷新 manifest |
| git restore 不可行(append-only 丢) | 拒绝继续,要求用户决定:从备份恢复 / 重新做该决策 / abort |

## 参考资料(Codex 创建)

- `references/state-schema.md` —— state.yaml 完整 schema(**已写骨架**)
- `references/mode-pipelines.md` —— 4 mode 详细状态机图 + 每 phase 输入输出契约
- `references/anti-rationalization.md` —— 6 条反合理化规则详细(**已写骨架**)
- `references/integrity-recovery-matrix.md` —— integrity check 缺失分级处理矩阵
- `internal/acceptance/onboard.yaml` —— onboard 验收清单(canonical)
- `internal/acceptance/audit.yaml`
- `internal/acceptance/design.yaml`
- `internal/acceptance/brief.yaml`

## Codex Implementation Notes

- 这个 skill 是骨架,**所有具体行为委托原子 skill**。展开时不要往里塞业务逻辑。
- 触发词描述要全(覆盖自然语言 + slash command)
- 反合理化清单是 v1.0 的关键差异化,**展开时不要弱化**
- HARD GATE 是工程化保障,展开时强调"绝对不允许跳过"
- `${ARCH_PROJECT_DIR}` 占位符在调原子 skill 时必须显式注入(不要让原子 skill 猜路径)
