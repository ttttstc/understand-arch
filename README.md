# understand-arch

> A Claude Code plugin for senior architects. Maintain an evidence-backed architecture knowledge base for any project — single-repo or multi-repo.

[中文](./README.zh.md)

---

## What it is

`understand-arch` turns your codebase into a living architecture knowledge base you can trust:

- **Knowledge graph** — every component, interface, data model, deployment and business capability is a node with evidence, kept in sync with your code
- **Wiki** — 14 human-readable pages that always trace back to the graph (no fabrication)
- **Design documents** — one-file `CR.md` per change request (14 RFC-style sections), generated from PRD + current graph
- **Decisions** — append-only ADR ledger
- **Rules** — your team's architecture conventions, naturally enforced in design reviews

All artifacts live inside one directory in your project root: `.understand-arch/`. Nothing else is touched.

## What it can do

**Onboard a project (single or multi-repo)**
> "Help me understand this codebase" → `/arch-onboard`

Scans every registered repo, builds a per-repo `knowledge-graph.json` plus a cross-repo graph. Detects components, interfaces, data models, deployments and business capabilities with evidence. Produces 14 wiki pages so any team member can ramp up.

**Design a change against the current architecture**
> "Here's the PRD, design it" → `/arch-design`

Reads PRD + current graph → finds the affected nodes (cross-repo aware) → drafts a single `CR.md` with 14 sections (background, impact, solution, alternatives, NFR, risks, change list, rollout plan, rollback, testing, traceability, …). Reviewed by a senior-architect agent before it's marked ready.

**Check whether the baseline still matches reality**
> "Is the architecture baseline still trustworthy?" → `/arch-audit`

Compares stored fingerprints with the current commit. Flags drift between graph and reality, broken traceability, and degraded acceptance gates. Suggests refresh if needed.

**Re-render or refresh the wiki**
> "Update the wiki" / "Give me a CTO-level overview" → `/arch-wiki`

Re-renders the 14 pages from the latest graph. Supports audience modes: `cto`, `newcomer`, `pm`, `architect`. Senior-architect agent reviews wiki quality (full review for first-time/cto/architect, lite review for routine refresh).

**Draw 4+1 / C4 architecture diagrams**
> `/arch-diagram`

v2.0 ships a placeholder; image generation is planned for v2.1. The wiki already includes Mermaid sources you can render today.

## Installation

In Claude Code, run:

```text
/plugin marketplace add https://github.com/ttttstc/understand-arch
/plugin install understand-arch@understand-arch
/reload-plugins
```

That's it. After `/reload-plugins`, type `/arch-` at any prompt to verify the five commands appear:

- `/arch-onboard`
- `/arch-design`
- `/arch-audit`
- `/arch-wiki`
- `/arch-diagram`

### Don't see the commands?

1. **Did you run `/reload-plugins`?** Without it Claude Code won't pick up new skills.
2. **Is the plugin installed?** Run `/plugin list` and check for `understand-arch`.
3. **Command format**: `/arch-onboard` (dash), not `/arch:onboard` (colon syntax isn't supported).
4. **Force reload**: restart Claude Code, then `/reload-plugins` again.

### Optional: enable git-commit auto-refresh

By default, the baseline is refreshed only when you run `/arch-onboard` or `/arch-audit`. If you want it to react to every git commit:

```text
/arch-onboard --enable-hooks
```

This flips `hooks_enabled: true` in your project's state file. Disable any time by setting it back to `false`.

## How to start

```text
/arch-onboard
```

First run will:
1. Scan your repository (multi-repo? it will discover sibling repos and ask before registering)
2. Build the knowledge graph
3. Render the 14-page wiki
4. Tell you what it couldn't determine (known unknowns), so you can decide what to refine

Subsequent commands work against the same workspace. Natural language also routes:

- "Help me understand this codebase" → `/arch-onboard`
- "Design this PRD" → `/arch-design`
- "Is the baseline still trustworthy?" → `/arch-audit`
- "Brief for the CTO" → `/arch-wiki --audience=cto`

## What you'll see on your filesystem

```
your-project/
├── src/
├── package.json
├── …
└── .understand-arch/           ← the only directory we add
    └── {project}/
        ├── specs/              ← knowledge graph (committable)
        ├── wiki/               ← 14 readable pages (committable)
        ├── rules/              ← your team conventions (you edit)
        ├── decisions/          ← ADR ledger (committable, append-only)
        ├── change-requests/    ← CR.md files (committable)
        ├── state.yaml          ← workflow state (committable)
        └── intermediate/       ← scanner scratch (gitignored)
```

The auto-generated `.gitignore` keeps `intermediate/` and metrics out of git. Everything else is meant to be versioned alongside your code.

## License

MIT — see [LICENSE](./LICENSE).

Architecture-scan engine forked from [Understand-Anything](https://github.com/Lum1104/Understand-Anything) (MIT). See [engine/NOTICE](./engine/NOTICE).
