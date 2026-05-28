---
name: arch-frame
description: Internal PRD hard gate for architecture design. Blocks under-specified requests before CR generation.
argument-hint: ["<prd-or-request>"]
---

# arch-frame

Read the user request and produce:

- problem statement
- explicit goals
- non-goals
- affected users
- constraints
- open questions
- blocking_unknown_count

If `blocking_unknown_count >= 3`, stop the design workflow and ask the user for answers. Do not guess.
