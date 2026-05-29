---
name: arch-review
description: Internal CR.md and architecture artifact review, dispatching arch-senior-reviewer.
argument-hint: ["<CR.md|arch-layer.json|wiki-dir>"]
---

# arch-review

Run deterministic checks first, then dispatch `arch-senior-reviewer`. This skill is the common review gate for CR, wiki, architecture layer, and audit artifacts.

## Supported Modes

- `design-review`: CR.md review.
- `wiki-review`: wiki directory review.
- `arch-layer`: architecture layer JSON review.
- `audit`: freshness and drift review.

Infer mode from the target path when the caller does not provide one.

## Deterministic Checks For CR.md

1. Verify the CR exists.
2. Verify all 14 headings exist in order.
3. Verify no duplicate headings.
4. Verify section 8 contains both core impacted set and adjacent review set.
5. Verify section 14 is append-only if it already has review history.
6. Scan for placeholder tokens:
   - TODO
   - TBD
   - placeholder
   - lorem ipsum
   - 待补充
   - 占位
7. Verify frontmatter has `cr_id`, `title`, and `status`.

## Deterministic Checks For Wiki

Run:

```bash
node <PLUGIN_ROOT>/engine/arch/wiki-projection-check.mjs "<ARCH_PROJECT_ROOT>"
```

Fail on missing projections or placeholders.

## Deterministic Checks For Arch Layer

Run:

```bash
node <PLUGIN_ROOT>/engine/arch/arch-layer-writer.mjs validate "<workspace-root>"
```

Also check:

- architecture_style present with confidence/evidence_refs
- component_profiles non-empty
- capabilities non-empty
- flows projected when present
- quality_attributes non-empty
- risks non-empty
- complexity_hotspots and extension_constraints have confidence/evidence_refs when present
- evidence_refs present
- confidence present
- node ids resolve to repo graphs

## Senior Reviewer Dispatch

```text
Mode: <mode>.
Artifact: <path>.
Deterministic check output: <summary JSON>.
Read the artifact and relevant graph/arch-layer/wiki context.
Lead with findings.
Reject shape-only artifacts.
Reject placeholder text.
Return JSON only:
{
  "verdict": "approve|conditional|reject",
  "findings": [
    {
      "id": "...",
      "severity": "critical|high|medium|low",
      "title": "...",
      "evidence": "...",
      "recommendation": "..."
    }
  ],
  "retry_hints": [],
  "summary": "..."
}
```

## Writing Results

- For CR.md, append review output to `## 14. Review` using `cr-md-editor.mjs`.
- For wiki, write `wiki/review.json`.
- For arch-layer, write `intermediate/arch-layer-review.json`.
- For audit, write `audit/review.json`.

## Failure Rules

- If deterministic checks fail, still dispatch senior reviewer with the failures as evidence unless the artifact cannot be read.
- Do not modify sections outside the review destination.
- Do not approve if any critical/high findings remain.
- Do not remove previous review history.
