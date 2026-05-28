---
name: arch-audit
description: Audit freshness, drift, arch-layer completeness, and wiki projection quality.
argument-hint: ["[project-path]"]
---

# /arch-audit

1. Run `engine/arch/fingerprint-multi-repo.mjs`.
2. Validate `specs/arch-layer.json` with `engine/arch/arch-layer-writer.mjs validate`.
3. Run `engine/arch/wiki-projection-check.mjs`.
4. Dispatch `arch-senior-reviewer` with `mode=audit` for semantic judgement.
5. Report blocking findings first.
