# understand-arch on openclaw

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/ttttstc/understand-arch/main/install.sh | bash -s openclaw
```

Local checkout:

```bash
git clone https://github.com/ttttstc/understand-arch.git
cd understand-arch
./install.sh openclaw
```

openclaw uses the folder-link style. The installer links:

```text
~/.openclaw/skills/understand-arch -> ~/.understand-arch/repo/skills
```

## How to invoke

Ask for the skill explicitly:

```text
Use understand-arch arch-onboard on the current workspace.
```

For review:

```text
Use understand-arch arch-audit and report whether the architecture baseline is stale.
```

## Runtime fallback

openclaw may not show nested subagent windows. When a semantic phase cannot use a
Task-like tool, understand-arch runs the phase inline and marks the response:

```text
[runtime-fallback: inline subagent <name>]
```

This affects execution visibility, not the artifact contract.

## Outputs

All generated artifacts remain under:

```text
.understand-arch/{project}/
```

The project root is not modified except for the `.understand-arch/` workspace.

## Maintenance

```bash
./install.sh --update
./install.sh --uninstall openclaw
```

