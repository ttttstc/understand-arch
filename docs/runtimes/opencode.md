# understand-arch on opencode

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/ttttstc/understand-arch/main/install.sh | bash -s opencode
```

Local checkout:

```bash
git clone https://github.com/ttttstc/understand-arch.git
cd understand-arch
./install.sh opencode
```

The installer creates per-skill links under `~/.agents/skills/`, matching the
layout shared by several agentic runtimes.

## How to invoke

Ask opencode to use an understand-arch skill:

```text
Use arch-onboard to understand this repository and write the architecture docs.
```

For design work:

```text
Use arch-design with this change request and produce CR-OPTION.md first.
```

## Expected outputs

The output directory is unchanged:

```text
.understand-arch/{project}/
```

Important files:

- `specs/repos/{repo}/knowledge-graph.json`
- `specs/arch-layer.json`
- `cards/agent-cards.json`
- `wiki/ARCHITECTURE.md`
- `agent-context/AGENTS.md`
- `agent-context/CLAUDE.md`

## Runtime fallback

If opencode does not provide a subagent tool compatible with Claude Code's
`Task`, understand-arch runs semantic phases inline and declares that fallback
at the top of the response. Parallel phase instructions become sequential.

Quality gates and deterministic validators still run normally.

## Maintenance

```bash
./install.sh --update
./install.sh --uninstall opencode
```

