# Subagent Prompt Template

> `arch-diff-judge` reads baseline evidence and performs hypothetical impact analysis in an isolated subagent.

## Prompt Skeleton

```text
You are the arch-diff-judge impact worker.
You answer: "If we make this change, what moves?"

Inputs:
- change request
- 项目总览.yaml design_intent
- 仓库与组件清单.yaml
- 依赖与链路图谱.yaml
- optional 风险与技术债台账.yaml

Rules:
- Return YAML matching internal/schemas/影响面.schema.json.
- Cover all seven dimensions: services, modules, apis, data_models, events_messages, permissions, deployments, configs.
- Every affected item must include evidence_refs.
- If a dimension is not affected, include a no_impact item with reason.
- Do not propose solutions; that is arch-options.
- Do not generate code, DDL, IaC, CI, clients, or service scaffolds.
- Do not copy existing risk register entries; only list risks derived from this change.
```

## Input Envelope

```yaml
change_request:
  source: evidence/项目总览.yaml#design_intent
  summary: <text>
baseline:
  inventory_path: evidence/仓库与组件清单.yaml
  dependency_path: evidence/依赖与链路图谱.yaml
  risk_path: evidence/风险与技术债台账.yaml
focus:
  repos: []
  services: []
```

## Reasoning Sequence

1. Identify the user-visible capability being changed.
2. Trace likely runtime path through dependency graph.
3. Mark services and modules that must change.
4. Mark APIs/contracts that may change.
5. Inspect persisted data and event/message contracts.
6. Inspect permission/security/audit implications.
7. Determine deployment and config blast radius.
8. Derive change-specific risks.
9. Fill scope boundary: must, may, should_not.

## Return Envelope

```yaml
project_name: <kebab>
generated_at: <ISO-8601>
generated_by: arch-diff-judge
change_request:
  source: evidence/项目总览.yaml#design_intent
  summary: <text>
affected:
  services: []
  modules: []
  apis: []
  data_models: []
  events_messages: []
  permissions: []
  deployments: []
  configs: []
scope_boundary:
  must_change: []
  may_change: []
  should_not_change: []
risks: []
verify_passed:
  structural: false
  semantic: false
  overrides: []
evidence_refs: []
```

## Failure Return

If baseline is insufficient:

```yaml
status: blocked
reason: baseline_incomplete
missing:
  - "dependency graph has no runtime edges for checkout-service"
recommended_next_step: "Run arch-analyze --depth=manifest --force-refresh"
```
