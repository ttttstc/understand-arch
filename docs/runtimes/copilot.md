# understand-arch on VS Code Copilot

## Install

VS Code Copilot can read:

```text
.copilot-plugin/plugin.json
```

For symlink installation:

```bash
curl -fsSL https://raw.githubusercontent.com/ttttstc/understand-arch/main/install.sh | bash -s vscode
```

The installer creates per-skill links under:

```text
~/.copilot/skills/
```

## Local checkout

```bash
git clone https://github.com/ttttstc/understand-arch.git
cd understand-arch
./install.sh vscode
```

## How to invoke

Ask Copilot Chat for the skill:

```text
Use arch-onboard to understand this workspace and generate the architecture wiki.
```

For design:

```text
Use arch-design for this PRD and generate CR-OPTION.md before CR.md.
```

## Runtime fallback

Copilot may not provide Claude Code-style visible subagent windows. In that case,
understand-arch uses the runtime fallback path, runs semantic subagent logic in
the main conversation, and marks the response with:

```text
[runtime-fallback: inline subagent <name>]
```

## Outputs

Generated architecture artifacts stay under:

```text
.understand-arch/{project}/
```

