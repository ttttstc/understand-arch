---
name: arch-wiki
description: Render the v3.0 14-page architecture wiki and review projection completeness.
argument-hint: ["[audience=cto|newcomer|pm|architect]"]
---

# /arch-wiki

Render exactly:

01-overview / 02-components / 03-interfaces / 04-data-models / 05-capabilities / 06-quality / 07-risks-and-debt / 08-deployments / 09-flows-and-scenarios / 10-decisions / 11-changes / 12-rules / 13-pending-changes / 14-diagrams + README.

Use graph + arch-layer as source of truth. Do not write placeholder text. If data is missing, state the known unknown and ensure it appears in arch-layer.known_unknowns.

After rendering, run `engine/arch/wiki-projection-check.mjs`. If the audience is `cto` or `architect`, dispatch `arch-senior-reviewer` with `mode=wiki-review`.
