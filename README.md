# understand-arch

> Evidence-driven workflow skill suite for senior software architects.
> **Governance-first. Brownfield-native. Description-only output.**

[中文](./README.zh.md) | [Spec](./docs/spec-v1.0.md) | [Contributing](./CONTRIBUTING.md)

**Status: v0.2.0 (full skeleton).** All 10 skill skeletons written + design spec complete. Full implementation pending — see [CONTRIBUTING.md](./CONTRIBUTING.md) for the build order.

---

## What it does

A Claude Code plugin with **9 atomic skills + 1 workflow orchestrator** that produces:

- **5+1 YAML evidence assets** — project overview, repo inventory, dependency graph, risk ledger, decision index; + org-scoped enterprise KB
- **6-page Wiki** — human navigation layer over the evidence
- **ADRs** — append-only architecture decision history
- **Design docs + 17-chapter SE implementation plans** — research-ready, dev-actionable
- **Diagrams** — Mermaid (default) + optional fireworks-tech-graph backend
- **Architecture review reports** — doc mode + code drift mode

**All outputs are descriptive.** No code generation, no IaC, no DDL, no scaffolds. Use Cline / aider / your IaC tool for implementation.

---

## 4 Workflow Modes

| Trigger phrases | Mode | Use case |
|---|---|---|
| 接手 / 摸熟 / 全景 / overview / 这是个什么系统 | `onboard` | Take over an unfamiliar system, full survey |
| 架构审计 / 体检 / 健康度 / 审视当前项目 / 审视架构 | `audit` | Health check + improvement roadmap |
| 根据 PRD 设计 / 出 RFC / 出实施方案 / 迁移方案 | `design` | Design from change request, with PRD HARD GATE |
| 准备汇报 / 给 CTO 一份 / 整理 PPT | `brief` | Audience-tailored deliverables |

Atomic skills can also be invoked directly: `/arch-adr`, `/arch-diagram`, `/arch-analyze --depth=manifest`, etc.

---

## How it differs from related tools

| Tool | Focus | How this complements |
|---|---|---|
| [Understand-Anything](https://github.com/Lum1104/Understand-Anything) (22.7k⭐) | visualization-first (passive understanding) | governance-first (active production) |
| [wshobson/agents](https://github.com/wshobson/agents) (35.8k⭐) | scattered role agents | unified workflow with state machine |
| aider / Cline | code generation | architecture decisions + records (no code gen) |

We **learn from these** (borrowed the 2-stage code analysis pattern, ADR format conventions, etc.) but **don't depend on them**. No required integrations.

---

## Quick start (when v1.0 ships)

```bash
# Install
/plugin marketplace add ttttstc/understand-arch
/plugin install understand-arch

# Interactive mode picker
/arch

# Or direct mode
/arch:onboard ./my-system
/arch:audit
/arch:design --prd=./prd.md
/arch:brief --audience=cto
```

---

## Status & Roadmap

| Version | What's in it |
|---|---|
| **v0.2.0 (now)** | **All 10 skill skeletons written** + complete design spec + `arch-library/` + `internal/` MANIFESTs + Skill Regression Suite scaffold |
| **v1.0 (target)** | All 9 skills fully implemented + `arch-library/` knowledge base seed + acceptance loop working + JSON schemas |
| **v1.1** | Skill Regression Suite + ADR `fitness_spec` + `arch-knowledge` Tool Wrapper skill + multi-model review |

See [docs/spec-v1.0.md](./docs/spec-v1.0.md) for the full specification.

---

## Documentation

- **[docs/spec-v1.0.md](./docs/spec-v1.0.md)** — Full v1.0 specification (canonical reference)
- **[docs/office-hours-2026-05-24.md](./docs/office-hours-2026-05-24.md)** — Design diagnostic record (premises + 8 founder signals + YAML schema sketch)
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — Build order + design principles (entry point for Codex / Claude / contributors)

---

## License

MIT
