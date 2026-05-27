# understand-arch

`understand-arch` is a Claude Code plugin for senior architects. v2.0 is a breaking redesign around a project-local architecture workspace:

```text
.understand-arch/{project}/
├── specs/
│   ├── repos.yaml
│   ├── repos/{repo_id}/knowledge-graph.json
│   └── cross-repo.json
├── wiki/
├── rules/
├── decisions/
├── change-requests/
└── state.yaml
```

The graph is the only fact source. Wiki, CR and ADR content must trace back to graph nodes, rules, CR paths or ADR paths.

## v2.0 Commands

| Command | Purpose |
|---|---|
| `/arch-onboard` | Initialize or refresh a single-repo or multi-repo workspace. |
| `/arch-design` | Create a single-file `CR.md` design document with YAML frontmatter and 14 RFC-style sections. |
| `/arch-audit` | Check freshness, degraded state, traceability and graph/wiki consistency. |
| `/arch-wiki` | Render `wiki/README.md` plus 14 human-readable pages. |
| `/arch-diagram` | v2.0 placeholder for 4+1/C4 views; real image generation is reserved for v2.1. |

Internal skills: `arch-analyze`, `arch-frame`, `arch-adr`, `arch-review`.

## What Changed From v1

- `arch/{project}` is gone for user workspaces; the only user-project entry is `.understand-arch/`.
- Five specs YAML files are replaced by per-repo `knowledge-graph.json` plus `cross-repo.json`.
- `generated/` is replaced by `wiki/`.
- Global `~/.understand-arch/kb/` is replaced by project-local `rules/*.md`.
- CR assets are unified into one `CR.md`.
- The public surface is 5 user entries + 4 internal skills.

## Development

Run the structural verifier:

```text
npm run verify
```

The scanner engine is forked from `D:\AI\workspace\understand-anything-upstream` and extended with v2 multi-repo graph adapters. The implementation contract is in [`docs/spec-v2.0.md`](./docs/spec-v2.0.md).
