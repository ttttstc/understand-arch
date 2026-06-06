# understand-arch v3.7 Spec(跨平台 runtime 分发 — 照搬 UA symlink 模式)

> Version: 3.7 · Status: Draft · 基于:`docs/spec-v3.6.md`(增量 delta,不重写 v3.0~v3.6)
> 主题:让 understand-arch 从「仅 Claude Code」扩展到「跨 12 个 agentic runtime」,完全照搬 Understand-Anything(UA)的 symlink + 独立 manifest 模式,**不引入 MCP server**,**不重写产物**。

---

## 0. 摘要

v3.0~v3.6 让 understand-arch 在 Claude Code 内成为一个完整的架构师助手。但当前仍是 Claude Code 专属:其他主流 agentic runtime(Codex CLI、opencode、openclaw、Cursor、Copilot、Gemini CLI、Cline 等)用户无法直接使用。

UA(我们 fork 的扫描引擎上游)已经验证了一条覆盖 12 个 runtime 的轻量路径:**一份 `skills/` + `agents/` 源、N 个 symlink 目标 + 3 个专属 manifest + 1 个 curl-pipe 安装脚本**,不走 MCP。

v3.7 完全照搬 UA 的这套模式:

1. **平台表**:复刻 UA 的 12 个 runtime 配置(gemini / codex / opencode / pi / openclaw / antigravity / vibe / vscode / hermes / cline / kimi / trae),并保留我们已有的 Claude Code 原生路径
2. **3 个专属 manifest**:`.claude-plugin/`(已有)+ 新增 `.cursor-plugin/` + 新增 `.copilot-plugin/`
3. **install.sh + install.ps1**:一行 curl-pipe 安装,平台表对齐 UA
4. **不改物理布局**:`skills/` `agents/` 保持仓库根目录现状,3 个 manifest 通过相对路径引用
5. **v3.5 Task 铁律软化**:把「严禁内嵌」改为「优先 Task,无 Task tool 的 runtime 上 inline 也可」—— 必须改,否则 SKILL 在非 Claude Code runtime 上拒绝执行
6. **README 加跨平台安装段**:用户视角不暴露 12 平台细节,只展示「Claude Code 一键 / Codex 一键 / 其他 → 文档」

v3.7 用户入口数量不变(仍 7+1 个)。命令在任何 runtime 上行为一致(差异仅在子代理 UI 表现 + 真并行能力)。

---

## 1. 全局规约(继承)

v3.7 继承以下铁律:

1. LLM 语义推断只在 Skill / subagent 内执行,Node/Python 只做确定性读写
2. 不推翻 v3.0 hard fork UA 底座
3. 不修改 v3.1~v3.6 任何 schema / 产物结构 / 用户感知命令
4. 所有面向人的产物默认中文,代码标识符 / 命令 / schema 字段保留英文
5. confirmed 约束 + 规范层硬约束,proposed 软阻塞
6. AI-mined / cr-derived 永不自标 confirmed
7. 三件套不可扩(graph / arch-layer / cards 是永久 3 个核心 JSON)
8. 优先复用 `engine/core` 已实现的增量原语
9. v3.6 项目根目录零写入

**新增铁律**:

10. **跨平台必须照搬 UA 的 symlink + 独立 manifest 模式**,严禁引入 MCP server / 重写 SKILL / 派生新协议
11. **v3.5 真 Task 铁律软化为优先级**:SKILL 在 dispatch 段须明示「优先使用 Claude Code Task 工具;若 runtime 不暴露 Task / Agent,允许内嵌执行,但需在响应开头声明已降级」。Claude Code 上仍硬要求真 Task(dispatch-lint 不变)

---

## 2. 需求来源

### 2.1 跨平台需求

| 维度 | v3.6 现状 | v3.7 要解决 |
|---|---|---|
| 安装命令 | 只能在 Claude Code 内 `/plugin marketplace add` | Codex / opencode / Cursor / Copilot 等用户无法直接安装 |
| Slash command | `/arch-onboard` 等仅 Claude Code 识别 | 其他 runtime 不识别命令前缀 |
| Subagent dispatch | 真 Task 工具(Claude Code 专属) | 其他 runtime 无 Task → 当前 SKILL 直接拒绝执行 |
| README 安装段 | 仅 Claude Code 路径 | 用户看不到其他 runtime 入口 |

### 2.2 UA 实测做法(grep + install.sh 核实)

`install.sh` 内 `platforms_table` 函数定义 12 个 runtime:

| 平台 id | 目标 skills 目录 | 风格 |
|---|---|---|
| `gemini` | `~/.agents/skills/` | per-skill |
| `codex` | `~/.agents/skills/` | per-skill |
| `opencode` | `~/.agents/skills/` | per-skill |
| `pi` | `~/.agents/skills/` | per-skill |
| `openclaw` | `~/.openclaw/skills/` | folder |
| `antigravity` | `~/.gemini/antigravity/skills/` | folder |
| `vibe` | `~/.vibe/skills/` | per-skill |
| `vscode` | `~/.copilot/skills/` | per-skill |
| `hermes` | `~/.hermes/skills/` | folder |
| `cline` | `~/.cline/skills/` | folder |
| `kimi` | `~/.kimi/skills/` | folder |
| `trae` | `~/.trae/skills/` | per-skill |

两种风格:

- **per-skill**:为每个 skill 单独创建 symlink 到 runtime 的 skills 目录(混在 runtime 已有 skills 列表里)
- **folder**:整个 `skills/` 目录 symlink 到 runtime 目录,文件夹名为 `understand-anything`(以包装形式存在)

manifest 策略:

- `.claude-plugin/{plugin.json, marketplace.json}` — Claude Code 专属
- `.cursor-plugin/plugin.json` — Cursor 专属(含 `displayName` 字段)
- `.copilot-plugin/plugin.json` — Copilot 专属
- 其他 9 个 runtime 直接消费 `skills/*/SKILL.md`,**无需专属 manifest**(隐性兼容 Claude Code SKILL.md 协议)

安装入口:

```bash
curl -fsSL https://raw.githubusercontent.com/Lum1104/Understand-Anything/main/install.sh | bash -s codex
```

或交互模式:

```bash
./install.sh        # 列出 12 个平台供选择
./install.sh codex  # 直接安装到 codex
./install.sh --update
./install.sh --uninstall codex
```

### 2.3 用户决策(讨论纪要)

| # | 决策 | 来源 |
|---|---|---|
| 1 | 完全照搬 UA symlink 模式,放弃 MCP | 用户拍板「完全照抄 UA」 |
| 2 | 12 个平台全部覆盖(含 hermes) | UA 模式下新增 runtime 几乎零成本,值得覆盖完整 |
| 3 | 不改物理布局(skills/agents 保持根目录) | 我们仓库结构跟 UA 略不同,UA 用 `understand-anything-plugin/` 子目录是因 monorepo,我们扁平结构等价 |
| 4 | v3.5 Task 铁律必须软化 | 否则 SKILL 在 Codex / opencode 等 runtime 上拒绝执行 |
| 5 | README 用户视角:Claude Code 一键 + Codex 一键 + 其他 → 文档 | 不暴露 12 平台细节,避免用户决策疲劳 |
| 6 | install.sh 平台表跟 UA 同步策略:UA 加一个我们加一个 | 维护成本可控 |

---

## 3. 目标与非目标

### 3.1 目标

1. 新增 `install.sh`(POSIX:macOS / Linux)+ `install.ps1`(Windows PowerShell),复刻 UA 平台表 12 行
2. 新增 `.cursor-plugin/plugin.json` + `.copilot-plugin/plugin.json`,与 UA 同 schema
3. 保留 `.claude-plugin/{plugin.json, marketplace.json}` 不动
4. 软化 `skills/*/SKILL.md` 中 `Subagent Dispatch Is Mandatory` 段,允许无 Task runtime 上 inline 执行(但需声明降级)
5. 更新 `engine/arch/dispatch-lint.mjs`:校验 SKILL 同时含「优先 Task」+「无 Task 降级声明」(spec §5.6)
6. 新增 `docs/runtimes/{codex,opencode,openclaw,cursor,copilot}.md` 5 个 runtime 引导文档(用户视角:在该 runtime 如何唤起 understand-arch)
7. README 加跨平台安装段(简洁,不列全 12 平台)
8. 不破坏 v3.6 全部能力(Claude Code 路径行为不变)
9. `npm run verify` exit 0
10. 版本号 → `3.7.0-rc1`

### 3.2 非目标(本轮明确不做)

- **不引入 MCP server**(UA 模式不需要,且与本轮主线无关)
- **不重写 SKILL.md 内容**(只软化 dispatch 段措辞)
- **不重写 agents/*.md**
- **不重写 engine/*.mjs**
- **不改 schema**
- **不改物理布局**(`skills/` `agents/` 不挪到子目录)
- **不写 12 个 runtime 的引导文档**(只写 5 个用户最可能用的)
- **不在 Claude Code 路径上软化 Task 铁律**(只在 SKILL 文本里加 fallback 句;Claude Code 仍硬要求真 Task,dispatch-lint 检查不变)
- **不做 runtime 行为 E2E 测试**(我们没有 12 个 runtime 的 CI 环境;每个 runtime 行为差异由用户 dogfood 反馈)
- **不引入 Web UI 安装向导**

---

## 4. 用户视角变化

### 4.1 安装命令(三种路径)

#### Claude Code(继承 v3.6,不变)

```text
/plugin marketplace add https://github.com/ttttstc/understand-arch
/plugin install understand-arch@understand-arch
/reload-plugins
```

或:

```bash
git clone https://github.com/ttttstc/understand-arch.git
cd understand-arch
node scripts/install-claude-plugin.mjs
```

#### Codex / opencode / 其他(新增,v3.7 主路径)

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/ttttstc/understand-arch/main/install.sh | bash -s codex

# Windows PowerShell
iwr -useb https://raw.githubusercontent.com/ttttstc/understand-arch/main/install.ps1 | iex -- codex
```

或本地仓库:

```bash
git clone https://github.com/ttttstc/understand-arch.git
cd understand-arch
./install.sh codex            # 或 opencode / openclaw / cursor / vscode 等
```

#### 交互模式(平台未知)

```bash
./install.sh                  # 列出 12 个平台供选择
```

### 4.2 命令行为差异(用户感知)

命令清单完全一致(7+1 个),命令行为 90% 一致,差异仅在子代理 UI:

| 体验 | Claude Code | Codex / opencode / 其他 |
|---|---|---|
| 嵌套 subagent UI 窗口 | ✅(v3.5 真 Task) | ⚠️ 主对话内嵌(无独立窗口) |
| 并行 dispatch | ✅ | ⚠️ 串行执行 |
| Token 隔离 | ✅ | ⚠️ 主对话累积 |
| 产物质量 | ✅ | ✅(LLM 调度逻辑一致) |
| `arch-onboard` 多仓 batch 扫描 | ✅ | ✅(仍调 UA file-analyzer 真 Task,如 runtime 支持) |

### 4.3 不感知

- `install.sh` 平台表的 12 个 runtime id
- `.cursor-plugin/` `.copilot-plugin/` manifest 内部细节
- Symlink 物理路径
- SKILL 软化措辞细节

### 4.4 README 描述基调

只给 3 条入口,不列全 12 平台:

```md
## 安装

### Claude Code
（保留 v3.6 描述）

### 其他 agentic runtime(Codex / opencode / Cursor / VSCode Copilot 等)
一行 curl 安装:

curl -fsSL .../install.sh | bash -s codex

支持的平台 id:codex / opencode / openclaw / cursor / vscode / 等。
完整列表见 `docs/runtimes/README.md`。
```

---

## 5. 实施要点

### 5.1 `install.sh`(POSIX,macOS / Linux)

完全照抄 UA `install.sh` 结构,仅替换名字、URL、目录变量:

```bash
#!/usr/bin/env bash
# understand-arch installer (macOS / Linux)
#
# Usage:
#   ./install.sh                       Prompt for platform
#   ./install.sh <platform>            Install for <platform>
#   ./install.sh --update              Pull latest changes
#   ./install.sh --uninstall <plat>    Remove links for <plat>
#   ./install.sh --help
#
# Curl-pipe usage:
#   curl -fsSL https://raw.githubusercontent.com/ttttstc/understand-arch/main/install.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/ttttstc/understand-arch/main/install.sh | bash -s codex
#
# Environment:
#   UA_REPO_URL  Override clone URL (default: official GitHub repo)
#   UA_DIR       Override clone destination (default: $HOME/.understand-arch/repo)

set -euo pipefail

REPO_URL="${UA_REPO_URL:-https://github.com/ttttstc/understand-arch.git}"
REPO_DIR="${UA_DIR:-$HOME/.understand-arch/repo}"
PLUGIN_LINK="$HOME/.understand-arch-plugin"

platforms_table() {
  cat <<EOF
gemini|$HOME/.agents/skills|per-skill
codex|$HOME/.agents/skills|per-skill
opencode|$HOME/.agents/skills|per-skill
pi|$HOME/.agents/skills|per-skill
openclaw|$HOME/.openclaw/skills|folder
antigravity|$HOME/.gemini/antigravity/skills|folder
vibe|$HOME/.vibe/skills|per-skill
vscode|$HOME/.copilot/skills|per-skill
hermes|$HOME/.hermes/skills|folder
cline|$HOME/.cline/skills|folder
kimi|$HOME/.kimi/skills|folder
trae|$HOME/.trae/skills|per-skill
EOF
}

# ... 完整逻辑照搬 UA install.sh:
# - platform_ids
# - resolve_platform
# - prompt_platform
# - clone_or_update
# - skills_root (返回 $REPO_DIR/skills, 注意不是 UA 的 understand-anything-plugin/skills)
# - list_skills
# - link_skills (per-skill / folder)
# - unlink_skills
# - link_plugin_root  (PLUGIN_LINK → $REPO_DIR)
# - cmd_install
# - cmd_uninstall
# - cmd_update
# - main 入参解析

# 与 UA 的唯一差异:
# - REPO_URL 指向我们
# - REPO_DIR 默认在 ~/.understand-arch/repo
# - PLUGIN_LINK 在 ~/.understand-arch-plugin
# - skills_root 返回 $REPO_DIR/skills (无 understand-anything-plugin/ 子目录,因为我们扁平结构)
# - cmd_install 末尾的 vscode 提示文本:".copilot-plugin/plugin.json"
```

### 5.2 `install.ps1`(Windows PowerShell)

照抄 UA `install.ps1`(236 行)。同样仅替换名字 / URL / 路径。

Windows 上的「symlink」用 PowerShell `New-Item -ItemType SymbolicLink`(需管理员权限或开启「开发者模式」)。

### 5.3 平台表(12 个 runtime,与 UA 同步)

按 UA 当前 `platforms_table` 一字不改复制 12 行。后续 UA 加一个我们加一个(零边际成本)。

### 5.4 3 个专属 manifest

#### 5.4.1 `.claude-plugin/`(保留,不动)

`plugin.json` 和 `marketplace.json` 已有,继承 v3.6,版本号升 3.7.0-rc1。

#### 5.4.2 `.cursor-plugin/plugin.json`(新增)

完全照搬 UA:

```json
{
  "name": "understand-arch",
  "displayName": "understand-arch",
  "description": "Architect-grade code and architecture analysis for any agentic runtime",
  "version": "3.7.0-rc1",
  "author": { "name": "ttttstc" },
  "homepage": "https://github.com/ttttstc/understand-arch",
  "repository": "https://github.com/ttttstc/understand-arch",
  "license": "MIT",
  "keywords": ["codebase-analysis", "knowledge-graph", "architecture", "onboarding", "dashboard"],
  "skills": "./skills/",
  "agents": "./agents/"
}
```

注意:`skills` 和 `agents` 路径指向我们扁平结构的根 `./skills/` `./agents/`,**不是** UA 的 `./understand-anything-plugin/skills/`。

#### 5.4.3 `.copilot-plugin/plugin.json`(新增)

```json
{
  "name": "understand-arch",
  "description": "Architect-grade code and architecture analysis for any agentic runtime",
  "version": "3.7.0-rc1",
  "author": { "name": "ttttstc" },
  "homepage": "https://github.com/ttttstc/understand-arch",
  "repository": "https://github.com/ttttstc/understand-arch",
  "license": "MIT",
  "keywords": ["codebase-analysis", "knowledge-graph", "architecture", "onboarding", "dashboard"],
  "skills": "./skills/",
  "agents": "./agents/"
}
```

### 5.5 物理布局保持扁平(不挪 skills/agents 到子目录)

UA 的目录是:

```
understand-anything/
├── .claude-plugin/
├── .cursor-plugin/
├── .copilot-plugin/
└── understand-anything-plugin/       ← 真 skill 内容子目录
    ├── skills/
    ├── agents/
    ├── hooks/
    └── src/
```

我们仓库:

```
understand-arch/
├── .claude-plugin/
├── .cursor-plugin/                    ← v3.7 新增
├── .copilot-plugin/                   ← v3.7 新增
├── skills/                            ← 扁平,不挪
├── agents/                            ← 扁平,不挪
├── engine/
├── hooks/
└── vendor/
```

理由:

- UA 用 `understand-anything-plugin/` 子目录因其 monorepo 还有别的内容
- 我们仓库已扁平,挪到子目录会破坏 v3.0~v3.6 全部相对路径引用,**改动面巨大且无收益**
- 3 个 manifest 的 `skills` `agents` 字段直接指向 `./skills/` `./agents/` 即可,UA 兼容这种写法(它的 JSON schema 允许任意相对路径)
- `install.sh` 的 `skills_root()` 函数返回 `$REPO_DIR/skills`(去掉 `understand-anything-plugin/` 中间层)

### 5.6 SKILL Task 铁律软化(关键)

v3.5 引入的 `Subagent Dispatch Is Mandatory` 段在非 Claude Code runtime 上会让 LLM **拒绝执行**(因 SKILL 明示「if neither Task nor Agent is available, stop and report」)。

软化措辞模板(每个 SKILL 头部段):

```text
## Subagent Dispatch

This skill is an orchestrator. For semantic phases that produce architectural
judgments, prefer Claude Code's subagent mechanism via the `Task` (or `Agent`)
tool with the specified `subagent_type`.

**Runtime fallback**:If the current runtime does not expose `Task` or `Agent`
tools (e.g. Codex CLI, opencode, Cursor, Copilot), inline execution is permitted.
In this case:

- Open the response with one line: `[runtime-fallback: inline subagent <name>]`
- Execute the phase logic in the main conversation
- Skip parallel-dispatch instructions; treat them as sequential
- All deterministic Node tools and JSON merge rules still apply unchanged

The `Task` path remains preferred whenever the runtime supports it; the fallback
exists for cross-runtime portability and should not be used in Claude Code.
```

每个 phase 的 dispatch 句子保留「Use the Claude Code Task tool ...」措辞,**不删**,只是在 SKILL 头部加 fallback 段。

#### dispatch-lint 更新

`engine/arch/dispatch-lint.mjs` 加规则:

- **R7(新)**:每个 SKILL 头部必须含 `Runtime fallback` 段 + `runtime-fallback:` 标记
- R1~R6 不变(Task 优先性继续硬要求)

### 5.7 runtime 引导文档(5 个,docs/runtimes/)

每份 ~50 行,用户视角:在该 runtime 怎么唤起 understand-arch。

- `docs/runtimes/codex.md`
- `docs/runtimes/opencode.md`
- `docs/runtimes/openclaw.md`
- `docs/runtimes/cursor.md`
- `docs/runtimes/copilot.md`
- `docs/runtimes/README.md`(总览 + 完整 12 平台列表 + 软化说明)

模板示例(`codex.md`):

```md
# understand-arch on Codex CLI

## 安装

\`\`\`bash
curl -fsSL https://raw.githubusercontent.com/ttttstc/understand-arch/main/install.sh | bash -s codex
\`\`\`

## 唤起方式

在 Codex 主提示框中:

> 跑 understand-arch 的 onboard,扫描当前仓库

Codex 会自动 dispatch 对应 skill。8 个 skill 名字:

- onboard / design / audit / wiki / diagram / dashboard / interview / improve

## 行为差异

- 嵌套 subagent 窗口:**不支持**(Codex CLI 当前无此抽象)
- 真并行:**自动降级为串行**
- 产物质量:与 Claude Code 一致
- 知识库目录:`.understand-arch/{project}/` 不变
```

---

## 6. 文件清单

### 6.1 新增

- `install.sh`(POSIX,~280 行,照搬 UA)
- `install.ps1`(PowerShell,~240 行,照搬 UA)
- `.cursor-plugin/plugin.json`
- `.copilot-plugin/plugin.json`
- `docs/runtimes/codex.md`
- `docs/runtimes/opencode.md`
- `docs/runtimes/openclaw.md`
- `docs/runtimes/cursor.md`
- `docs/runtimes/copilot.md`
- `docs/runtimes/README.md`
- `docs/spec-v3.7.md`(本文档)
- `docs/audit-v3.7-impl.md`(实现后写)

### 6.2 修改

| 文件 | 改造范围 |
|---|---|
| `skills/arch-enrich/SKILL.md` ~ `skills/arch-improve/SKILL.md`(7 个) | 头部加 `Runtime fallback` 段;phase dispatch 句不变 |
| `engine/arch/dispatch-lint.mjs` | 加 R7:校验 `Runtime fallback` 段存在 |
| `engine/arch/__tests__/dispatch-lint.test.mjs` | 加 case:fixture 无 fallback 段 → fail |
| `.claude-plugin/plugin.json` / `marketplace.json` / `package.json` | 版本 → `3.7.0-rc1` |
| `README.md` / `README.zh.md` | 加「其他 agentic runtime」安装段(简洁,不暴露平台细节) |

### 6.3 不动

- 任何 `agents/*.md`(本身就是 SKILL 协议兼容)
- 任何 `engine/*.mjs`(除 dispatch-lint)
- 任何 `internal/schemas/*.json`
- 任何 v3.0~v3.6 产物路径 / 字段
- 物理目录布局(skills/agents 不挪)
- `vendor/`
- `.claude-plugin/` 内部 manifest 结构(只升版本号)

---

## 7. 依赖

无新增运行时依赖。

`install.sh` 仅需:bash 4+、git、`ln -sfn`(macOS / Linux 默认有)
`install.ps1` 仅需:PowerShell 5+、git、`New-Item -ItemType SymbolicLink`(需开发者模式或管理员)

---

## 8. 验收

### 8.1 确定性层

- [ ] `install.sh` 跑过 `bash -n` 语法检查
- [ ] `install.ps1` 跑过 `pwsh -Command "Get-Content install.ps1 | Out-String | Invoke-Expression"` 语法预演
- [ ] 在测试 sandbox 跑 `install.sh codex` → 验证 symlink 实际创建到 `~/.agents/skills/`(8 个 per-skill symlink)
- [ ] 跑 `install.sh openclaw` → 验证 folder 风格 symlink 到 `~/.openclaw/skills/understand-arch`
- [ ] 跑 `install.sh --update` → 验证 `git pull` 成功
- [ ] 跑 `install.sh --uninstall codex` → 验证 symlink 全部清理
- [ ] `dispatch-lint --strict` exit 0(7 个主 SKILL 含 `Runtime fallback` 段)
- [ ] `npm run verify` exit 0
- [ ] v3.6 所有测试不破坏(13 文件 35+ case)
- [ ] 版本 `3.7.0-rc1` 三个 manifest 一致

### 8.2 文本规范

- [ ] 12 个平台表完整(与 UA 当前同步)
- [ ] 3 个 manifest 字段齐(name / description / skills / agents)
- [ ] 7 个 SKILL 头部均含 `Runtime fallback` + `[runtime-fallback: inline subagent <name>]` 标记示例
- [ ] 5 个 runtime 引导文档完整(各 ~50 行)
- [ ] `docs/runtimes/README.md` 列全 12 平台 + 完整软化说明

### 8.3 回归保护

- [ ] Claude Code 安装路径(`/plugin marketplace add ...` + `node scripts/install-claude-plugin.mjs`)行为不变
- [ ] Claude Code 上 dispatch 行为不变(仍真 Task 真并行,UI 嵌套窗口)
- [ ] v3.5 真并行硬指标(Phase 9.5 双 miner / CR-OPTION 三候选 / wiki 多受众 / audit 5b)在 Claude Code 上仍工作
- [ ] v3.6 项目根目录零写入仍守住

### 8.4 文档

- [ ] README.md / README.zh.md 加「其他 agentic runtime」段(简洁,不列全 12 平台,跳转 docs/runtimes/)
- [ ] `docs/audit-v3.7-impl.md` 三层验收报告齐全

---

## 9. 不做的事(v3.8 候选)

| # | 能力 | 推后理由 |
|---|---|---|
| 1 | MCP server 接入 | 与 UA 模式无关,生态未来如果转向 MCP 再加 |
| 2 | 12 个 runtime 全部 E2E 测试 | 我们无 CI 覆盖这么多 runtime;dogfood 反馈驱动 |
| 3 | 12 个 runtime 引导文档全集(只写 5 个) | 其余 7 个用户基数小,等需求出现再补 |
| 4 | runtime 行为差异自动检测 | 复杂度高,先靠 SKILL fallback 措辞兜底 |
| 5 | install.sh 中的「Claude Code 路径分支」 | Claude Code 走 plugin marketplace,与 symlink 模式不冲突;保留 v3.6 安装文档 |

---

## 10. 交付节奏

由于纯文本 + 脚本工作,1 个 T 收口:

| T | 产出 |
|---|---|
| T1 | install.sh + install.ps1 + 3 个 manifest + 7 个 SKILL 软化 + dispatch-lint R7 + 5 个 runtime 引导文档 + README 段 + 版本 + audit 报告 |

工期估 1-2 天。

---

## 11. 风险

| 风险 | 缓解 |
|---|---|
| 12 个 runtime 中部分隐性兼容假设可能不成立(某 runtime 不读 SKILL.md frontmatter) | UA 已实测覆盖 12 个,可信度高;若 dogfood 发现某 runtime 实际不工作,降级为「需专属 manifest」(参考 .cursor-plugin / .copilot-plugin 模式) |
| Windows symlink 需开发者模式 | install.ps1 检测并友好提示用户开启 |
| `Runtime fallback` 措辞让 Claude Code 行为退化 | 措辞明示「fallback should not be used in Claude Code」;dispatch-lint R1~R6 继续硬要求 Task 优先 |
| 平台表与 UA 不同步 | 在 `docs/runtimes/README.md` 写明同步策略;定期 review UA upstream |
| install.sh / install.ps1 跨平台 bug | 照搬 UA 实测脚本,降低 bug 概率;不引入自创逻辑 |
| Cursor / Copilot 真实 manifest schema 可能升级 | 跟踪 UA 上游 manifest 改动同步即可 |

---

## 12. 与 UA 上游的同步策略

- **install.sh 平台表**:UA 加一行,我们加一行(批量 `git diff` 比对)
- **3 个 manifest schema**:UA 升级时同步升级
- **install.sh / install.ps1 主体逻辑**:照搬,只 diff 出名字 / URL / 目录变量
- **不复制**:UA 的 `understand-anything-plugin/` 子目录结构(我们扁平)

`docs/runtimes/README.md` 末尾写明:「本插件的跨平台分发策略 fork 自 [Understand-Anything](https://github.com/Lum1104/Understand-Anything),`install.sh` 平台表与上游保持同步」。

---

## 13. 与之前讨论的方案对比

之前我推荐 MCP server 作为主路径。调研 UA 后修正:

| 维度 | 之前(MCP) | 现在(UA symlink) |
|---|---|---|
| 主路径 | MCP server | symlink + 3 manifest |
| 安装 UX | runtime 自配 MCP | 1 行 curl |
| Manifest 数 | 1 | 3 |
| runtime 覆盖 | 视 MCP 普及度 | 12(已覆盖) |
| Slash command 适配 | 每个 runtime 文档 | 不需要(隐性兼容) |
| 工程量 | 写 MCP server + 协议映射 | 写 install.sh + 2 manifest |
| 业界先例 | 仅 Anthropic 官方 MCP server | UA 已实测 12 runtime |

UA 模式更轻、更广、更经验证。本轮完全照搬。
