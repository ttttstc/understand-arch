# Fireworks Prompt Templates

> Fireworks prompts translate structured architecture source into publication-ready visuals. They must preserve source facts.

## Shared Prompt Prefix

```text
Create a technical architecture diagram from the following structured source.
Do not add systems, services, data stores, or dependencies not present in the source.
Show clear labels, boundaries, and directional relationships.
Output as SVG and PNG when available.
Style: <style>.
Diagram type: <type>.
Source: <path>.
```

## C4 Context

```text
Show the system boundary, primary actors, external systems, and high-level relationships.
Keep internal services collapsed unless they are necessary to explain the boundary.
```

## C4 Container

```text
Show deployable containers/services, data stores, queues, and major runtime dependencies.
Group components by repository or bounded context when source provides it.
Use directional arrows and label sync vs async edges.
```

## C4 Component

```text
Show components inside <service>.
Use only components and dependencies listed in the source.
Highlight external dependencies leaving the component boundary.
```

## Deployment

```text
Show runtime deployment units, environments, network zones, external dependencies, and release/rollback relevant order.
Do not generate infrastructure code or cloud templates.
```

## Sequence

```text
Show the ordered interaction for the named flow.
Include actors, services, data stores, external systems, and error/rollback path if present.
```

## Data Flow

```text
Show data movement, ownership, storage, transformation, and external egress.
Label sensitive data or compliance boundaries only when present in source.
```

## Agent Architecture

```text
Show user, orchestrator, model/provider, tools, retrieval/index, memory, guardrails, eval loop, and human handoff if present.
Emphasize control flow and data boundaries.
```

## Degraded Note

If fireworks cannot run, do not attempt to mimic it manually. Use Mermaid and record degraded frontmatter.
