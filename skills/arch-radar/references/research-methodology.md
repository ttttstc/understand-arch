# Research Methodology

> `arch-radar` uses Research -> Review -> Revise -> Publish. It must use public sources and evidence-backed claims.

## Phase 1: Scope

Clarify:

- topic;
- decision to support;
- candidate list if any;
- architecture profile concerns;
- time sensitivity;
- excluded sources.

If scope is too broad, use `topic-scoping-rules.md`.

## Phase 2: Discover

Breadth-first:

- official docs;
- GitHub repositories;
- vendor docs;
- standards/specs;
- papers;
- engineering blogs;
- issue trackers or discussions;
- credible benchmark reports.

Find at least 3 candidates unless field is narrow.

## Phase 3: Deep Dive

For each candidate:

- maturity;
- capability fit;
- operational complexity;
- integration fit;
- known limitations;
- community/maintenance signals;
- licensing or commercial constraints.

## Phase 4: Source Evaluation

Score each source with `source-evaluation.md`.

Prefer:

- official docs;
- primary repo/docs;
- recent release notes;
- independent production writeups;
- reproducible benchmarks.

Treat vendor-only claims carefully.

## Phase 5: Synthesis

Produce:

- `radar-summary.yaml`;
- `对标矩阵.md`;
- recommendation and non-recommendations;
- assumptions and evidence gaps.

Every claim needs `source_url`, `accessed_at`, and credibility score.

## Phase 6: Self Review

Before publishing, reviewer pass checks:

- Are there at least 3 candidates or a narrow-field explanation?
- Are claims sourced?
- Are recent facts actually fetched?
- Are source scores credible?
- Does recommendation map to architecture profile?
- Are limitations and failure cases included?

If review fails, revise once before publishing.
