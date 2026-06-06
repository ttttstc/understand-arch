# understand-arch v3.8 Spec(命令空间收敛 + 安装识别修复)

> Version: 3.8 · Status: Draft · 基于:`docs/spec-v3.7.md`(增量 delta,不重写 v3.0~v3.7)
> 主题:把 5 个污染命令空间的内部 skill 全部分流到 `agents/` 或 `internal/playbooks/`,`skills/` 只剩 8 个干净的一级命令;顺手补 2 个长期悬空的 `subagent_type` 引用;修复 plugin 安装后命令调不起的根因。

---

## 0. 摘要

v3.0~v3.7 让 understand-arch 在功能层面完整(底座 / 约束 / 出图 / CR 质量 / 自迭代 / 真并行 / 技术深度 / 跨平台)。但**用户感知层**积累了三个长期问题:

1. **命令空间污染**:`skills/` 下 13 个目录全部被 Claude Code 暴露为 slash command,其中 5 个(`arch-analyze` / `arch-enrich` / `arch-frame` / `arch-review` / `arch-adr`)实际上是**内部编排器或子流程**,用户不该见到也不该调用。命令清单 13 项让用户决策疲劳,也让模型在做意图路由时容易调错。
2. **悬空 subagent 引用**:`subagent_type=arch-frame` 被 `arch-design` 多处引用,但 `agents/` 里**根本没有** `arch-frame.md`;`subagent_type=arch-suspicious-recheck` 在 `arch-audit` 里同样悬空。这是 v3.5 真 Task 改造时引入的回归,一直没修。
3. **plugin 安装识别失败**:用户实测「带前缀也调不起」,说明 plugin 的 skill 发现彻底失败,根因疑似 `plugin.json` 缺 `skills`/`agents` 路径字段(`.copilot-plugin/plugin.json` 和 `.cursor-plugin/plugin.json` 都明示了这两个字段,只有 `.claude-plugin/plugin.json` 没声明)。

v3.8 一次性解决这三件事:

1. **5 个内部 skill 全部分流**:`arch-analyze` / `arch-enrich` 整体搬到 `internal/playbooks/`(含 .mjs 与数据子目录);`arch-frame` / `arch-adr` 转成 `agents/` 下的 subagent;`arch-review` 直接删除(它只是薄封装,调用方改直接 dispatch `arch-senior-reviewer`)
2. **补 2 个悬空 subagent**:`agents/arch-frame.md`(分流过来正好填上)+ `agents/arch-suspicious-recheck.md`(新写)
3. **plugin.json 补字段 + 安装链路校验**:`.claude-plugin/plugin.json` 补 `skills` / `agents` / `description` 等关键字段,`scripts/doctor-plugin-install.mjs` 加 skill 发现实测

**不引入 `commands/` 目录,不引入新一级命令,不改 README 用户视角**(命令清单本来就只列 8 个,收敛后用户感知层完全无变化)。

v3.8 用户入口仍 8 个:`onboard / design / audit / wiki / diagram / dashboard / interview / improve`。

---

## 1. 全局规约(继承)

继承 v3.0~v3.7 全部铁律(§1.1 ~ §1.11),本 spec 不复述。

**新增铁律**:

12. **`skills/` 目录只放一级命令**。任何在 `skills/` 下的目录都被 Claude Code 自动暴露为 `/{plugin}:{skill}` slash command。内部编排器、子流程、薄封装一律不得进 `skills/`。
13. **subagent 引用必须可解析**。任何在 SKILL.md / playbook 中出现的 `subagent_type=<name>` 必须在 `agents/` 下有对应 `<name>.md`,否则 dispatch-lint 直接 fail。
14. **playbook 不是 skill**。`internal/playbooks/*` 是一级 skill 通过 `Read` 加载的内部编排文档,不被 plugin manifest 暴露,不暴露给用户。

---

## 2. 需求来源

### 2.1 命令空间污染(grep 核实)

```
skills/(13 个目录,全部被 plugin marketplace 自动暴露为 slash command)
├── 一级命令(8):arch-{onboard,design,audit,wiki,diagram,dashboard,interview,improve}
└── 内部 skill(5):
    ├── arch-analyze     (Phase 0~6 编排器,自己 dispatch file-analyzer ×N)
    ├── arch-enrich      (Phase 7~13 编排器,自己 dispatch 7 个 analyzer subagent)
    ├── arch-frame       (CR 前置硬门,被 subagent_type 引用但物理不在 agents/)
    ├── arch-review      (薄封装,只 dispatch arch-senior-reviewer)
    └── arch-adr         (ADR 写入子流程)
```

用户看到的 `/understand-arch:arch-analyze` 等 5 个内部命令是噪声,也让模型在意图路由时容易调错(例如把 `/arch-analyze` 当作用户级扫描入口,绕过 `arch-onboard` 的增量决策逻辑)。

### 2.2 悬空 subagent 引用(grep 核实)

```bash
grep subagent_type= skills/*/SKILL.md | sort -u
```

发现 18 个 `subagent_type` 中:

- ✅ 16 个在 `agents/` 下有对应文件
- ❌ `subagent_type=arch-frame`:被 `skills/arch-design/SKILL.md` 第 94 行 + 第 183 行引用,**`agents/arch-frame.md` 不存在**
- ❌ `subagent_type=arch-suspicious-recheck`:被 `skills/arch-audit/SKILL.md` 第 78 行引用,**`agents/arch-suspicious-recheck.md` 不存在**

两个引用在运行时会让 Task 工具找不到 subagent,实际执行被 Claude 兜底为内嵌模拟,功能没坏但**违反 v3.5 真 Task 铁律**且 dispatch-lint 没抓到(因为 lint 只校验段落措辞,没校验目标是否存在)。

### 2.3 plugin 安装识别失败

`.claude-plugin/plugin.json` 当前:

```json
{
  "name": "understand-arch",
  "description": "...",
  "version": "3.7.0-rc2"
}
```

对照 `.copilot-plugin/plugin.json` 和 `.cursor-plugin/plugin.json`(它们工作正常):

```json
{
  ...
  "skills": "./skills/",
  "agents": "./agents/"
}
```

**Claude Code 的 plugin loader 大概率需要 `skills` 字段显式声明 skills 目录路径**。当前 `.claude-plugin/plugin.json` 没有这俩字段,plugin 加载后 skill 发现链路断裂,即使带 `/understand-arch:` 前缀也调不起。

`scripts/doctor-plugin-install.mjs` 当前只校验 `installed_plugins.json` 注册条目和 `manifest.version`,**不校验 skill 实际可发现**,所以诊断不出这个故障。

### 2.4 用户决策

| # | 决策 | 来源 |
|---|---|---|
| 1 | 全部收敛(选项 A):5 个内部 skill 全分流,skills/ 只剩 8 个 | 用户明示 |
| 2 | analyze/enrich 迁移可接受功能上的轻微降级(原 onboard→analyze→file-analyzer 三层 UI 嵌套,变成 onboard→file-analyzer 两层) | Claude 评估通过 |
| 3 | 安装识别问题与收敛同轮处理(基础体验问题应优先) | 用户明示「v3.7 已做完」,本轮可专注此事 |
| 4 | 严禁引入 `commands/` 目录 | 用户明示「不想引入 command」 |

---

## 3. 目标 & 非目标

### 3.1 目标

1. `skills/` 下严格只剩 8 个一级命令目录:`arch-{onboard,design,audit,wiki,diagram,dashboard,interview,improve}`
2. 5 个内部 skill 按性质分流到 `agents/` 或 `internal/playbooks/`(详见 §5.1)
3. `agents/` 下补齐 2 个原本悬空的 subagent:`arch-frame.md`(从收敛过来)+ `arch-suspicious-recheck.md`(新写)
4. 所有 `subagent_type=<name>` 引用 100% 可解析(新增 dispatch-lint R8 校验)
5. `.claude-plugin/plugin.json` 补 `skills` / `agents` / `displayName` 等关键字段,plugin 安装后 8 个一级命令可在 Claude Code 内通过 `/understand-arch:arch-onboard` 唤起
6. `scripts/doctor-plugin-install.mjs` 加「skill 发现实测」校验
7. v3.0~v3.7 所有产物 / 字段 / 用户感知行为不破坏
8. `npm run verify` exit 0
9. 版本号 → `3.8.0-rc1`

### 3.2 非目标

- 不引入 `commands/` 目录 / 不引入新一级命令(铁律)
- 不改 8 个一级 skill 的用户感知行为(命令名 / 参数 / 输出位置 / README)
- 不改 v3.7 跨平台 install.sh / install.ps1(它们 symlink 的是 `skills/` 整体目录,本轮收敛后 symlink 内容变干净是自然结果,无需改脚本)
- 不重构 v3.6 cards / v3.5 真 Task 铁律 / v3.4 增量 onboard
- 不重写任何 .mjs 工具(arch-analyze 下 9 个 .mjs 整体随目录搬迁,内部相对引用保持原样)
- 不引入新一级命令的同时也**不删一级命令**(8 个保留)
- 不在本轮做 Repo rules 导出(那是 v3.9 候选,见 §8)

---

## 4. 用户视角变化

**完全无变化**。

| 维度 | v3.7 | v3.8 |
|---|---|---|
| 一级命令清单 | `/arch-{onboard,design,audit,wiki,diagram,dashboard,interview,improve}` | 同 ✅ |
| 参数 / `--flag` | v3.0~v3.7 全部保留 | 同 ✅ |
| 输出位置 | `.understand-arch/{p}/...` | 同 ✅ |
| README 主体 | 不动 | 同 ✅ |

唯一可能感知的差异:`/understand-arch:arch-analyze` 等 5 个内部 skill **不再出现在 Claude Code 的命令补全列表里**。这是预期效果(降低决策疲劳),不是退化。

---

## 5. 实施要点

### 5.1 5 个内部 skill 的分流去向

| 当前 | 性质 | 去向 | 关键约束 |
|---|---|---|---|
| `skills/arch-analyze/` (SKILL.md + 9 .mjs + 3 数据子目录) | Phase 0~6 编排器,自己 dispatch file-analyzer ×N | **`internal/playbooks/analyze/`**(整体 `git mv`) | 所有 .mjs / .py / 数据子目录原样保留;SKILL.md 改名 `playbook.md`;`arch-onboard` 改 `Read internal/playbooks/analyze/playbook.md` 后在自己上下文跑 Phase 0~6 |
| `skills/arch-enrich/` (SKILL.md) | Phase 7~13 编排器,自己 dispatch narrative/capability/quality/...subagent | **`internal/playbooks/enrich/`** | 同上,改 `Read internal/playbooks/enrich/playbook.md` |
| `skills/arch-frame/` (SKILL.md) | CR 前置硬门,叶子子流程,**已被 `subagent_type=arch-frame` 引用** | **`agents/arch-frame.md`**(转 subagent) | 完美填补悬空引用;frontmatter 改为 subagent 格式(去掉 `argument-hint`,加 `description` 给 Task 工具识别) |
| `skills/arch-review/` (SKILL.md) | 薄封装,只 dispatch `arch-senior-reviewer` | **删除** | `arch-design` / `arch-audit` 内部凡是「调 `arch-review`」的地方,改为直接 dispatch `arch-senior-reviewer` |
| `skills/arch-adr/` (SKILL.md) | ADR 写入子流程,被 `arch-design` 引用 | **`agents/arch-adr.md`**(转 subagent) | 同 frame |

### 5.2 `internal/playbooks/` 目录结构

```
internal/playbooks/
├── analyze/
│   ├── playbook.md                   ← 原 skills/arch-analyze/SKILL.md
│   ├── build-fingerprints.mjs
│   ├── compute-batches.mjs
│   ├── extract-import-map.mjs
│   ├── extract-structure.mjs
│   ├── scan-project.mjs
│   ├── merge-batch-graphs.py
│   ├── merge-subdomain-graphs.py
│   ├── frameworks/
│   ├── languages/
│   └── locales/
└── enrich/
    └── playbook.md                   ← 原 skills/arch-enrich/SKILL.md
```

**`internal/`** 是约定目录名:与 `internal/schemas/` 同级,不进 `.claude-plugin/` 暴露范围。

### 5.3 新增 `agents/arch-frame.md`(从 skills/arch-frame/ 转化)

frontmatter:

```yaml
---
name: arch-frame
description: Internal CR-design pre-grill hardener. Consumes pre-grill JSON, adds implementation framing, missing acceptance criteria, and blocking_unknown_count. Only invoked by arch-design.
---
```

Body 内容照搬 `skills/arch-frame/SKILL.md` body,**不重写 prompt 逻辑**。

### 5.4 新增 `agents/arch-suspicious-recheck.md`(全新)

`arch-audit` 第 78 行引用此 subagent,但目前不存在,运行时由 Claude 兜底内嵌模拟。本轮把它落地为真 subagent。

`description`:对 suspicious-findings 库做一致性检查,识别因代码迁移导致的失效 finding,产 `intermediate/suspicious-recheck-report.json`,供 audit 报告归类。

具体 prompt 内容由 codex 在实施时按 `arch-audit/SKILL.md` 上下文撰写,~80 行规模,参照 `agents/arch-decision-extractor.md` 风格。

### 5.5 新增 `agents/arch-adr.md`(从 skills/arch-adr/ 转化)

frontmatter:

```yaml
---
name: arch-adr
description: Internal ADR writer. Append-only ADR management plus arch-layer architecture_decisions indexing. Only invoked by arch-design when a long-term decision is detected.
---
```

Body 照搬 `skills/arch-adr/SKILL.md` body。

### 5.6 删除 `skills/arch-review/`

只要把 `arch-design` / `arch-audit` / `arch-wiki` 里所有 `Dispatch arch-review with ...` 措辞改成 `Dispatch arch-senior-reviewer ...`(等效路径,本来 review 就是薄封装)。

### 5.7 `arch-onboard` 改造:从 dispatch skill 到 read playbook

`arch-onboard/SKILL.md` 内部需要找到所有引用,改写如下:

**当前(v3.7)**:
```text
Dispatch `/arch-analyze` for every repo. ...
Dispatch `arch-enrich` for Phase 7-13.
```

**v3.8**:
```text
Read `internal/playbooks/analyze/playbook.md` and execute Phase 0-6 for every repo, following its subagent dispatch contract (file-analyzer ×N still uses Task tool with subagent_type=file-analyzer).
Read `internal/playbooks/enrich/playbook.md` and execute Phase 7-13, following its subagent dispatch contract (narrative/capability/quality/... still use Task tool).
```

关键:**onboard 不能用 Task 工具调用 playbook**(playbook 不是 subagent);它必须 `Read` 进来,然后在自己上下文里跑里面规定的 dispatch 序列。

`Subagent Dispatch Is Mandatory` 段保留,但加一句:

```text
For internal phase playbooks (analyze, enrich), use the Read tool to load
the playbook body, then execute its phase dispatch contract in the current
session. Do not attempt Task dispatch against playbook names — they are not
registered subagents.
```

### 5.8 `.claude-plugin/plugin.json` 补全字段

对照 `.copilot-plugin/plugin.json` 和 `.cursor-plugin/plugin.json`,补齐:

```json
{
  "name": "understand-arch",
  "displayName": "understand-arch",
  "description": "Architect-grade code and architecture analysis on top of the understand-arch scanner",
  "version": "3.8.0-rc1",
  "author": { "name": "ttttstc" },
  "homepage": "https://github.com/ttttstc/understand-arch",
  "repository": "https://github.com/ttttstc/understand-arch",
  "license": "MIT",
  "keywords": ["codebase-analysis", "knowledge-graph", "architecture", "onboarding", "dashboard"],
  "skills": "./skills/",
  "agents": "./agents/"
}
```

`.claude-plugin/marketplace.json` 同步升版本号到 `3.8.0-rc1`。

### 5.9 `doctor-plugin-install.mjs` 加 skill 发现实测

当前只校验 `installed_plugins.json` 注册条目。本轮加:

1. 解析 `plugin.json` 的 `skills` 字段,确认目录存在
2. 遍历 `skills/*/SKILL.md`,校验每份 frontmatter 含 `name` 字段
3. 严格模式下,如果 skill 数 ≠ 8,报警(防止以后又混进内部 skill)

### 5.10 `dispatch-lint.mjs` R8 新增

R1~R7 不动。新增 R8:**所有 `subagent_type=<name>` 引用必须能在 `agents/<name>.md` 找到对应文件**。

实现:扫所有 `skills/*/SKILL.md` 和 `internal/playbooks/*/playbook.md`,正则提 `subagent_type=([a-z-]+)`,对照 `agents/` 实际文件名集合。

单测 fixture:故意引用一个不存在的 subagent_type → R8 fail。

### 5.11 引用清扫

执行收敛后,全仓 grep 一次,确保没有「孤儿引用」(指向已删除 skill 的字串):

- `/arch-analyze` / `arch-analyze SKILL` → 改为引用 playbook 路径
- `/arch-enrich` / `arch-enrich SKILL` → 同上
- `/arch-frame` / `subagent_type=arch-frame` → 现在指 `agents/arch-frame.md`,正常
- `/arch-review` / `Dispatch arch-review` → 改为 `Dispatch arch-senior-reviewer`
- `/arch-adr` → 改为 dispatch `subagent_type=arch-adr`

可能涉及的文件:`docs/` 全部、`README*.md`、`agents/*.md`、所有保留 `skills/*/SKILL.md`、`engine/arch/*.mjs`(虽然很可能没有,但要扫)。

---

## 6. 文件清单

### 6.1 移动 / 删除

- `skills/arch-analyze/` → `internal/playbooks/analyze/`(`git mv` 整体,SKILL.md 改名 `playbook.md`)
- `skills/arch-enrich/SKILL.md` → `internal/playbooks/enrich/playbook.md`
- `skills/arch-frame/SKILL.md` → `agents/arch-frame.md`(改 frontmatter)
- `skills/arch-adr/SKILL.md` → `agents/arch-adr.md`(改 frontmatter)
- `skills/arch-review/SKILL.md` → **删除**(空目录一并删)

### 6.2 新增

- `agents/arch-suspicious-recheck.md`(全新,~80 行)
- `docs/spec-v3.8.md`(本文档)
- `docs/audit-v3.8-impl.md`(实现后)

### 6.3 修改

| 文件 | 改造 |
|---|---|
| `skills/arch-onboard/SKILL.md` | `/arch-analyze` / `arch-enrich` dispatch → `Read playbook + 内联执行`;新增「内部 playbook 不走 Task」声明段 |
| `skills/arch-design/SKILL.md` | `Dispatch arch-review` → `Dispatch arch-senior-reviewer`;`subagent_type=arch-frame` 不变(现在引用得到了);`subagent_type=arch-adr` 替换原 `Dispatch arch-adr` 措辞 |
| `skills/arch-audit/SKILL.md` | `Dispatch arch-review` → `Dispatch arch-senior-reviewer`;`subagent_type=arch-suspicious-recheck` 不变(现在引用得到了) |
| `skills/arch-wiki/SKILL.md` | 如有 `Dispatch arch-review`,改为 senior-reviewer |
| `.claude-plugin/plugin.json` | 补 `skills` / `agents` / `displayName` / `author` 等字段,版本 `3.8.0-rc1` |
| `.claude-plugin/marketplace.json` | 版本 `3.8.0-rc1` |
| `.cursor-plugin/plugin.json` / `.copilot-plugin/plugin.json` | 版本同步 `3.8.0-rc1` |
| `package.json` | 版本 `3.8.0-rc1` |
| `scripts/doctor-plugin-install.mjs` | 加 skill 发现实测(§5.9) |
| `engine/arch/dispatch-lint.mjs` | 加 R8(§5.10) |
| `engine/arch/__tests__/dispatch-lint.test.mjs` | 加 R8 fixture(悬空引用 fail) |

### 6.4 不动

- 任何 v3.0~v3.7 schema(graph / arch-layer / cards / constraint / agent-card)
- 8 个一级 skill 的用户感知行为(命令名 / 参数 / 输出)
- README.md / README.zh.md 主体(命令清单仍 8 个,符合现状)
- v3.7 跨平台 install.sh / install.ps1(symlink 整体目录,收敛后自然只 symlink 8 个干净 skill)
- 所有 v3.0~v3.7 测试与产物路径
- vendor/fireworks-tech-graph

---

## 7. 验收

### 7.1 确定性层

- [ ] `ls skills/` 严格等于 8 个目录(`arch-{onboard,design,audit,wiki,diagram,dashboard,interview,improve}`),无多无少
- [ ] `ls internal/playbooks/` 含 `analyze/` 和 `enrich/`,且 analyze 子树含原 9 .mjs + 3 数据子目录(`git mv` 不丢文件)
- [ ] `ls agents/` 含原有 23 个 + 新增 3 个 = **26 个**:`arch-frame.md` / `arch-adr.md` / `arch-suspicious-recheck.md`
- [ ] `grep -rn "skills/arch-analyze\|skills/arch-enrich\|skills/arch-frame\|skills/arch-review\|skills/arch-adr" .` 仅匹配本 spec 自身(其他全部清扫)
- [ ] `grep -rn "/arch-analyze\|/arch-enrich\|/arch-review" skills/` 0 匹配(改成 Read playbook 或 dispatch subagent)
- [ ] `engine/arch/dispatch-lint.mjs --strict` exit 0,R8 通过(18 个 subagent_type 全部可解析)
- [ ] dispatch-lint 单测含「故意悬空引用 → fail」case
- [ ] `npm run verify` exit 0
- [ ] v3.7 所有测试不破坏(13+ 文件 35+ case)
- [ ] 版本 `3.8.0-rc1` 在 4 个 manifest 一致(plugin.json / marketplace.json / package.json + 2 个 runtime manifest)

### 7.2 安装识别实测(硬指标)

- [ ] 沙箱新环境跑 `node scripts/install-claude-plugin.mjs`,然后 Claude Code 内 `/plugin list` 能看到 `understand-arch@3.8.0-rc1`
- [ ] `/understand-arch:` 触发补全,**列出 8 个一级命令**,内部命令 0 个(grep `/understand-arch:arch-analyze` 应失败)
- [ ] `/understand-arch:arch-onboard` 真实唤起 skill(走 onboard SKILL.md prompt)
- [ ] `node scripts/doctor-plugin-install.mjs --strict` exit 0,且报告 skill 数 = 8

### 7.3 回归保护

- [ ] 已有项目跑 `/arch-onboard`(增量模式),Phase 0~13 全部跑过,产物 diff 0(即 analyze/enrich 改成 Read playbook 后行为等价)
- [ ] 跑 `/arch-design` 完整流程:pre-grill → arch-frame → CR-OPTION → CR.md → senior-reviewer,无任何 dispatch 失败
- [ ] 跑 `/arch-audit`:无 `arch-suspicious-recheck` 找不到的错误(它现在是真 subagent)
- [ ] v3.7 跨平台 install.sh 测试不变(`install.sh codex` → 8 个 per-skill symlink,**而不是 13 个**)

### 7.4 文档

- [ ] `docs/audit-v3.8-impl.md` 三层验收报告齐全
- [ ] README.md / README.zh.md 命令清单仍 8 个,无变更

---

## 8. 不做的事(v3.9 候选)

| # | 能力 | 推后理由 |
|---|---|---|
| 1 | Repo rules 导出 to `agent-context/AGENTS.md`(从约束层 confirmed 项确定性投影) | 上一轮讨论的「下游执行闭环燃料」高价值借鉴,与本轮主题(内务收敛)无关,单独 v3.9 |
| 2 | senior-reviewer 加对抗性 prompt | 同上,留 v3.9 |
| 3 | arch-frame 加「禁区集」字段 | 同上,留 v3.9 |
| 4 | 把 `internal/playbooks/` 也对 Claude Code 暴露为某种「内部命令」 | 违反本轮初衷,不做 |
| 5 | 引入 `commands/` 目录强行注册短命令(`/arch-onboard` 无前缀) | 用户明示不要,不做 |

---

## 9. 交付节奏

由于纯内务工作 + 链路修复,1 个 T 收口:

| T | 产出 |
|---|---|
| T1 | 5 个 skill 分流 + 3 个新 agent + .claude-plugin/plugin.json 补字段 + onboard SKILL 改造 + dispatch-lint R8 + doctor 加发现实测 + 引用清扫 + 沙箱安装实测 + audit 报告 |

工期估 1-2 天(其中沙箱安装实测最耗时,需要 Codex 实测 Claude Code 内命令唤起)。

---

## 10. 风险

| 风险 | 缓解 |
|---|---|
| `git mv` arch-analyze 时丢文件(9 .mjs + 3 数据子目录) | 用 `git mv` 一次性整目录,然后 `git diff --stat` 校验文件数;实施后跑 `ls internal/playbooks/analyze/` 比对原 `ls skills/arch-analyze/` |
| arch-analyze 内 .mjs 文件之间的相对 import 因路径迁移失效 | `.mjs` 之间用相对路径 import 时 `git mv` 不动相对关系;实际风险低,但 T1 必须跑 `node --check internal/playbooks/analyze/*.mjs` 全部通过 |
| onboard 改 Read 后,playbook 内 dispatch 关系断裂 | playbook body 不动,dispatch contract(file-analyzer × N、narrative-analyzer 等)对应的 `agents/*.md` 100% 保留;实测 `/arch-onboard` 完整跑过即证明 |
| Claude Code 的 plugin loader 实际不读 `skills` / `agents` 字段(我们假设错) | T1 内必须沙箱实测,如果补字段后仍调不起,需要补 codex 调研 Claude Code plugin.json schema 后再决定;最坏情况降级为「补字段不工作 → 用其他方式」 |
| arch-review 删除后,某处遗漏改成 senior-reviewer | dispatch-lint R8 兜底:所有 `subagent_type=arch-review` 引用都会 fail(因为 agents 里没有 arch-review.md) |
| internal/playbooks 内的 SKILL.md frontmatter 被某些工具误识别为 skill | 改名 `playbook.md` 去掉 `SKILL.md` 命名,断绝任何工具按 `**/SKILL.md` 通配的识别可能 |

---

## 11. 与 v3.7 跨平台的交互

v3.7 的 `install.sh` symlink 整个 `skills/` 目录到 12 runtime。本轮收敛后:

- **per-skill 模式**(codex / opencode / pi 等):原本 symlink 13 个,现在 symlink 8 个 —— **目标 runtime 命令空间也自然变干净**,这是顺带的收益
- **folder 模式**(openclaw / hermes 等):整个 `skills/` 目录被 symlink 进去,内容变干净
- `internal/playbooks/` 不在 `skills/` 下,**不被 install.sh symlink**,但被 `skills/arch-onboard` 的 `Read` 引用 —— 跨 runtime 时,onboard SKILL 用相对路径 `Read ../../internal/playbooks/analyze/playbook.md`,需要确认 symlink 解析后路径正确

**风险点**:跨 runtime 下 symlink 解析 `..` 时,可能跳出我们仓库到 runtime 自己的目录树。

**缓解**:onboard SKILL 内的 Read 路径写为相对**仓库根**的方式 `Read ${REPO_ROOT}/internal/playbooks/analyze/playbook.md`,而不是相对 SKILL 文件本身的 `..`。具体路径模式由 codex 实施时与 v3.7 安装链路验证。

---

## 12. 与 v3.5 真 Task 铁律的关系

v3.5 把所有内部 dispatch 强制为真 Task 工具调用。v3.8 的 playbook 模式**不违反**这条:

- **本身** internal/playbooks/ 不是 subagent,所以不能用 Task 调
- **但 playbook 内** 描述的 dispatch(file-analyzer / narrative-analyzer 等)**仍然全部是真 Task**
- onboard 把 playbook 内容读进来后,在主对话里按 playbook 的指令对 N 个真 subagent 起真 Task

效果:用户看到的还是 N 个嵌套 subagent 窗口,只是中间层(原本 analyze 自己也作为一个 subagent 窗口)被压扁了。

v3.5 dispatch-lint R1~R7 在 playbook 上同样适用(它们检查的是文本措辞,与文件是 skill 还是 playbook 无关)。
