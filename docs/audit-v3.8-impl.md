# understand-arch v3.8 实现验收报告

> 日期: 2026-06-06
> 分支: `feat/v3.8-impl`
> 版本: `3.8.0-rc1`
> 主题: 命令空间收敛 + 安装识别修复

## 1. 确定性验收

| 检查项 | 结果 | 证据 |
|---|---:|---|
| `skills/` 只剩 8 个一级命令 | 通过 | `arch-audit, arch-dashboard, arch-design, arch-diagram, arch-improve, arch-interview, arch-onboard, arch-wiki` |
| `internal/playbooks/analyze/` 保留 analyze 子树 | 通过 | 9 个脚本/程序文件 + `frameworks/ languages/ locales/` + `playbook.md` |
| `agents/` 数量 | 通过 | 26 个 `.md`;新增 `arch-frame.md`, `arch-adr.md`, `arch-suspicious-recheck.md` |
| 旧内部 skill 路径引用清扫 | 通过 | 旧 `skills/arch-*` 内部路径 literal 仅剩 `docs/spec-v3.8.md` |
| 公开 skills 无旧内部命令引用 | 通过 | 公开 `skills/` 中无 analyze、enrich、review 旧入口引用 |
| moved `.mjs` 语法 | 通过 | `node --check internal/playbooks/analyze/*.mjs` exit 0 |

## 2. 集成验收

| 命令 | Exit | 摘要 |
|---|---:|---|
| `node engine/arch/dispatch-lint.mjs --strict` | 0 | `dispatch-lint ok (10 skills checked, 10 reference files checked, strict=true)` |
| `pnpm vitest run --config engine/arch/vitest.config.mjs engine/arch/__tests__/dispatch-lint.test.mjs engine/arch/__tests__/build-fingerprints.test.mjs` | 0 | 2 files / 10 tests passed |
| `npm run verify` | 0 | arch 14 files / 41 tests, core 32 files / 664 tests, dashboard 6 files / 42 tests; core/dashboard builds passed |
| `node scripts/install-claude-plugin.mjs --ref worktree` | 0 | installed `understand-arch@understand-arch` version `3.8.0-rc1` |
| `node scripts/doctor-plugin-install.mjs --strict` | 0 | skill discovery = 8; Claude runtime status = enabled |

## 3. 安装识别实测

安装缓存:

```text
C:\Users\泥巴猪\.claude\plugins\cache\understand-arch\understand-arch\3.8.0-rc1
```

`claude plugin list` 关键输出:

```text
> understand-arch@understand-arch
  Version: 3.8.0-rc1
  Scope: user
  Status: √ enabled
```

安装后 `skills/` 实际目录:

```text
arch-audit
arch-dashboard
arch-design
arch-diagram
arch-improve
arch-interview
arch-onboard
arch-wiki
```

内部命令验证:

```text
public arch-analyze skill directory: False
internal/playbooks/analyze/playbook.md: True
agents/arch-suspicious-recheck.md: True
```

说明:Claude CLI 当前没有非交互式 slash completion 列表命令。本报告用 runtime enabled 状态、doctor strict 的 skill discovery、以及安装缓存中的 8 个 `SKILL.md` 目录作为文本证据。交互式 `/understand-arch:` 补全仍建议在 Claude Code UI 中复核。

## 4. 实现说明

- `arch-analyze` 和 `arch-enrich` 已从用户级 `skills/` 分流到 `internal/playbooks/`。
- `arch-onboard` 改为 Read playbook 并执行 Phase 0-13;playbook 内的 LLM phase 仍按 v3.5 使用 Task subagent。
- `arch-frame` 和 `arch-adr` 转为真实 subagent。
- 新增 `arch-suspicious-recheck` subagent,修复 audit 里悬空引用。
- `.claude-plugin/plugin.json` 显式声明 `skills: "./skills/"` 和 26 个 agent 文件路径。Claude manifest 不接受 `agents: "./agents/"` 目录形式,实测文件数组形式可加载。
- `dispatch-lint` 新增 R8:所有 `subagent_type` 必须能解析到 `agents/<name>.md`。
- `doctor-plugin-install` 新增 skill discovery:严格模式要求 8 个 skill 且 frontmatter `name` 与目录一致。

## 5. 回归结论

v3.8 收敛完成。确定性检查、安装诊断、lint、单测、全量 verify 均通过。公开命令空间现在只暴露 8 个一级命令,内部 playbook 与 subagent 不再污染 slash command 列表。
