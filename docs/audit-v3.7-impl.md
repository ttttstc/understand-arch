# v3.7 实现验收报告

> 实现人 + 自验收: Codex  
> 分支: `feat/v3.7-impl`  
> 基线: `docs/spec-v3.7.md`  
> 主题: 跨平台 runtime 分发(UA symlink 模式)

## 结论

v3.7 T1 已完成。仓库新增 UA 风格安装脚本、Cursor/Copilot manifest、runtime fallback 文档和 SKILL 头部 fallback 声明;Claude Code 的 Task dispatch 强约束没有删除,`dispatch-lint --strict` 继续作为硬门禁。

Windows 本机实际安装路径已验证通过:`install.ps1` 能为 Codex/VS Code Copilot 创建 8 个短名 per-skill junction,为 OpenClaw 创建 folder junction;Claude 插件缓存已重装为 `3.7.0-rc1`,doctor 全绿。

需要单独说明的环境边界:当前机器的 Git Bash 在 `MSYS=winsymlinks:nativestrict` 下执行 `ln -s` 返回 `Operation not permitted`,因此 `install.sh` 的 POSIX 真 symlink 验收无法在本机 Windows 权限环境完成。`install.sh` 语法通过,非严格 Git Bash 流程可跑通,但在 Windows 上呈现为普通目录视图;Windows 用户应使用 `install.ps1`。

## 实现清单

| 项目 | 文件 | 验收 |
|---|---|---|
| POSIX 安装脚本 | `install.sh` | UA 风格平台表,repo 路径改为 `~/.understand-arch/repo`,skills 使用仓库根 `skills/` |
| Windows 安装脚本 | `install.ps1` | UA 风格 PowerShell 版,使用 junction 避免管理员 symlink 权限 |
| Cursor manifest | `.cursor-plugin/plugin.json` | `skills: "./skills/"`,`agents: "./agents/"`,版本 `3.7.0-rc1` |
| Copilot manifest | `.copilot-plugin/plugin.json` | `skills: "./skills/"`,`agents: "./agents/"`,版本 `3.7.0-rc1` |
| Runtime fallback | 7 个 `skills/*/SKILL.md` | arch-enrich/audit/design/interview/wiki/diagram/improve 头部增加 fallback 声明 |
| dispatch lint R7 | `engine/arch/dispatch-lint.mjs` | 7 个 SKILL 必须包含 `Runtime fallback` 与 `[runtime-fallback: inline subagent` |
| lint 单测 | `engine/arch/__tests__/dispatch-lint.test.mjs` | 缺 fallback fail,完整 fallback pass |
| runtime 文档 | `docs/runtimes/*.md` | Codex/opencode/OpenClaw/Cursor/Copilot 单页 + 总览 |
| README | `README.md`,`README.zh.md` | 增加其他 runtime 简介,不列全 12 平台,不暴露 MCP |
| 版本 | `.claude-plugin/*.json`,`.cursor-plugin/plugin.json`,`.copilot-plugin/plugin.json`,`package.json` | `3.7.0-rc1` |

## 确定性验收

| 命令 | 结果 | 摘要 |
|---|---|---|
| `D:\soft\Git\bin\bash.exe -lc "bash -n install.sh"` | exit 0 | POSIX 脚本语法通过 |
| `[ScriptBlock]::Create((Get-Content install.ps1 -Raw))` | exit 0 | PowerShell 脚本解析通过 |
| `pnpm dispatch:lint` | exit 0 | `dispatch-lint ok (13 skills checked, strict=true)` |
| `pnpm arch:test -- engine/arch/__tests__/dispatch-lint.test.mjs` | exit 0 | 7 cases passed |
| `npm run verify` | exit 0 | dispatch lint、arch/core/dashboard test、core/dashboard build 全通过 |
| `rg "MCP|mcp-server|antigravity|\bpi\b|vibe|cline|kimi|trae|hermes" README.md README.zh.md` | exit 1 | README 主体敏感词检查干净 |

`npm run verify` 摘要:

- arch tests:13 files / 37 cases passed。
- core tests:32 files / 664 cases passed。
- dashboard tests:6 files / 42 cases passed。
- core `tsc` build passed。
- dashboard production build passed。

## 安装验收

### 沙箱安装

| 命令 | 结果 | 摘要 |
|---|---|---|
| `install.ps1 codex` with sandbox `USERPROFILE` | exit 0 | 创建 8 个 per-skill junction:`arch-onboard`,`arch-design`,`arch-audit`,`arch-wiki`,`arch-diagram`,`arch-dashboard`,`arch-interview`,`arch-improve` |
| `install.ps1 openclaw` with sandbox `USERPROFILE` | exit 0 | 创建 folder junction:`.openclaw/skills/understand-arch` |
| `install.ps1 -Uninstall codex` with sandbox `USERPROFILE` | exit 0 | Codex 8 个入口清理完成,checkout 保留 |
| `install.sh codex` with sandbox `HOME` on Git Bash | exit 0 | 非严格 Git Bash 流程可跑通并创建 8 个入口 |
| `install.sh codex` with `MSYS=winsymlinks:nativestrict` | exit 1 | 本机权限拒绝:`ln: failed to create symbolic link ... Operation not permitted` |

### 本机 runtime 安装

本机检测到可测目录:`~/.agents`,`~/.openclaw`,`~/.copilot`,`~/.cursor`,`~/.claude`,`~/.gemini`。

| Runtime | 命令 | 结果 | 摘要 |
|---|---|---|---|
| Codex / `.agents` | `install.ps1 codex` | exit 0 | `~/.agents/skills` 下 8 个短名 junction 全部指向 `~/.understand-arch/repo/skills/*` |
| OpenClaw | `install.ps1 openclaw` | exit 0 | `~/.openclaw/skills/understand-arch` folder junction 指向 `~/.understand-arch/repo/skills` |
| VS Code Copilot | `install.ps1 vscode` | exit 0 | `~/.copilot/skills` 下 8 个短名 junction 全部指向 `~/.understand-arch/repo/skills/*` |
| Claude plugin | `pnpm plugin:install -- --ref worktree` | exit 0 | cache 安装为 `3.7.0-rc1` |
| Claude plugin doctor | `pnpm plugin:doctor` | exit 0 | installed manifest、marketplace manifest、enabledPlugins、cache version、frontmatter 全绿 |

Claude doctor 推荐验证命令:

```text
/arch-onboard
```

## 红线验收

| 红线 | 结果 |
|---|---|
| 不引入 MCP server / 新协议 | 通过:未新增 MCP 相关文件或 README 暴露 |
| 不挪 `skills/` / `agents/` 物理位置 | 通过:manifest 直接指向 `./skills/` 和 `./agents/` |
| 不删除 Claude Code Task 措辞 | 通过:dispatch-lint R1-R6 保持 strict;新增 R7 只检查 fallback |
| Runtime fallback 只加在 7 个 SKILL 头部 | 通过:arch-onboard/arch-analyze/arch-dashboard 未加 fallback |
| README 不列全 12 平台 | 通过:README 只给常用 runtime 简介并跳转 `docs/runtimes/README.md` |
| 命令短名加载 | 通过:Claude doctor 推荐 `/arch-onboard`;安装入口为 `arch-*` skill 短名 |
| 不新增 commands | 通过:未新增 `commands/` 或 `.claude/commands/` |

## 回归保护

- 未修改 `agents/*.md`。
- 未修改 `engine/core`。
- 未修改 schema。
- 未修改 v3.2 fireworks vendor。
- 未改变 v3.3 CR 14 段结构。
- 未改变 v3.4 cards 派生协议。
- 未改变 v3.5 Claude Code 真 Task dispatch 文本,只新增 fallback 声明与 lint R7。

## 已知边界

- `install.sh` 是 POSIX/类 Unix 路径。在当前 Windows Git Bash 环境中,严格真 symlink 需要系统授予创建符号链接权限;本机未授予,因此 strict symlink 实测失败。Windows 上已通过 `install.ps1` junction 路径覆盖同等安装目标。
- Cursor/Copilot 的 manifest 是自动发现入口;Cursor 本机目录存在,但没有通用 CLI 可直接触发 manifest 加载,本轮以 manifest 路径/版本/skills/agents 字段校验为准。
