---
name: arch-audit
description: Audit an understand-arch baseline for freshness, drift, projection completeness, and review readiness.
argument-hint: ["[arch-project-dir] [--full]"]
---

# /arch-audit

Use this when the user asks whether the architecture baseline is trustworthy. The audit checks code graph freshness, architecture-layer completeness, wiki projection, eval-report trust signals, dashboard readiness, rules/ADR consistency, and CR review quality.

## Subagent Dispatch Is Mandatory

This skill is an orchestrator. It must use the Claude Code Task tool for semantic review and extraction phases.

For every LLM phase, use the Claude Code Task tool with the named `subagent_type`. If the Task tool is unavailable, stop and report: "Claude Code subagent tool is unavailable; arch-audit cannot satisfy v3.5 because LLM phases would run inline."

Do not inline this phase. The user must see subagent activity in Claude Code. Deterministic checks may run as Node scripts, but semantic review and extraction must stay in subagents.

## Inputs

- `.understand-arch/<project>/specs/repos.json`
- per-repo `knowledge-graph.json`
- `specs/arch-layer.json`
- `specs/freshness.json`
- wiki pages
- `eval-report.json`
- rules, ADRs, CRs

## Deterministic Checks

1. Resolve `ARCH_PROJECT_ROOT`.
2. Run multi-repo fingerprint check:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/fingerprint-multi-repo.mjs "<workspace-root>"
```

3. Run architecture-layer validation:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/arch-layer-writer.mjs validate "<workspace-root>"
```

4. Run wiki projection check:

```bash
node <PLUGIN_ROOT>/engine/arch/wiki-projection-check.mjs "<ARCH_PROJECT_ROOT>"
```

5. Regenerate first-layer eval:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/eval-report.mjs "<ARCH_PROJECT_ROOT>"
```

5b. Check constraint layer and audit fallback signals (v3.1/v3.4):

Send these N dispatches in a single message to run concurrently (N=3):

1. Run the deterministic constraint check:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/constraint-check.mjs "<workspace-root>"
```

This validates `rules/constraints/`: entry structure, evidence_level/status/source legality, ai-mined never confirmed, evidence links to code (not internal `risk:`/`qa:`/`debt:` ids), and suspicious-findings completeness.

2. Use the Claude Code Task tool with `subagent_type=arch-decision-extractor` for audit fallback extraction if new CR/ADR sources exist. Do not inline this phase. The user must see subagent activity in Claude Code.

3. Use the Claude Code Task tool with `subagent_type=arch-suspicious-recheck` for suspicious finding sanity review. Do not inline this phase. The user must see subagent activity in Claude Code.

5c. Check agent cards and decision feedback (v3.4):

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/cards-check.mjs --arch-dir="<ARCH_PROJECT_ROOT>"
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/decision-extractor-runner.mjs collect --arch-dir="<ARCH_PROJECT_ROOT>"
```

If `intermediate/decision-extractor-input.json` contains new CR/ADR sources since the previous audit, use this Task prompt for `subagent_type=arch-decision-extractor`:

```text
Mode: v3.4 audit fallback decision extraction.
Project: <ARCH_PROJECT_ROOT>
Read intermediate/decision-extractor-input.json.
Extract proposed constraints only.
Return JSON only with constraints[].
Every constraint source must be cr-derived, status proposed, evidence_level not confirmed.
```

Save the returned JSON to `intermediate/decision-extractor-output.json`, then merge:

```bash
ARCH_PROJECT_ROOT="<ARCH_PROJECT_ROOT>" node <PLUGIN_ROOT>/engine/arch/decision-extractor-runner.mjs merge --arch-dir="<ARCH_PROJECT_ROOT>" --output="<ARCH_PROJECT_ROOT>/intermediate/decision-extractor-output.json"
```

6. Check dashboard inputs:
   - at least one repo graph exists
   - `specs/arch-layer.json` exists
   - dashboard can be pointed at `ARCH_PROJECT_ROOT`

7. Scan CRs:
   - all CR.md files have 14 headings
   - section 14 exists
   - placeholders are absent

## LLM Review

Use the Claude Code Task tool with `subagent_type=arch-senior-reviewer` in audit mode. Do not inline this phase. The user must see subagent activity in Claude Code.

```text
Mode: audit.
Project: <ARCH_PROJECT_ROOT>
Deterministic checks: <paste summary JSON>.
Review whether the baseline can be trusted.
Focus on freshness, drift, graph/module coverage, arch-layer evidence, wiki projection, eval hallucination rate, and CR review quality.
Return JSON only with verdict, findings, retry_hints, and summary.
```

## Output

Write:

```text
.understand-arch/<project>/audit/latest.md
.understand-arch/<project>/audit/latest.json
```

The markdown report must include:

- executive verdict
- freshness status
- graph coverage status
- architecture-layer status
- wiki projection status
- eval trust label, evidence closure rate, hallucination rate, coverage, consistency, and information density
- dashboard readiness
- CR/ADR/rules status
- self-iteration status: proposed constraints added since last audit, split by CR/ADR and history
- proposed constraint source distribution:
  - `cr-derived` -> CR 回流
  - `ai-mined` with note containing `git history` -> git 历史考古
  - other `ai-mined` -> 代码考古
  - `interview` -> 访谈
- findings ordered by severity
- recommended rerun commands

## Verdict Rules

- `pass`: no critical/high findings.
- `conditional`: only medium/low findings.
- `fail`: any critical/high finding.

## Failure Rules

- Missing baseline: ask for `/arch-onboard`.
- Missing graph: fail.
- Empty capabilities/quality/risk: fail.
- Empty narrative fields: fail.
- Wiki placeholders: fail.
- Eval hallucination_rate greater than 0: fail.
- Stale fingerprint with source changes: fail.
