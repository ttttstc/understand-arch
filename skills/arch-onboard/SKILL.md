---
name: arch-onboard
description: Onboard a single-repo or multi-repo system with the v3.0 pipeline, producing per-repo code graphs, arch-layer.json, wiki, and dashboard inputs.
argument-hint: ["[project-name] [--repo <path>]..."]
---

# /arch-onboard

Run the complete understand-arch v3.0 onboarding flow. Treat single-repo as multi-repo with N=1.

## Contract

- Do not run LLM semantic inference in Node or Python.
- Dispatch `/arch-analyze` for every repo. That skill owns Phase 0-6 and inherits the UA scanner orchestration.
- Use `engine/arch/cross-repo-linker.mjs` only for deterministic cross-repo edges.
- Dispatch `arch-enrich` for Phase 7-12.
- Fail if any of `arch-layer.capabilities`, `arch-layer.quality_attributes`, or `arch-layer.risks` is empty after enrichment.

## Flow

1. Resolve `PROJECT_ROOT` and `ARCH_PROJECT_ID`.
2. Create `$PROJECT_ROOT/.understand-arch/$ARCH_PROJECT_ID/specs/repos.json`.
3. For each repo entry, keep `ARCH_PROJECT_ID=<project-id>`, set `ARCH_REPO_ID=<repo_id>`, and dispatch `arch-analyze` with the repo path.
4. Run:

   ```bash
   ARCH_PROJECT_ROOT="$PROJECT_ROOT/.understand-arch/$ARCH_PROJECT_ID" \
     node <PLUGIN_ROOT>/engine/arch/cross-repo-linker.mjs "$PROJECT_ROOT"
   ```

5. Dispatch `arch-enrich` with graph paths and cross-edge output.
6. Dispatch `arch-wiki` to render the 14-page wiki.
7. Tell the user where the outputs landed.
