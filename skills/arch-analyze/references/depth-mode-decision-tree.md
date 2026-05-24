# Depth Mode Decision Tree

> `arch-analyze` has four depths. Pick the cheapest depth that satisfies the user's goal, then escalate only when the workflow or user needs more evidence.

## Depths

| Depth | Outputs | Cost | Use When |
|---|---|---|---|
| `manifest` | repository/component inventory and dependency map | low | baseline, design prereq, quick system map |
| `model` | manifest plus current C4 model and diagrams | medium | onboarding, current-state diagrams |
| `risk` | manifest plus risk and tech debt register | medium/high | audit, refactor discussion, fragility review |
| `full` | manifest, model, risk | high | full onboard or architecture health baseline |

## Workflow Calls

Workflow should pass depth explicitly.

| Workflow Mode | Default Depth | Reason |
|---|---|---|
| onboard | `full` | new maintainer needs baseline, model, and risk |
| audit | `full` | health review needs risk and current-state model |
| design | `manifest` | impact analysis needs baseline, not full audit by default |
| brief | none | read existing outputs; do not scan unless user asks |

## Standalone Trigger Rules

Use trigger phrases only when workflow did not pass a depth:

| User Intent | Depth |
|---|---|
| "服务清单", "仓库地图", "manifest", "测绘一下" | `manifest` |
| "画现状 C4", "拓扑图", "系统怎么跑" | `model` |
| "找风险", "找耦合", "技术债", "哪里不能动" | `risk` |
| "全面分析", "摸熟", "接手", "体检" | `full` |

If ambiguous, default to `manifest`.

## Escalation Rules

Escalate from `manifest` to deeper modes only when one of these is true:

- User asks for C4/current-state diagrams.
- User asks for risk, tech debt, drift, fragility, or refactor readiness.
- Workflow is onboard or audit and budget is accepted.
- `arch-diff-judge` cannot determine impact because manifest lacks key ownership or dependencies.

## Budget Prompt

Before `model`, `risk`, or `full`, show:

```text
计划:
  depth: risk
  repositories: 4
  estimated time: ~8-15 min
  estimated tokens: ~80K
  subagents: 4 risk scan + 1 synthesizer
继续? 回车继续 / 输入 repo 名缩小范围 / manifest-only / abort
```

Do not run deep depth without user confirmation.

## External Baseline

If user provides `--baseline-source=<path>`:

- Markdown/wiki source: adapter subagent extracts best-effort YAML.
- JSON source: v1.1 only; v1.0 should ask user to provide markdown or run scan.
- Incomplete fields must be marked `unknown_from_external_kb`.

External baseline does not remove the evidence requirement. Every extracted fact still needs source references.
