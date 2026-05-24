# Radar Template

## radar-summary.yaml

```yaml
topic: "<topic>"
generated_at: "<ISO-8601>"
generated_by: arch-radar
scope: "<scope>"
candidates:
  - id: candidate-a
    name: "<name>"
    summary: "<short summary>"
    maturity: "<assessment>"
    fit_for_profile: "<assessment>"
    risks: []
    sources:
      - source_url: "https://..."
        accessed_at: "<ISO-8601>"
        credibility_score: 8
recommendation:
  selected: candidate-a
  rationale: "<why>"
  conditions: []
non_recommendations:
  - candidate: candidate-b
    reason: "<why not>"
evidence_gaps: []
degraded: false
degraded_reason: null
```

## 对标矩阵.md

```markdown
---
generated_by: arch-radar
generated_at: <ISO-8601>
topic: <topic>
source_summary: radar-summary.yaml
---

# 对标矩阵: <topic>

## Decision Context

<What decision this research supports.>

## Candidates

| Candidate | Maturity | Strengths | Weaknesses | Fit | Sources |
|---|---|---|---|---|---|
| A | ... | ... | ... | ... | [1](url) |

## Recommendation

<Selected candidate + rationale + conditions.>

## Not Recommended

| Candidate | Reason |
|---|---|

## Evidence Gaps

<What could not be verified.>
```

## Rules

- Keep source URLs in the matrix.
- Explain single-candidate or fewer-than-3 candidate cases.
- Recommendation must include fit to project profile, not generic popularity.
