---
name: arch-design
description: Turn a PRD or change request into a 14-section CR.md with impact analysis and senior architect review.
argument-hint: ["<prd-or-request>"]
---

# /arch-design

Use this when the user asks for implementation design or impact analysis.

1. Dispatch `arch-frame` to clarify the PRD. If there are 3 or more blocking unknowns, stop and ask the user.
2. Dispatch `arch-impact-analyzer` with the PRD, code graph, arch-layer, rules, ADRs, and existing CRs.
3. Create or update CR.md with `engine/arch/cr-md-editor.mjs`. Never overwrite the whole file.
4. Dispatch `arch-solution-designer` to fill CR.md sections 1-13.
5. Dispatch `arch-review` for senior review. Append findings to section 14 only.

The CR.md must contain exactly the 14 headings from spec v3.0 §9.1.
