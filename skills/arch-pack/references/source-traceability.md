# Source Traceability

> `arch-pack` is a compiler from upstream artifacts into audience-ready documents. It must not invent facts.

## Frontmatter

Every generated markdown/html/pptx source markdown must include:

```yaml
---
generated_by: arch-pack
generated_at: <ISO-8601>
audience: onboarding|decision|dev-implementation|management
format: wiki|md|html|pptx
source_artifacts:
  - evidence/项目总览.yaml
  - evidence/依赖与链路图谱.yaml
degraded: false
degraded_reason: null
---
```

## Claim Rules

Every major claim must link to one of:

- project evidence YAML;
- `影响面.yaml`;
- `options.md`;
- ADR;
- arch-review finding;
- diagram frontmatter source.

## Numbers

Numbers are high-risk. They need direct source:

- latency targets;
- cost estimates;
- number of repos/services;
- risk counts;
- rollout dates;
- capacity values.

If the source is an estimate, label it:

```text
Estimate from arch-analyze manifest, not production telemetry.
```

## Derived Content

Allowed derived content:

- reordering;
- summarizing;
- grouping;
- linking;
- audience-specific wording.

Forbidden derived content:

- new architecture conclusions;
- new risk claims;
- new effort estimates without source;
- new technical choices.

## Broken Links

If a source artifact is missing, block pack and point to the owning skill. Do not emit a partial final package for design mode.
