# understand-arch runtime guide

understand-arch can run in Claude Code and in other agentic runtimes that can load
`skills/*/SKILL.md`. The cross-runtime distribution follows the symlink installer
pattern used by Understand-Anything: one repository checkout, one shared `skills/`
directory, and runtime-specific symlinks.

## Quick install

```bash
curl -fsSL https://raw.githubusercontent.com/ttttstc/understand-arch/main/install.sh | bash -s codex
```

Use another platform id when needed:

```bash
./install.sh opencode
./install.sh openclaw
./install.sh vscode
```

Windows users can use PowerShell:

```powershell
iwr -useb https://raw.githubusercontent.com/ttttstc/understand-arch/main/install.ps1 | iex
```

## Supported platforms

| Platform id | Target skills directory | Link style |
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

## Runtime fallback

Claude Code supports visible subagent execution through the `Task` tool. Some
other runtimes do not expose an equivalent tool. In those runtimes, the SKILL
instructions allow a controlled fallback:

- the response starts with `[runtime-fallback: inline subagent <name>]`
- semantic phases run in the main conversation
- parallel dispatch instructions are treated as sequential
- deterministic Node tools, JSON merge rules, and output paths stay unchanged

This is a portability fallback. Claude Code should continue to use the true
`Task` path and visible subagent windows.

## Runtime-specific guides

- [Codex CLI](./codex.md)
- [opencode](./opencode.md)
- [openclaw](./openclaw.md)
- [Cursor](./cursor.md)
- [VS Code Copilot](./copilot.md)

## Sync policy

The cross-runtime distribution strategy is forked from
[Understand-Anything](https://github.com/Lum1104/Understand-Anything). The
`install.sh` platform table and manifest conventions should be reviewed against
the upstream installer when adding or changing runtime support.

