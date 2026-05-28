---
name: arch-audit
description: Audit an understand-arch baseline for freshness, drift, projection completeness, and review readiness.
argument-hint: ["[arch-project-dir] [--full]"]
---

# /arch-audit

Use this when the user asks whether the architecture baseline is trustworthy. The audit checks code graph freshness, architecture-layer completeness, wiki projection, eval-report trust signals, dashboard readiness, rules/ADR consistency, and CR review quality.

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

6. Check dashboard inputs:
   - at least one repo graph exists
   - `specs/arch-layer.json` exists
   - dashboard can be pointed at `ARCH_PROJECT_ROOT`

7. Scan CRs:
   - all CR.md files have 14 headings
   - section 14 exists
   - placeholders are absent

## LLM Review

Dispatch `arch-senior-reviewer` in audit mode:

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
