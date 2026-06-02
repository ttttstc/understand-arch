# understand-arch

> A Claude Code plugin for senior architects. Maintain a trustworthy, evidence-backed architecture knowledge base for any project — single-repo or multi-repo.

[中文](./README.zh.md)

---

## What it is

`understand-arch` turns your codebase into a living architecture knowledge base you can trust:

- **Knowledge graph** — every component, interface, data model, deployment and business capability is a node, kept in sync with your code (every inference is backed by code evidence under the hood)
- **Architecture document** — a single readable `ARCHITECTURE.md` whitepaper (plus 14 chapter slices) that reads like a standard architecture tech doc, not a tool report
- **Design documents** — one-file `CR.md` per change request (14 RFC-style sections), generated from a PRD + the current architecture
- **Decisions** — append-only ADR ledger
- **Rules — two layers**:
  - **Norms** — your team conventions, compliance lines, dependency allow-lists (you author, authoritative)
  - **Project constraints** — domain invariants, dependency rules, contracts and risk points mined by AI from the code, plus implicit knowledge grilled out of senior engineers via `/arch-interview`. Each entry carries a 5-level evidence rating (confirmed / observed / inferred / uncertain / conflicted); AI-mined entries can only land as `proposed` and **only flow into the wiki and design review once a human confirms them**
- **Dashboard** — an interactive view of the code graph and architecture layer

All artifacts live inside one directory in your project root: `.understand-arch/`. Nothing else is touched.

## What it can do

**Onboard a project (single or multi-repo)**
> "Help me understand this codebase" → `/arch-onboard`

Scans every registered repo, builds a per-repo knowledge graph plus a cross-repo view. Infers architecture style, component responsibilities, tech-stack rationale, business capabilities, quality attributes, risks and technical debt. Produces a full `ARCHITECTURE.md` whitepaper so any team member can ramp up.

**Read the architecture as one document**
> open `.understand-arch/{project}/wiki/ARCHITECTURE.md`

A top-to-bottom architecture technical document: project overview, components, interfaces, data models, capabilities, quality, risks & debt, deployment, flows, decisions, changes, rules. Written in plain language, no tool jargon, no reading tutorials — just the project's architecture.

**Design a change against the current architecture**
> "Here's the PRD, design it" → `/arch-design`

Reads a PRD + the current architecture → finds the affected nodes (cross-repo aware, split into a tight core set and an adjacent review set) → drafts a single `CR.md` with 14 sections (background, impact, solution, alternatives, NFR, risks, change list, rollout, rollback, testing, traceability, …). A senior-architect agent reviews it before it's marked ready.

**Check whether the baseline still matches reality**
> "Is the architecture baseline still trustworthy?" → `/arch-audit`

Compares stored fingerprints with the current state. Flags drift between the model and reality, broken traceability, and degraded gates. Suggests a refresh if needed.

**Re-render or refresh the document**
> "Update the wiki" / "Give me a CTO-level overview" → `/arch-wiki`

Re-renders `ARCHITECTURE.md` and the 14 slices from the latest graph + architecture layer. Audience modes: `cto`, `newcomer`, `pm`, `architect`. A senior-architect agent reviews quality (full review for first run / cto / architect; lite review for routine refresh).

**Visualize the architecture**
> "Show me the dashboard" → `/arch-dashboard`

Launches an interactive dashboard: code graph, capability map, risk view, multi-repo topology, and a step-through architecture tour.

**Draw 4+1 / C4 diagrams**
> `/arch-diagram`

Generates architecture diagrams in four formats:

| format | Output | Use case |
|---|---|---|
| `mermaid` | `wiki/14-diagrams.md` | Default path, unchanged from v3.1 |
| `svg` | `wiki/assets/diagrams/{type}-{style}.svg` | Review docs and design decks |
| `png` | `wiki/assets/diagrams/{type}-{style}.png` | Confluence, Feishu, DingTalk, slides |
| `plantuml` | `wiki/assets/diagrams/{type}.puml` | IDE-side PlantUML rendering |

Recommended profiles:

| profile | Recommended diagrams | Style |
|---|---|---|
| `web` | `architecture`, `flow`, `sequence` | `6` |
| `middleware` | `architecture`, `data-flow`, `sequence` | `2` |
| `pipeline` | `data-flow`, `flowchart`, `timeline` | `3` |
| `agent` | `agent`, `memory`, `sequence` | `5` |
| `multi-repo` | `architecture`, `network-topology`, `c4` | `1` |

Examples:

```bash
/arch-diagram c4
/arch-diagram sequence --format=svg --style=6
/arch-diagram architecture --format=png --profile=web
/arch-diagram state-machine --format=plantuml
```

**Grill the implicit knowledge out of senior engineers**
> "Let's talk through the parts I can't read off the code" → `/arch-interview`

Many critical constraints never make it into code comments — they only live in senior engineers' heads: why this module must run single-threaded, why that field name is frozen, which historical landmine that dependency chain exists to avoid. `/arch-interview` first surfaces the suspicious implementations the onboard-phase AI scouted out (odd implementations, custom logic, invalid references, swallowed exceptions, …), then walks you through them **one question at a time** by scenario (domain / dependency / history / customization / risk / ops / testing), with a recommended answer attached to each. Confirm, correct, or skip. Answers are sedimented as `proposed` constraints and merged into the constraint layer after you confirm them.

## Installation

In Claude Code, run:

```text
/plugin marketplace add https://github.com/ttttstc/understand-arch
/plugin install understand-arch@understand-arch
/reload-plugins
```

The plugin manifest stays minimal, and Claude Code discovers slash commands directly from `skills/*/SKILL.md`. After `/reload-plugins`, type `/arch-` at any prompt to verify the seven commands appear:

- `/arch-onboard`
- `/arch-design`
- `/arch-audit`
- `/arch-wiki`
- `/arch-diagram`
- `/arch-dashboard`
- `/arch-interview`

### Don't see the commands?

1. **Did you run `/reload-plugins`?** Without it Claude Code won't pick up newly installed plugin skills.
2. **Is the plugin installed?** Run `/plugin list` and check for `understand-arch`.
3. **Slash name format**: `/arch-onboard` (dash), not `/arch:onboard` (colon syntax isn't supported).
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
1. Scan your repository (multi-repo? it discovers sibling repos and asks before registering)
2. Build the knowledge graph
3. Infer the architecture layer (style, components, capabilities, quality, risks, debt)
4. Render `ARCHITECTURE.md` + 14 slices
5. Tell you what it couldn't determine (known unknowns), so you can decide what to refine

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
└── .understand-arch/                 ← the only directory we add
    └── {project}/
        ├── specs/
        │   ├── repos.json            ← registered repos
        │   ├── repos/{id}/knowledge-graph.json   ← per-repo code graph
        │   └── arch-layer.json       ← architecture layer (style/capabilities/risks/…)
        ├── wiki/
        │   ├── ARCHITECTURE.md       ← the full readable whitepaper
        │   └── 01..14-*.md           ← chapter slices
        ├── rules/                    ← norm layer (you edit)
        │   └── constraints/          ← project constraints (AI-mined + interview, human-confirmed)
        ├── decisions/                ← ADR ledger (append-only)
        ├── change-requests/          ← CR.md files
        ├── state.yaml                ← workflow state
        └── intermediate/             ← scanner scratch (gitignored)
```

The auto-generated `.gitignore` keeps `intermediate/` and metrics out of git. Everything else is meant to be versioned alongside your code.

## License

MIT — see [LICENSE](./LICENSE).

Architecture-scan engine forked from [Understand-Anything](https://github.com/Lum1104/Understand-Anything) (MIT). See [engine/NOTICE](./engine/NOTICE).
