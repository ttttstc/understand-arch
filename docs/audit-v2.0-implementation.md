# v2.0 实现 Audit 报告(codex /goal 模式产物验收)

> 验收人:Claude(spec author)
> 验收日期:2026-05-27
> 验收基线:`docs/spec-v2.0.md`(commit `dbb6ce7`,PR #9)
> 实现状态:`feat/v2.0-spec` 分支 working tree(未 commit)

---

## 一、整体结论

**Verdict: needs_revision**(严重不达 spec,可识别为 v2.0-skeleton 骨架,核心 LLM 介入层全缺)

### 整体定位

codex 完成了**~40%** 的 v2.0 工作量:
- ✅ **目录骨架**完整(`.understand-arch/{project}/` + 9 skill + 9 agent + engine + monorepo + samples)
- ✅ **engine 确定性层** fork UA core 完整,25 个 bin 入口都可跑
- ✅ **5 schemas + 10 rubrics + 4 acceptance + 6 rules 模板**齐
- ✅ **write-scope.yaml** 跟 spec §12 一致
- ✅ **sample workspace** 端到端可跑通(纯确定性扫描)
- ❌ **9 个 subagent prompt 全是 10 行占位**(UA 原 prompt 平均 200-500 行)
- ❌ **9 个 SKILL.md 缺少 subagent dispatch 模板**(spec §3.7 / UA 原 SKILL.md 详细模板)
- ❌ **CR.md 14 段标题被 codex 自行修改**,跟 spec §4.1.2.1 不一致
- ❌ **Phase 编号错位**(codex 把 1.5 BATCH / 2 ANALYZE / 3 ASSEMBLE 改为 2 / 3 / 4)
- ❌ **state.schema hooks_enabled 字段 const: false** 导致用户无法启用
- ❌ **plugin.json / marketplace.json 没注册 agents/ 和 hooks/**
- ❌ **hooks.json 格式不是 Claude Code 官方规范**(自定义 guards 数组)
- ❌ **wiki 内容是占位**(每页 1 行),render-wiki.js 是确定性写模板,无 LLM 介入

---

## 二、按 spec §16.1 不变量逐条验收

| # | 不变量 | 验收 | 说明 |
|---|---|---|---|
| 1 | 用户项目根 1 个 `.understand-arch/` 目录 | ✅ | `samples/.understand-arch/` 结构正确 |
| 2 | `.understand-arch/{project}/` 内无 `.understand-arch/` 嵌套 | ✅ | intermediate/ 不在嵌套 .understand-arch/ 下 |
| 3 | graph 是唯一事实源 | ⚠️ | 结构对,但 LLM 推断字段(quality/risks/debt)全缺(分析器是占位) |
| 4 | Append-only 不变 | ⚠️ | cr-md-editor.js 有 append-review 命令,但未 e2e 验证 |
| 5 | Node ID `{repo_id}::{local-id}` | ✅ | sample graph nodes 用此格式 |
| 6 | LLM 推断字段强 confidence | ⚠️ | sample 里 nodes 有 confidence,但 quality_attributes[] 等全空 |
| 7 | CR.md 段级写权限 | ❌ | 14 段标题跟 spec §4.1.2.1 不一致,见 P0-3 |
| 8 | 单仓 N=1 退化无分叉 | ✅ | sample 走 repos.yaml N=1,代码路径统一 |
| 9 | hooks 默认关闭 | ⚠️ | state.yaml hooks_enabled=false ✅;但 schema const:false 阻止启用 |
| 10 | 中文纯化 | ✅ | SKILL.md 和提示模板基本中文 |

---

## 三、问题分级清单

### P0 — Blocker(必须修,否则 v2.0 不可用)

#### P0-1: 9 个 subagent prompt 全是 10 行占位

**spec 引用**: §3.5 / §4.3.1 / §4.3.2 / §4.3.3 / §11.3
**现状**:
- `agents/arch-file-analyzer.md` 仅 10 行,UA 原版 520 行
- `agents/arch-senior-reviewer.md` 仅 11 行,缺角色 prompt + JSON 评审协议
- 所有 9 个 agents/arch-*.md 都是占位
**期望**:
- 4 复刻 subagent:fork UA 原 prompt + v2.0 字段适配(repo_id::、confidence、evidence_refs)+ rules/ 注入
- arch-quality-analyzer:从代码 + graph + rules 推断 NFR/risks/debt,**强制** confidence + evidence_refs;违规直接 fail
- arch-impact-analyzer:**明确说明** 写 CR.md frontmatter#impact + § 8 改动清单(目前完全没提)
- arch-solution-designer:完整 14 段产出指引(对照 spec §4.1.2.1 标准 14 段标题)
- arch-senior-reviewer:角色定位(15 年经验 / 反弱化词)+ JSON 评审协议(verdict / findings / overall_score)+ refiner 循环规则
- arch-graph-reviewer:7 个 mode 详细指引(phase-1 / 3 / 4 / 5 / 6 / 7 / 8)

#### P0-2: Phase 编号错位

**spec 引用**: §3.7 标准 Phase 0-8
**现状**(internal/playbooks/analyze/SKILL.md + phase-pipeline.md):
```
codex 编号:0 PREPARE / 1 SCAN / 2 BATCH / 3 ANALYZE / 4 ASSEMBLE /
            5 STRUCTURE / 6 DOMAIN / 7 QUALITY / 8 FINALIZE
spec 标准:0 Pre-flight / 1 SCAN / 1.5 BATCH / 2 ANALYZE / 3 ASSEMBLE /
           4 STRUCTURE / 5 DOMAIN / 6 QUALITY / 7 REVIEW / 8 FINALIZE
```
**问题**:
- codex 取消了 spec 的 Phase 1.5(BATCH 子阶段),把后面所有 phase 编号前移
- **codex 没有 Phase 7 REVIEW**(把它合进 8 FINALIZE 了)
- 导致 rubric `graph-phase-7-final.yaml` 指向不存在的 Phase 7,验收逻辑断裂
**期望**:严格按 spec §3.7 编号(含 Phase 1.5 + Phase 7 REVIEW + Phase 8 FINALIZE)

#### P0-3: CR.md 14 段标题被自行修改

**spec 引用**: §4.1.2.1 标准 14 段模板
**现状**(skills/arch-design/SKILL.md + engine/bin/cr-md-editor.js):
```
codex 14 段:1 背景与目标 / 2 当前架构事实 / 3 需求解读与验收标准 /
             4 影响面总览 / 5 仓库与组件改动点 / 6 接口与事件契约 /
             7 数据模型与迁移策略 / 8 运行时、部署与配置 / 9 方案设计 /
             10 备选方案与取舍 / 11 风险、技术债与缓解 /
             12 发布、回滚与观测 / 13 任务拆解与验收计划 / 14 Review
spec 14 段:1 背景与目标 / 2 现状分析 / 3 方案概述 /
             4 详细设计(子节 4.1-4.5) / 5 替代方案对比 / 6 NFR 影响 /
             7 风险与缓解 / 8 改动清单 / 9 实施步骤+灰度策略 /
             10 回滚预案 / 11 测试策略 / 12 待定问题 /
             13 关联 / 14 Review
```
**问题**:整个 14 段拆分逻辑完全不同。spec 是"详细设计 § 4 是 hub 含 4.1-4.5 子节",codex 把它平铺到 §5-8,且把"实施步骤/回滚/测试"也重组了。
**期望**:严格按 spec §4.1.2.1 标准 14 段标题。codex 不得自行重新设计文档结构。

#### P0-4: 9 个 SKILL.md 缺 subagent dispatch 模板

**spec 引用**: §3.7 / §4.2.1 + UA `skills/understand/SKILL.md` 844 行
**现状**:arch-analyze SKILL.md 56 行,只说"调用 4 个复刻 subagent",没给具体 dispatch 指令
**期望**:每个会 dispatch subagent 的 SKILL.md(arch-analyze / arch-design / arch-onboard / arch-audit / arch-wiki)必须含:
```
Dispatch a subagent using the `arch-file-analyzer` agent definition.
Append the following additional context:
  Project: {projectName} — {projectDescription}
  ...
Pass these parameters:
  Batch: ...
Output: write to intermediate/batch-{i}.json
```

#### P0-5: state.schema.json `hooks_enabled` 字段写死 const: false

**spec 引用**: §3.10.0 / §8.1
**现状**:
```json
"hooks_enabled": { "type": "boolean", "const": false }
```
**问题**:`const: false` 意味着该字段**只能是 false**。用户运行 `/arch-onboard --enable-hooks` 想改成 true 时,schema 校验会失败,导致 hooks **永远无法启用**。
**期望**:
```json
"hooks_enabled": { "type": "boolean", "default": false }
```

#### P0-6: hooks.json 格式不是 Claude Code 官方规范

**spec 引用**: §3.10.1 标准格式(PostToolUse + SessionStart)
**现状**:
```json
{
  "version": "2.0",
  "enabled_by_default": false,
  "guards": [{"name": "post-commit-architecture-freshness", ...}]
}
```
**期望**:严格按 spec §3.10.1:
```json
{
  "hooks": {
    "PostToolUse": [
      { "matcher": "Bash", "hooks": [{ "type": "command", "command": "[ -f .understand-arch/*/state.yaml ] && ..." }] }
    ],
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "..." }] }
    ]
  }
}
```
**否则**:Claude Code 根本不会触发这些 hook,默认关闭的能力实际上完全不存在。

#### P0-7: wiki 14 页内容是占位,无 LLM 渲染

**spec 引用**: §5.2 + §5.3"单页无字数限制,讲透为准"
**现状**:每页约 1 行(`# 01 Overview \n\n示例系统全景。证据:sample::doc-readme。`)
**问题**:render-wiki.js 是**确定性写模板**,没经过 LLM 渲染。spec §4.1.4 明确 arch-wiki 是"LLM 渲染"。
**期望**:
- render-wiki.js 调 LLM(通过 Task tool 或 subagent dispatch)实际渲染每页内容
- 或 arch-wiki SKILL.md 提供 dispatch 模板,主线程直接渲染
- wiki/03-interfaces.md 末尾"已知局限"段(spec §5.2.1)未实现

---

### P1 — Major(应该修,影响协议完整性)

#### P1-1: plugin.json / marketplace.json 没注册 agents 和 hooks

**spec 引用**: §3.12.2
**现状**:plugin.json 只列 9 个 skills,没有 agents 和 hooks 注册
**期望**:加入 agents + hooks 字段,让 Claude Code 识别加载

#### P1-2: cr.schema.json frontmatter 字段跟 spec §4.1.2.1 不一致

**spec 引用**: §4.1.2.1 frontmatter
**现状**:用 `id / created_at / impact_node_ids / sections`
**期望**(spec 模板):
- `cr_id / title / status / owner / created / prd_link / affects_repos`
- `impact: { added_nodes, modified_nodes, removed_nodes, estimated_files_changed }`(嵌套结构)
- 不需要 `sections` 数组(段标题由 cr-md-editor 内置)

#### P1-3: state.schema history.skill 没用 enum

**spec 引用**: §8.1 列了 19 个枚举值
**现状**:`"skill": { "type": "string" }`(任何字符串都接受)
**期望**:
```json
"skill": {
  "type": "string",
  "enum": [
    "arch-onboard","arch-design","arch-audit","arch-wiki","arch-diagram",
    "arch-analyze","arch-frame","arch-adr","arch-review",
    "arch-project-scanner","arch-file-analyzer","arch-architecture-analyzer",
    "arch-domain-analyzer","arch-quality-analyzer","arch-graph-reviewer",
    "arch-impact-analyzer","arch-solution-designer","arch-senior-reviewer",
    "user"
  ]
}
```

#### P1-4: hooks/arch-update-prompt.md 仅 7 行

**spec 引用**: §3.10.2
**期望**:详细的增量更新指引:
- fingerprint diff 算法
- 架构相关节点变化 → dispatch `arch-analyze --mode=incremental`
- 仅 file/function 变化 → 标 possibly_stale,等用户主动跑
- 中文反馈格式

#### P1-5: 多 skill 缺 references 详细文档

**spec 引用**: spec 多处引用 references
**现状**:
- arch-analyze 缺 `scheduler-playbook.md`(spec §3.15 多仓调度)
- arch-audit 完全无 references(缺 `drift-detection.md`,spec §3.16)
- arch-design 完全无 references(缺 `impact-analysis.md`,spec §3.16)
- arch-onboard / arch-wiki 完全无 references

#### P1-6: package.json devDependencies 空

**spec 引用**: §3.12.1
**现状**:`"devDependencies": {}`
**期望**:`esbuild ^0.24.0 / typescript ^5.7.0 / vitest ^3.1.0`

#### P1-7: phase-pipeline.md 仅 15 行(Phase 标题占位)

**spec 引用**: §3.7 + §3.15
**期望**:每 phase 含 bash 命令、subagent dispatch、输入输出、并行规则、错误处理

---

### P2 — Minor(可改进,不阻塞)

#### P2-1: arch-analyze SKILL.md 行数偏短(56 行 vs UA 844 行)

可接受用 references 拆分,但 references 也得详细。

#### P2-2: arch-diagram 占位实现合理

`v2-placeholder.md` 占位逻辑符合 spec §4.1.5。✅

#### P2-3: 缺 wiki 缓存机制实现

**spec §5.4** 提到 wiki 渲染缓存(fingerprint 失效)。当前 render-wiki.js 没实现 cache 检查,每次都重渲。

#### P2-4: 缺 acceptance Loop refiner 协议

**spec §11.5** 共享 refiner loop 协议。arch-review 的 references/refiner-loop.md 存在,但 acceptance YAML 没引用。

#### P2-5: 缺 .arch-library 链接

`arch-library/` 目录在仓库根存在(v1.0 残留),但 v2.0 spec 没明确这个目录的归宿(是否提供给 rules/ 参考)。建议显式归位或移到 templates/。

---

## 四、修复优先级建议

### 第 1 轮(P0,必修)

| 序号 | 任务 | spec 章节 |
|---|---|---|
| F1 | 重写 9 个 subagent prompt(每个不少于 100 行) | §3.5 / §4.3 / §11.3 |
| F2 | 修正 Phase 编号(加 Phase 1.5 BATCH + 7 REVIEW) | §3.7 / §3.15 |
| F3 | 修正 CR.md 14 段标题(严格按 spec §4.1.2.1) | §4.1.2.1 |
| F4 | 在 5 个 SKILL.md 加 subagent dispatch 模板 | §3.7 / UA SKILL |
| F5 | state.schema hooks_enabled 从 const: false 改为 default: false | §3.10.0 |
| F6 | hooks.json 改为 Claude Code 官方格式 | §3.10.1 |
| F7 | render-wiki.js 加 LLM 渲染(或 SKILL.md 加 dispatch),实现"已知局限"段 | §5.2 / §5.2.1 |

### 第 2 轮(P1,应修)

| 序号 | 任务 |
|---|---|
| F8 | plugin.json/marketplace.json 注册 agents/hooks |
| F9 | cr.schema.json 字段对齐 spec §4.1.2.1 |
| F10 | state.schema history.skill 加 19 枚举 |
| F11 | 扩写 hooks/arch-update-prompt.md |
| F12 | 补全 6 个 references 文档 |
| F13 | package.json 补 devDependencies |
| F14 | 扩写 phase-pipeline.md |

### 第 3 轮(P2,可改进)

| 序号 | 任务 |
|---|---|
| F15 | wiki cache 机制实现 |
| F16 | acceptance Loop refiner 协议引用 |
| F17 | arch-library 归位 |

---

## 五、给 codex 的修复 Brief

请按 `docs/audit-v2.0-implementation.md` 修复,**严禁**:

1. 自行修改 spec(CR.md 14 段标题 / Phase 编号 / schema 字段名),如有疑问先问
2. 用 10 行占位糊弄 prompt(spec §3.5 / §4.3 明确要求完整 prompt)
3. 让骨架代码冒充实现(render-wiki 输出 1 行就算完成 wiki)

**必须**:

1. 第 1 轮 P0(7 项)全部完成才能再 commit
2. 修完跑 `npm run verify` + `node engine/bin/scanner.js --workspace samples/.understand-arch/sample` 验证不破坏现有
3. 跑完 sample 后,wiki/01-overview.md 至少 50 行(讲透项目全景)
4. CR.md 的 14 段必须能在 sample workspace 跑通 cr-md-editor.js + senior-review.js 全链路
5. 修复前先读 spec §16 实施合同 + §4.1.2 / §4.1.2.1 / §3.7 / §3.10

---

## 附录:总产物清单(对照 §16.4 决策表)

| 项 | 期望 | 实际 | 状态 |
|---|---|---|---|
| 用户入口 skill | 5 | 5(arch-onboard/design/audit/wiki/diagram) | ✅ |
| 内部 skill | 4 | 4(arch-analyze/frame/adr/review) | ✅ |
| Subagent | 9 | 9 个文件(但内容都是占位) | ⚠️ 数对 / 内容缺 |
| Phase 数 | 0-8 | codex 0-8(但编号挪位) | ❌ |
| 多仓并行 worker | M=5 | 未在 SKILL 中明确(scheduler-playbook 缺) | ⚠️ |
| wiki 页数 | 14 | 14(README + 01-14) | ✅ |
| CR.md 结构 | YAML frontmatter + 14 段(spec 标题) | 14 段(但标题被 codex 改) | ❌ |
| Schemas | 5 | 5 个文件 | ✅ |
| Rubrics | 10 | 10 个文件 | ✅ |
| Acceptance gates | 4 | 4 个文件 | ✅ |
| Rules 模板 | 6 | 6 个文件 | ✅ |
| Engine bin 入口 | 11 | 25(多了 adr-editor/analyze-workspace 等辅助,可接受) | ✅+ |
| Node ID 格式 | `{repo_id}::{local-id}` | sample 中正确 | ✅ |
| hooks 默认 | disabled | hooks_enabled: false(但 schema const 阻止启用) | ⚠️ |
| 视图层 | wiki/ 14 页 | wiki/ 14 页(内容占位) | ⚠️ |
| 配置目录 | 项目内 rules/ | 项目内 rules/ + plugin 内 templates/rules/ | ✅ |
| cr-md-editor.js | spec §4.1.2.3 5 个 API | 实现了(但 14 段标题错) | ⚠️ |
