# Backend Selection Rules

> `arch-diagram` always writes Mermaid source. Fireworks is an optional visual renderer.

## Inputs

- `--backend=auto|fireworks|mermaid`
- `--type=c4-context|c4-container|c4-component|deployment|sequence|data-flow`
- audience or workflow context
- `architecture_profile.recommended_diagram_style`
- user `--style` override

## Decision Tree

1. Validate source exists.
2. Generate Mermaid `.mmd` plan.
3. If backend is `mermaid`, stop after `.mmd`.
4. If backend is `fireworks`, attempt fireworks and fallback to Mermaid on failure.
5. If backend is `auto`, choose:
   - management/wiki/brief: fireworks when available;
   - PR review/dev implementation: Mermaid;
   - explicit profile style: prefer compatible backend;
   - unavailable fireworks: Mermaid.

## Availability

Fireworks available means the fireworks-tech-graph skill can be invoked.

PNG export available means at least one renderer path exists through fireworks or local conversion tooling. If SVG is available but PNG is not, mark degraded only for PNG.

## Failure Handling

| Failure | Behavior |
|---|---|
| fireworks skill missing | write Mermaid, degraded reason `fireworks_not_installed` |
| fireworks render fails | keep Mermaid, degraded reason `fireworks_render_failed` |
| PNG export unavailable | keep SVG/Mermaid, degraded reason `png_export_unavailable` |
| source missing | reject; do not draw |
| source schema invalid | reject; ask owning skill to regenerate |

## Readiness

Mermaid fallback is not a workflow failure. It is a degraded visual backend, not degraded architecture evidence.
