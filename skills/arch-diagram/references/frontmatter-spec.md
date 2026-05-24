# Frontmatter Spec

> Diagram files must be traceable artifacts. Frontmatter records backend, source, type, style, and degradation.

## Required Fields

```yaml
backend: fireworks|mermaid
source: <yaml/spec path or conversation source>
generated_at: <ISO-8601>
degraded: true|false
degraded_reason: <string|null>
style: <style name>
diagram_type: c4-context|c4-container|c4-component|deployment|sequence|data-flow
```

## Optional Fields

```yaml
source_commit: <hash|external|git_unavailable>
rendered_outputs:
  - diagrams/foo.svg
  - diagrams/foo.png
style_source: default|architecture_profile|user_override
```

## Degraded Reasons

Allowed common values:

- `fireworks_not_installed`
- `fireworks_render_failed`
- `png_export_unavailable`
- `source_incomplete`
- `manual_spec_used`

`degraded_reason` must be null when `degraded=false`.

## Source Rules

Valid sources:

- `evidence/仓库与组件清单.yaml`
- `evidence/依赖与链路图谱.yaml`
- `design-docs/{change}/影响面.yaml`
- `design-docs/{change}/options.md`
- `adr/ADR-NNN-*.md`
- explicit user spec path

If source is conversation text, use:

```yaml
source: conversation://diagram-spec-<date>
```

## Review Use

`arch-review` may reject diagrams when:

- frontmatter missing;
- source missing;
- diagram type mismatches content;
- degraded is true without reason;
- current-state diagram includes target design facts.
