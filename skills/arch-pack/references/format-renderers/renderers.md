# Format Renderers

> v1.0 guarantees markdown/wiki. HTML and PPTX may degrade to markdown unless project templates exist.

## Formats

| Format | v1.0 Behavior |
|---|---|
| wiki | write markdown pages under `wiki/` |
| md | write markdown file/package |
| html | render if template exists; otherwise degrade to md |
| pptx | render if template exists; otherwise degrade to md |

## Degradation

When HTML/PPTX renderer is unavailable:

```yaml
degraded: true
degraded_reason: format_renderer_unavailable
fallback_format: md
```

## Renderer Boundary

Renderers may change layout, not facts.

They must preserve:

- title;
- generated metadata;
- source artifacts;
- evidence links;
- risk severity;
- decision wording.

They must not add new conclusions for visual polish.
