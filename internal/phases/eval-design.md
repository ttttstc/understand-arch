# Phase: eval-design

> Mini-SKILL for the **eval-design** phase. Inserted into the `design` mode state machine when `arch-frame` detects an AI/agent architecture (RAG, multi-agent, LLM application, fine-tuning pipeline, ML serving).
>
> Purpose: force the team to design *how they will know the system works* — offline eval set, online guardrails, KPIs — **before** the ADR is signed. Without this phase, AI projects routinely ship without measurable quality criteria, then drift undetected.

---

## 1. When to insert

`arch-frame` writes `recommended_phases: [eval-design]` into `项目总览.yaml` when **any** of the following appears in `architecture_profile.identified_styles` or `primary_concerns`:

| Signal | Examples |
|---|---|
| LLM application | "GPT 调用", "Claude API", "LLM 推理", "prompt 工程" |
| RAG / retrieval | "向量检索", "embedding", "知识库问答", "RAG", "召回质量" |
| Multi-agent | "agent 编排", "工具调用", "agent 协作", "ReAct", "AutoGen-style" |
| Fine-tuning | "微调", "LoRA", "SFT", "RLHF" |
| ML serving | "模型推理", "在线预测", "推荐排序" |
| AI-related primary_concern | "幻觉", "召回率", "事实性", "回答质量", "毒性", "越狱", "成本/token" |

If none of the above signals are present, this phase **must not be inserted** (do not insert "just in case" — eval-design has real cost and slows down non-AI designs).

User can override:
- Add via `--phase eval-design` even if `arch-frame` did not recommend
- Remove via `--skip-phase eval-design` (workflow records skip + reason in `state.yaml`)

---

## 2. Input contract

Reads from `${ARCH_PROJECT_DIR}/`:

| File | Purpose |
|---|---|
| `evidence/项目总览.yaml` | `architecture_profile` (which AI patterns are in play) |
| `evidence/影响面.yaml` | which components are AI-touching (eval scope) |
| `options.md` | the **selected** option (eval strategy must match the chosen architecture) |
| `arch-library/agent-architecture/*.md` | RAG / agent / eval reference patterns (loaded by skill agent on demand) |

Hard prerequisite: `options.md` must have a **selected** option recorded. Eval design without a chosen architecture is premature — wait.

---

## 3. Output contract

Produces exactly one file:

```
${ARCH_PROJECT_DIR}/eval-strategy.md
```

The file **must** contain these 6 sections (in order). Missing or empty sections cause structural acceptance to fail.

### 3.1 Quality dimensions (required)

For each AI-touching component identified in `影响面.yaml`, list the quality dimensions that matter, e.g.:

| Component | Dimension | Why it matters here |
|---|---|---|
| RAG retriever | Recall@k | Missing chunks → unanswerable questions |
| RAG retriever | Precision@k | Noisy chunks → hallucinated synthesis |
| LLM synthesizer | Faithfulness | Answer must be grounded in retrieved chunks |
| LLM synthesizer | Answer relevance | Direct answer vs evasion |
| Multi-agent planner | Task completion rate | End-to-end success |
| Multi-agent planner | Tool-call validity | Invalid tool args → cascading failure |

Generic dimension catalog (pick what applies, do not include all):
faithfulness, answer-relevance, context-relevance, recall@k, precision@k, mrr, latency-p95, cost-per-request, toxicity, jailbreak-resistance, refusal-correctness, task-completion, tool-call-validity, hallucination-rate.

### 3.2 Offline eval set (required)

- **Source**: where labeled examples come from (production logs / synthetic / hand-curated / public benchmark). State explicitly.
- **Size**: at least an order-of-magnitude target (e.g., "≥500 examples, expanding to 2000 after dogfood"). "We'll add some" is not acceptable.
- **Stratification**: how the set is split to cover edge cases (long-tail queries, multi-hop, ambiguous, adversarial).
- **Labels**: who labels, with what rubric, with what inter-annotator agreement target if applicable.
- **Storage**: where the set lives, how it's versioned (golden set vs evolving set).
- **Refresh cadence**: when the set gets regenerated/expanded.

If any of the above is "TBD", mark with **OPEN_QUESTION** and add to `决策与证据索引.yaml` open_questions.

### 3.3 Online guardrails (required)

What runs at request time, in production, to catch failures the offline set won't catch:

| Guardrail | Trigger | Action |
|---|---|---|
| Refusal classifier | model refuses on benign query | log + alert |
| Toxicity filter | output toxicity > threshold | block + log |
| Cost budget | per-request token spend > N | truncate / fallback |
| Latency SLO | p95 > target | autoscale / circuit-break |
| Hallucination heuristic | answer cites non-existent sources | flag for review |

State which guardrails are MVP-required vs which are deferred.

### 3.4 KPIs (required)

The 3–5 metrics leadership/PM will see on a dashboard. Each KPI must have:

- **Definition** (exact formula or measurement procedure)
- **Source** (offline / online / hybrid)
- **Target** (initial bar, e.g., "faithfulness ≥ 0.85 on golden set")
- **Owner** (who watches it)

Distinguish:
- **Launch gate KPIs** (must hit before shipping)
- **Ongoing health KPIs** (continuously monitored)

### 3.5 Eval pipeline (required)

How offline eval actually runs:

- Where the eval harness lives (repo path or proposed)
- When it runs (per commit / nightly / pre-release)
- How regressions surface (CI fail / Slack alert / dashboard)
- Who owns the harness

Even a rough proposal is acceptable for v1.0 — the goal is to force the conversation, not to ship a working harness in this phase.

### 3.6 Open questions (required, may be empty)

Anything the design *cannot* answer yet and needs follow-up. Each entry mirrors the `决策与证据索引.yaml` open_questions schema (id, question, blocker_for, owner_hint).

---

## 4. Acceptance criteria

Structural (all required):
- `eval-strategy.md` exists
- All 6 sections (3.1–3.6) present and non-empty (3.6 may be an explicit "(none)")
- All assertions in §3.4 KPI definitions reference a measurement source

Semantic (LLM verifier, all required):
- Each AI-touching component from `影响面.yaml` is covered in §3.1
- §3.2 offline set has concrete source, size target, label process — not "TBD" without an open_question entry
- §3.3 guardrails distinguish MVP vs deferred
- §3.4 KPIs each have definition + target + owner
- §3.5 names where the eval harness lives or will live
- The selected option in `options.md` is consistent with the eval strategy (e.g., if option is "no RAG, fine-tune instead", §3.1 must reflect fine-tuning eval dimensions, not RAG)

If semantic fails: retry the phase with verifier notes (up to 2 retries). Third failure → escalate to user (this phase is too central to silently degrade).

---

## 5. Failure degradation

| Failure | Behavior |
|---|---|
| `options.md` has no selected option | Block phase, ask user to select first |
| `arch-library/agent-architecture/` empty (KB not seeded) | Run with reduced reference set, mark `degraded: true` in state |
| User declines to answer eval questions during interactive prompts | Save partial eval-strategy.md with explicit OPEN_QUESTION blocks; mark `degraded: true`; ADR phase must surface this |
| Semantic acceptance fails 3× | Escalate to user — do NOT silently mark "good enough"; AI projects with no eval design are the failure mode this phase exists to prevent |

`degraded: true` propagates to the design-mode acceptance gate. design mode does **not** allow degraded — so a degraded eval-design will fail the overall design acceptance and force the user to either fix it or explicitly override.

---

## 6. Orchestration

Inserted by `arch-workflow` into the **design** mode state machine at position:

```
... → options → [eval-design] → adr → diagram → pack → review
```

Rationale: must run **after** options (need selected architecture) and **before** adr (eval strategy must be referenced in the ADR's "Consequences" and "Fitness spec" sections).

Phase is a single skill-agent invocation (no subagent split). The skill agent:
1. Reads inputs (§2)
2. Loads relevant `arch-library/agent-architecture/*.md` references on demand
3. Asks user up to 3 interactive questions for unknowns (eval set source, KPI owners, harness location)
4. Writes `eval-strategy.md`
5. Updates `state.yaml` phase status
6. Returns control to workflow

---

## 7. Notes for future phases

This file is the **canonical template** for v1.1 phase additions. New phases (capacity-planning, threat-modeling, migration-planning, data-governance) must follow the same structure: When to insert / Input contract / Output contract / Acceptance / Failure degradation / Orchestration position.

When adding a v1.1 phase:
1. Write `internal/phases/{phase-name}.md` mirroring this file
2. Add row to `internal/phases/MANIFEST.md` "可用 phases" table
3. Update `arch-frame` reference `kb-loading-rules.md` so frame recommends it
4. Update `arch-workflow` `mode-pipelines.md` so workflow knows the insertion point
5. Add structural + semantic checks to relevant `internal/acceptance/{mode}.yaml`
