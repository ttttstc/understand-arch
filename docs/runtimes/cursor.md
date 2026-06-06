# understand-arch on Cursor

## Install

Cursor can read the plugin manifest:

```text
.cursor-plugin/plugin.json
```

For symlink installation:

```bash
curl -fsSL https://raw.githubusercontent.com/ttttstc/understand-arch/main/install.sh | bash -s codex
```

The `codex` profile links skills into `~/.agents/skills/`, which is useful for
runtimes that share that skills root. If Cursor is opened directly on this
repository, it can also discover the `.cursor-plugin` manifest.

## Manifest fields

The Cursor manifest points to the repository's flat layout:

```json
{
  "skills": "./skills/",
  "agents": "./agents/"
}
```

There is no intermediate plugin directory.

## How to invoke

Ask Cursor to use the skill:

```text
Use arch-onboard to scan this repository and generate understand-arch artifacts.
```

For diagrams:

```text
Use arch-diagram to produce an architecture SVG for the current project.
```

## Runtime fallback

If Cursor does not expose a subagent tool compatible with Claude Code's `Task`,
semantic phases may run inline with the runtime fallback marker. Deterministic
tools and generated file paths remain unchanged.

## Outputs

```text
.understand-arch/{project}/
```

Use `wiki/ARCHITECTURE.md` as the main human-readable result.

