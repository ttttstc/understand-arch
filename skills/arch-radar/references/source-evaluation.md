# Source Evaluation

> Source credibility score is 0-10. Use it to weight claims, not to hide weak evidence.

## Score Bands

| Score | Meaning |
|---|---|
| 9-10 | official docs, primary repo, standard, reproducible primary data |
| 7-8 | credible engineering blog, maintainer statement, independent production report |
| 5-6 | useful but partial blog, vendor benchmark, older source |
| 3-4 | anecdote, forum post, single-user opinion |
| 0-2 | unsourced, inaccessible, contradicted, spam-like |

## Required Metadata

```yaml
- source_url: https://example.com
  title: "..."
  accessed_at: 2026-05-24T12:00:00Z
  source_type: official_docs|repo|paper|blog|issue|benchmark|other
  credibility_score: 8
  notes: "Production writeup, but vendor-authored."
```

## Recency

For technology choice, prefer sources from the last 24 months unless the source is a stable standard or canonical paper.

If a source may be stale, mark it:

```yaml
staleness_risk: true
```

## Conflict Handling

When sources disagree:

- cite both;
- explain difference;
- prefer primary/current sources;
- do not average claims into a fake certainty.

## Forbidden

- unsourced "industry best practice";
- hallucinated GitHub stars, citations, or release dates;
- paywalled/private source scraping;
- using model memory as a source.
