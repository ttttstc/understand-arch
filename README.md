# understand-arch

> A workflow skill suite for software architects — Claude Code plugin.

[中文](./README.zh.md) | [Spec](./docs/spec-v1.0.md) | [Contributing](./CONTRIBUTING.md)

**Currently supports: Claude Code.**

---

## What it does

Productizes 4 daily architect activities:

### Onboard an unfamiliar system

```
You say:  "帮我接手 ./order-system" / "take over this system"
You get:
  - 5 structured YAML evidence files (repos / dependencies / risks / decisions / overview)
  - 6-page Wiki (start from index, target 60–90 min to understand)
  - C4 current-state architecture diagrams (Mermaid + optional SVG/PNG)
```

### Audit current state

```
You say:  "审视一下 order-system" / "audit this system"
You get:
  - Risk ledger sorted by severity
  - Technical debt list with blast radius
  - Refactoring roadmap (short / mid / long term)
```

### Design from PRD

```
You say:  "根据 ./prd.md 设计架构" / "design architecture from this PRD"
You get:
  - 2–3 candidate options with tradeoff matrix (impact / dependencies / data model / rollback)
  - ADR (architecture decision record)
  - Full RFC design document
  - 17-chapter SE implementation plan (dev-actionable)
  - Target architecture diagrams
```

**If the PRD is ambiguous**, the workflow automatically halts and produces `PM问题清单.md` for you to confirm with PM before continuing.

### Prepare presentation

```
You say:  "给 CTO 出一份汇报" / "prepare a brief for CTO"
You get:
  - Audience-tailored deliverable (HTML / PPT / markdown)
  - Management summary (≤1 page, decisions linked to evidence)
```

---

## Quick start

### Install

```bash
/plugin marketplace add ttttstc/understand-arch
/plugin install understand-arch
```

### Use

**Natural language** (recommended):

| You say | Mode |
|---|---|
| 接手 / 摸熟 / 全景 / take over / overview | `onboard` |
| 架构审计 / 体检 / 审视架构 / audit | `audit` |
| 根据 PRD 设计 / 出 RFC / 出实施方案 / design | `design` |
| 准备汇报 / 给 CTO 一份 / brief | `brief` |

**Slash commands**:

```bash
/arch                          # Interactive mode picker
/arch:onboard ./my-system
/arch:audit
/arch:design --prd=./prd.md
/arch:brief --audience=cto
```

**Single capabilities** (skip the full workflow):

```bash
/arch-adr                      # Write a single ADR
/arch-diagram                  # Render one diagram
/arch-analyze --depth=manifest # Survey one repo
/arch-diff-judge               # Impact analysis only
/arch-options                  # Evaluate candidate options
/arch-review                   # Review a design doc / PR drift
/arch-radar                    # Industry benchmark / tech selection
```

---

## Where outputs live

Default: `arch/{project-name}/` under Claude Code's working directory.

```
arch/my-system/
├── evidence/         5 structured YAML files (fact source)
├── wiki/             6 human-readable pages
├── diagrams/         architecture diagrams
├── adr/              decision records (append-only, never modified)
├── design-docs/      one folder per design iteration
├── audits/           one folder per audit
└── briefs/           one folder per presentation
```

Configurable via `output_path`.

---

## Enterprise knowledge base (optional, recommended)

If your team has constraints (banned patterns / compliance redlines / naming conventions / network boundaries), place them under `~/.understand-arch/kb/`:

```
~/.understand-arch/kb/
├── banned-patterns.yaml
├── compliance-redlines.yaml
├── network-boundaries.yaml
├── naming-conventions.yaml
└── tech-radar.yaml
```

The workflow auto-loads them and flags any violation when generating designs. **Skip configuration and it still works** (graceful degradation).

---

## Diagram rendering upgrade (optional)

Default: Mermaid (text, rendered natively by GitHub / GitLab / VSCode).

For publication-ready SVG/PNG, install [`fireworks-tech-graph`](https://github.com/yizhiyanhua-ai/fireworks-tech-graph):

```bash
/plugin install fireworks-tech-graph
```

The workflow will automatically use it. **Not installed → falls back to Mermaid.**

---

## Boundaries

**Only produces architecture description artifacts**: `*.md` / `*.yaml` / `*.mmd` / `*.svg+png`.

**Does NOT generate**: business source code / IaC scripts / DDL migration scripts / CI pipeline templates / service scaffolds. Architecture is cognition; implementation is for dedicated code-generation tools.

---

## Docs

- [Full spec](./docs/spec-v1.0.md)
- [Design diagnostic record](./docs/office-hours-2026-05-24.md)
- [Contributing](./CONTRIBUTING.md)

---

## Status

v0.2.0 (full skeleton). All 10 skill skeletons written; full implementation pending. See [CONTRIBUTING.md](./CONTRIBUTING.md) for build order.

---

## License

MIT
