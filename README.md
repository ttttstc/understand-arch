# understand-arch

> A Claude Code architecture assistant that reads real code, keeps architecture knowledge grounded in evidence, and turns it into documents, reviews, diagrams, and a dashboard.

[中文](./README.zh.md)

---

## What It Is

`understand-arch` helps a team answer a simple question:

> "What is this system, how is it built, and what should I be careful about before changing it?"

It is not a standalone autonomous agent runtime. Claude Code carries the conversation, tool loop, and user interaction. `understand-arch` provides the architecture workflow on top of that loop:

- deterministic code scanning from the Understand-Anything engine
- Claude Code skills and subagents for architecture reasoning
- evidence-backed architecture artifacts stored in your repository
- review gates so generated docs and designs are checked before you trust them
- diagrams and a dashboard for navigation and discussion

The knowledge base learns from everyday commits, CRs, and ADRs instead of staying as a one-time onboarding snapshot.
It also extracts structured technical facts such as API parameters, database fields, and external dependency configuration so design work can use concrete code evidence.

In plain terms: it is a practical architecture assistant for onboarding, design review, architecture documentation, and change planning.

## What It Can Do

### Understand A Codebase

Run:

```text
/arch-onboard
```

It scans one repo or several related repos, builds a knowledge graph, and asks Claude Code subagents to infer the architecture layer: architecture style, components, capabilities, interfaces, quality attributes, risks, technical debt, and known unknowns.

The result is written under `.understand-arch/{project}/`.

### Produce A Readable Architecture Document

Open:

```text
.understand-arch/{project}/wiki/ARCHITECTURE.md
```

This is the main long-form architecture document. It is meant to be read by a new architect, not just by the tool that generated it. It explains the project, major components, flows, interfaces, data, risks, deployment, decisions, and constraints.

The same content is also split into 14 chapter files for easier review.

### Design A Change

Run:

```text
/arch-design
```

Give it a PRD or change request. It first clarifies the request against the current architecture, rules, constraints, ADRs, and project language. Then it writes `CR-OPTION.md`: three readable candidate designs for a human to choose from.

Default candidates:

- Option A: minimal change
- Option B: architecture improvement
- Option C: long-term evolution

After you choose an option, or explicitly ask it to continue with the recommendation, it drafts a `CR.md` with 14 RFC-style sections:

- background and goal
- affected components
- proposed solution
- alternatives
- non-functional requirements
- risks and technical debt
- rollout, rollback, testing, and traceability

A senior-review subagent checks the design before it is treated as ready.

### Find Architecture Improvement Opportunities

Run:

```text
/arch-improve
```

It reads the current graph, architecture layer, constraints, ADRs, historical CRs, suspicious findings, and coding conventions, then drafts an improvement RFC candidate. It does not change code or create a CR automatically.

### Audit Architecture Drift

Run:

```text
/arch-audit
```

It compares the saved architecture baseline with the current repository state. Use it when you want to know whether the docs still match the code, whether evidence links are stale, or whether the architecture layer should be refreshed.

### Refresh Or Reframe The Wiki

Run:

```text
/arch-wiki
```

It regenerates `ARCHITECTURE.md` and the 14 chapter slices from the latest graph and architecture layer.

Audience modes:

```text
/arch-wiki --audience=cto
/arch-wiki --audience=newcomer
/arch-wiki --audience=pm
/arch-wiki --audience=architect
```

### Draw Architecture Diagrams

Run:

```text
/arch-diagram
```

The default path now uses the richer SVG renderer. Mermaid is still available as a compatibility fallback.

Supported formats:

| Format | Output | Best For |
|---|---|---|
| `svg` | `wiki/assets/diagrams/{type}-{style}.svg` | Review docs, architecture decks, wiki pages |
| `png` | `wiki/assets/diagrams/{type}-{style}.png` | Feishu, Confluence, DingTalk, slides |
| `plantuml` | `wiki/assets/diagrams/{type}.puml` | Teams that already use PlantUML |
| `mermaid` | `wiki/14-diagrams.md` | Compatibility and fallback |

You usually do not need to remember style numbers. `/arch-diagram` guides you through a small style menu and recommends a style based on the project type.

Recommended profiles:

| Profile | Good Diagrams | Recommended Style |
|---|---|---|
| `web` | `architecture`, `flow`, `sequence` | `6` |
| `middleware` | `architecture`, `data-flow`, `sequence` | `2` |
| `pipeline` | `data-flow`, `flowchart`, `timeline` | `3` |
| `agent` | `agent`, `memory`, `sequence` | `5` |
| `multi-repo` | `architecture`, `network-topology`, `c4` | `1` |

Examples:

```text
/arch-diagram
/arch-diagram architecture --format=png
/arch-diagram sequence --format=svg
/arch-diagram c4 --format=mermaid
```

### Explore The System Visually

Run:

```text
/arch-dashboard
```

It opens an interactive dashboard for the code graph, capability map, risk view, multi-repo topology, and architecture tour.

### Capture Hidden Team Knowledge

Run:

```text
/arch-interview
```

Some important constraints never appear in code: why a module must stay single-threaded, why a field name is frozen, why a dependency looks strange, or which incident shaped a design choice.

`/arch-interview` turns those questions into a guided interview. You confirm, correct, or skip each proposed constraint. Confirmed constraints can then flow into the architecture wiki and design review.

## Installation

In Claude Code:

```text
/plugin marketplace add https://github.com/ttttstc/understand-arch
/plugin install understand-arch@understand-arch
/reload-plugins
```

After reloading, type:

```text
/arch-
```

You should see:

- `/arch-onboard`
- `/arch-design`
- `/arch-audit`
- `/arch-wiki`
- `/arch-diagram`
- `/arch-dashboard`
- `/arch-interview`
- `/arch-improve`

### If Commands Do Not Appear

1. Run `/reload-plugins`.
2. Run `/plugin list` and confirm `understand-arch` is installed.
3. Use dash-style command names such as `/arch-onboard`, not `/arch:onboard`.
4. Restart Claude Code and run `/reload-plugins` again.

## First Run

From the project you want to understand:

```text
/arch-onboard
```

The first run will:

1. scan the repository
2. detect related sibling repos when needed
3. build the knowledge graph
4. infer the architecture layer
5. render the wiki
6. report what it could not determine

After that, the other commands work against the same `.understand-arch/` workspace.

Natural language works too:

- "Help me understand this codebase" -> `/arch-onboard`
- "Design this PRD" -> `/arch-design`
- "Is the architecture baseline still trustworthy?" -> `/arch-audit`
- "Give me a CTO-level overview" -> `/arch-wiki --audience=cto`

## What Gets Written

Only one directory is added to your project:

```text
your-project/
└── .understand-arch/
    └── {project}/
        ├── specs/
        │   ├── repos.json
        │   ├── repos/{id}/knowledge-graph.json
        │   └── arch-layer.json
        ├── wiki/
        │   ├── ARCHITECTURE.md
        │   ├── 01..14-*.md
        │   └── assets/diagrams/
        ├── rules/
        │   └── constraints/
        ├── decisions/
        ├── change-requests/
        ├── improvements/
        ├── state.yaml
        └── intermediate/
```

`intermediate/` is scratch space and is gitignored. The architecture docs, rules, decisions, and change requests are meant to be versioned with the code.

## Optional Git Hook Refresh

By default, the architecture baseline refreshes when you run `/arch-onboard` or `/arch-audit`.

To enable refresh around git commits:

```text
/arch-onboard --enable-hooks
```

You can disable it later by setting `hooks_enabled: false` in the project state file.

## License

MIT — see [LICENSE](./LICENSE).

Architecture scanning is forked from [Understand-Anything](https://github.com/Lum1104/Understand-Anything) (MIT). See [engine/NOTICE](./engine/NOTICE).
