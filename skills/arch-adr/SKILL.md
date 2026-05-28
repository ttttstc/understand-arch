---
name: arch-adr
description: Append-only ADR management and arch-layer architecture_decisions indexing.
argument-hint: ["<decision-title>"]
---

# arch-adr

Create append-only ADR files under `.understand-arch/<project>/decisions/`.

Never edit an accepted ADR in place except to append a supersession note.

After writing an ADR, update `specs/arch-layer.json` using `engine/arch/arch-layer-writer.mjs merge` with a patch that appends `architecture_decisions[]`.
