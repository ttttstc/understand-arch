---
name: arch-review
description: Internal CR.md and architecture artifact review, dispatching arch-senior-reviewer.
argument-hint: ["<CR.md|arch-layer.json|wiki-dir>"]
---

# arch-review

Run deterministic shape checks first, then dispatch `arch-senior-reviewer`.

For CR.md:

- Verify all 14 headings exist.
- Scan for placeholders.
- Dispatch `arch-senior-reviewer` with `mode=design-review`.
- Append JSON findings and human summary to section 14.

For wiki:

- Run `engine/arch/wiki-projection-check.mjs`.
- Dispatch `arch-senior-reviewer` with `mode=wiki-review` if deterministic checks pass or if the user requests full review.
