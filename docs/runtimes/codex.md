# understand-arch on Codex CLI

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/ttttstc/understand-arch/main/install.sh | bash -s codex
```

Local checkout:

```bash
git clone https://github.com/ttttstc/understand-arch.git
cd understand-arch
./install.sh codex
```

The installer creates per-skill links under `~/.agents/skills/`.

## How to invoke

In Codex, ask for the capability by name:

```text
Run understand-arch onboard for the current repository.
```

You can also name the specific skill:

```text
Use arch-onboard to scan this project and generate the architecture wiki.
```

Common skills:

- `arch-onboard`
- `arch-design`
- `arch-audit`
- `arch-wiki`
- `arch-diagram`
- `arch-dashboard`
- `arch-interview`
- `arch-improve`

## Behavior differences

Codex may not expose Claude Code's `Task` tool. If so, semantic subagent phases
run through the runtime fallback path and begin with:

```text
[runtime-fallback: inline subagent <name>]
```

The architecture outputs stay in the same location:

```text
.understand-arch/{project}/
```

Deterministic scanners, JSON writers, wiki rendering, and diagram dispatch keep
the same file layout as Claude Code.

## Update and uninstall

```bash
./install.sh --update
./install.sh --uninstall codex
```

