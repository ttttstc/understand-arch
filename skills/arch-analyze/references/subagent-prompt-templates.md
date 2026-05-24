# Subagent Prompt Templates

> These are templates for the isolated analysis workers. They return YAML fragments that the main workflow validates and merges.

## Shared System Rules

Use this in every subagent prompt:

```text
You are an arch-analyze worker for one repository and one depth.
Run deterministic inspection first, then interpret.
Return structured YAML only.
Every conclusion must include evidence_refs.
Do not modify files.
Do not generate source code, IaC, DDL, CI files, service skeletons, or clients.
If a fact is unknown, write unknown_from_scan with a reason.
```

## Manifest Worker

Input:

```yaml
repo_id: <id>
repo_path: <path>
commit: <hash|git_unavailable>
project_overview: <summary>
```

Tasks:

1. Detect repo type and primary languages.
2. Find entrypoints.
3. Find build, test, and deployment clues.
4. Identify components/modules.
5. Identify dependency edges and external dependencies.
6. Return fragments matching:
   - `internal/schemas/仓库与组件清单.schema.json`
   - `internal/schemas/依赖与链路图谱.schema.json`

Return:

```yaml
repo_id: <id>
depth: manifest
status: ok
inventory:
  repositories: []
  components: []
dependency_map:
  nodes: []
  dependencies: []
  external_dependencies: []
  critical_flows: []
analysis_failures: []
evidence_refs: []
```

## Risk Worker

Input:

```yaml
repo_id: <id>
repo_path: <path>
manifest_fragment: <yaml>
dependency_fragment: <yaml>
git_churn_summary: <optional>
```

Tasks:

1. Detect coupling risks.
2. Detect high-churn/high-complexity hotspots.
3. Detect thin or absent tests around critical modules.
4. Detect operational blind spots.
5. Detect security/compliance concerns only when evidence exists.
6. Return risks and technical debt entries.

Return:

```yaml
repo_id: <id>
depth: risk
status: ok
risks:
  - id: <kebab>
    title: <text>
    category: coupling|reliability|security|performance|data|operability|maintainability|compliance|unknown
    severity: critical|high|medium|low|info
    affected_scope: []
    description: <text>
    mitigation: <text>
    owner: <owner|unknown>
    status: open
    evidence_refs: []
technical_debts: []
analysis_failures: []
```

## Model Worker

Input:

```yaml
repo_id: <id>
repo_path: <path>
manifest_fragment: <yaml>
dependency_fragment: <yaml>
```

Tasks:

1. Group directories into semantic components.
2. Map components to C4 container/component concepts.
3. Generate Mermaid source for current-state diagrams.
4. Keep diagrams grounded in dependency map nodes and edges.

Return:

```yaml
repo_id: <id>
depth: model
status: ok
c4:
  context_nodes: []
  container_nodes: []
  component_nodes: []
diagrams:
  - path: diagrams/c4-container-<repo>.mmd
    mermaid: |
      flowchart LR
        ...
evidence_refs: []
```

## Full Worker

`full` is not a special analysis method. It runs:

1. manifest worker
2. model worker
3. risk worker

The main context merges outputs in that order.

## Output Validation

Before returning, each worker self-checks:

- Required IDs are stable kebab-case.
- Every item has evidence refs.
- Unknown fields are explicit.
- No forbidden output is requested or produced.
- No repository is silently excluded.

If validation fails, return `status: failed` with reasons instead of partial prose.
