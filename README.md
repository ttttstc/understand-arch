# understand-arch

> A Docs-as-Code architecture knowledge suite for Claude Code.

[中文](./README.zh.md) · [Full Spec](./docs/spec-v1.0.md)

---

## What it is

`understand-arch` is **not** another doc-generator that produces a fresh wall of markdown every time you ask. It maintains a **trusted, versioned, agent-readable architecture baseline** for a project, and records every change as a delta against that baseline.

At any point in time, the suite can answer:

- What does the system look like right now? *(specs)*
- What does this change touch, and how do we roll it back? *(CR)*
- Which conclusions have evidence? *(traceability)*
- What might be out of date? *(freshness state machine)*

## Public commands

v1.0 exposes only **four user-facing entries**. Everything else is internal orchestration.

| Command | What you'd say | What happens |
|---|---|---|
| `/arch:onboard` | "Help me understand this codebase" / "Build a baseline" | Scans the repo, produces `specs/` (5 schema-locked YAMLs + Mermaid diagrams) |
| `/arch:design` | "Design this PRD" / "Open a CR for X" | Creates `change-requests/CR-*/` with impact / options / ADR / review |
| `/arch:audit` | "Is the baseline still trustworthy?" | Reviews `specs/` without re-scanning; flags freshness; optionally runs drift audit |
| `/arch:brief` | "Make a wiki for new joiners" / "Brief for the CTO" | Re-organizes existing facts into `generated/overview.md`, 5-page wiki, or audience-tailored briefs |

`arch-review`, `arch-options`, `arch-adr`, `arch-diagram`, `arch-pack`, `arch-radar` are all internal — invoked by the four entries above when needed.

## Workspace layout

```text
arch/{project}/
├── specs/                            # 100% fact layer (yaml + Mermaid only, no markdown)
│   ├── baseline.yaml                 # components, interfaces, data models, deployments
│   ├── quality.yaml                  # NFRs, org KB, runtime/release/rollback constraints
│   ├── risks.yaml                    # risks + tech debt ledger
│   ├── decisions.yaml                # ADR index + superseded[] relationships
│   ├── traceability.yaml             # CR ↔ specs ↔ ADR ↔ release links
│   └── diagrams/                     # stable C4 Mermaid sources
├── decisions/                        # append-only ADR markdown (files NEVER modified)
│   └── ADR-NNN-*.md
├── change-requests/
│   └── CR-YYYY-NNN-{slug}/
│       ├── cr.md
│       ├── impact.yaml
│       ├── review.yaml
│       ├── traceability.yaml
│       └── options.md                # conditional, only if real architectural choice exists
├── generated/                        # derived human views — deletable, regeneratable
│   ├── overview.md                   # 1-page stable entry (11 sections, ≤200 lines)
│   ├── wiki/01-..05-*.md             # 5-page onboarding wiki
│   ├── diagrams/                     # rendered SVG/PNG
│   └── briefs/                       # audience-tailored summaries
├── state.yaml                        # workflow state machine (only arch-workflow writes)
└── .metrics.jsonl                    # per-skill-run telemetry
```

## Governance pillars

These are what make the suite stand up over time, especially as LLMs get more capable at producing prose:

1. **Specs are the only fact source** — `specs/*.yaml` is schema-locked. Anything in `generated/`, `cr.md`, an ADR body, or a brief that contradicts specs is a bug.
2. **Append-only history** — `decisions/ADR-*.md` files are never modified after commit. Supersede relationships are recorded in `specs/decisions.yaml#superseded[]`. `state.yaml.history` and `state.yaml.overrides` are append-only too.
3. **Freshness state machine** — every baseline carries `freshness_status: fresh|possibly_stale|stale|unknown`, computed from commit diff against architecture-sensitive paths. Stale baselines block design with a Chinese refresh prompt.
4. **Single-writer state** — only `arch-workflow` writes `state.yaml`. Other skills return a `state_delta` for the workflow to merge. Eliminates concurrent-state corruption.
5. **Write-scope contract** — `internal/tool-contracts/write-scope.yaml` declares, per skill, which paths are writable. `arch-pack` cannot write `specs/`; `arch-review` cannot write anything except `review.yaml`; `arch-analyze` cannot write `decisions/` — and so on. v1.0 enforces via acceptance audit; v1.1 will enforce via PreToolUse hook.
6. **Trace closure** — every assertion in a YAML must carry `evidence_refs`. Every prose claim in `overview.md` or wiki must trace back to a YAML field or an ADR/CR path. No weasel words.

## What it produces / refuses to produce

| ✅ Allowed | ❌ Refused |
|---|---|
| `*.md` (overview, wiki, ADR, CR, briefs) | Terraform / Helm / Pulumi |
| `*.yaml` (schema-locked facts) | DDL / ORM migrations |
| `*.mmd` (Mermaid sources) | `.github/workflows/*` / `.gitlab-ci.yml` |
| `*.svg` / `*.png` (rendered diagrams) | service scaffolds / OpenAPI client code |
|   | business code |

Tool-level safety: the write-scope contract refuses any of the forbidden patterns even if a skill is somehow prompted to produce them.

## What's bundled

| Layer | Contents |
|---|---|
| 10 skills | `arch-workflow / arch-analyze / arch-frame / arch-diff-judge / arch-options / arch-adr / arch-diagram / arch-review / arch-pack / arch-radar` — each with `SKILL.md` + executable `references/` (rubrics, templates, playbooks) |
| Schemas | 5 specs schemas + 3 CR schemas + state schema + 5 org KB schemas |
| Acceptance | 4 per-entry YAMLs with `structural_checks` + `semantic_checks` + `scope_audit` |
| Tool contracts | `internal/tool-contracts/write-scope.yaml` — per-skill write/read/forbidden matrix |
| Templates | `arch/_template/` workspace skeleton + `arch/sample/` worked example |
| KB seeds (`arch-library/`) | 8 domain seeds, all under 200 lines: `typescript-patterns/` × 4 · `microservices-patterns/` × 3 · `devops-patterns/` × 3 · `migration-patterns/` × 3 · `nfr-checklists/` × 4 · `anti-patterns/` × 1 |

AI/agent architecture KB (`arch-library/agent-architecture/`) is intentionally deferred — re-add when AI-domain support lands.

## Architecture-sensitive language

User-facing prompts default to **Chinese first** (e.g., "当前架构基线可能已过期"), with English technical terms in parentheses when first introduced. YAML keys and schema fields stay in stable English.

## How to start

```bash
# In Claude Code, with the plugin installed:
/arch:onboard
```

The first run scans your repo, writes a `specs/` baseline, computes `freshness_status`, and surfaces any `known_unknowns` (e.g., components without owners) in Chinese. Subsequent `/arch:design`, `/arch:audit`, `/arch:brief` work against the same workspace.

## Status

**v1.0 specs-CR model is in place**, including:

- Spec + 10 skills + 14 JSON schemas + 4 acceptance gates + write-scope contract + 17 references + 18 KB seed documents
- `arch/_template/` scaffold and `arch/sample/` worked example
- **Multi-agent parallel scan orchestration** (`scan-shard` contract + slicing rules + main-context aggregation) — solves context overflow on large repos

What's not in v1.0 (see [v1.1 candidates](./docs/spec-v1.0.md#v11-candidates)):

- `arch-review --mode=fitness` for ADR fitness specs
- PreToolUse hook for write-scope hard enforcement
- True LLM-rendered wiki / RAG over specs/CR (overview.md is a 1-page index, not a Q&A entry)
- AI/agent architecture KB seeds

## License

License: see [LICENSE](./LICENSE).
