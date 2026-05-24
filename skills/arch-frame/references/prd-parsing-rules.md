# PRD Parsing Rules

> `arch-frame` turns ambiguous product or change input into `项目总览.yaml`. This file defines what to extract, how to treat uncertainty, and when to stop for PM confirmation.

## Supported Inputs

v1.0 accepts:

- Markdown files.
- Plain text pasted in conversation.
- Multiple markdown files where one is the primary PRD and others are appendices.
- Issue text copied into the prompt.

v1.0 does not directly parse `.docx`, Confluence URLs, Google Docs, Jira links, or screenshots. Ask the user to provide markdown export or pasted text.

## Output Target

All parsed fields land in `evidence/项目总览.yaml` and must satisfy `internal/schemas/项目总览.schema.json`.

Required sections:

- `design_intent`
- `architecture_profile`
- `org_constraints`
- `evidence_refs`

## Extraction Order

Parse in this order to avoid premature design:

1. Business intent: why now, business goal, user value.
2. Scope: in-scope behavior and explicit non-goals.
3. Acceptance: measurable acceptance criteria.
4. NFRs: reliability, cost, latency, security, compliance.
5. Constraints: hard constraints and soft preferences.
6. Assumptions: statements that must be confirmed.
7. Candidate impacted areas: modules, services, data, APIs, upstream/downstream dependencies.
8. Evidence references: source file, line or line range, commit.

Do not infer solution architecture in this step. That belongs to `arch-options`.

## Field Mapping

| PRD Signal | Target Field | Notes |
|---|---|---|
| "目标", "Why", "Problem", "Goal" | `business_goals[]` | Split multi-goal paragraphs into separate goals |
| "用户价值", "User value", "Outcome" | `user_value` | One concise statement |
| "范围", "Scope", "Must support" | `in_scope[]` | Behavior or capability, not implementation |
| "不做", "Out of scope", "Non-goals" | `non_goals[]` | Must be explicit; missing is a clarity signal |
| "验收", "Acceptance", "Done when" | `acceptance_criteria[]` | Must be measurable where possible |
| "SLO", "latency", "QPS" | `nfrs.latency` / `nfrs.reliability` | Preserve numbers and units |
| "成本", "预算", "token cost" | `nfrs.cost` | Include ceiling or optimization target |
| "权限", "安全", "PII" | `nfrs.security` / `nfrs.compliance` | Mark missing details as assumptions |
| "必须", "不可", "deadline" | `constraints.hard[]` | Hard constraints cannot be traded off silently |
| "最好", "倾向", "prefer" | `constraints.soft[]` | Soft constraints can be traded off |

## Evidence Rules

Every non-empty extracted item must have an evidence reference.

Evidence reference format:

```yaml
evidence_refs:
  - file: docs/prd/payment-channel.md
    line: "12-18"
    commit: 1a2b3c4
```

If input is pasted text, use a synthetic source name:

```yaml
file: conversation://user-prd-2026-05-24
line: "1-20"
commit: external
```

If a field is required but the PRD does not contain it, do not invent it. Use an empty list or null where schema permits, and create a blocking or warning question in `PM问题清单.md`.

## Assumption Rules

Create an assumption when a statement is necessary for design but not confirmed.

Good assumption:

```yaml
- text: "历史查询默认回看 90 天，因为 PRD 只说支持历史查询。"
  requires_confirmation: true
  pm_answered: false
  answer: null
```

Bad assumption:

```yaml
- text: "Use Kafka for async processing."
```

That is a design choice, not a frame assumption.

## Non-Goals Rules

`non_goals` is mandatory in practice. If the PRD lacks it:

- Ask explicitly: "这次明确不做什么?"
- Add a clarity finding: `non_goals_missing`.
- Include it in `PM问题清单.md` when design mode has 3 or more clarity findings.

Non-goals should prevent scope creep:

- "不改现有计费规则。"
- "不迁移历史数据，只补新字段。"
- "不改变外部 API 路径。"

## NFR Rules

NFRs may be null only when genuinely unspecified. Null NFRs are clarity findings when the dimension matters to the change.

Examples:

- Payment, identity, health, or financial data: `security` and `compliance` matter.
- User-facing online request path: `latency` and `reliability` matter.
- LLM/RAG flow: `cost`, `latency`, and `eval quality` matter. Store eval concerns in `architecture_profile.primary_concerns`.
- Batch/internal admin flow: latency may be null if not user-facing.

## Ambiguity Markers

Treat these as ambiguity signals:

- "支持历史查询" without time range.
- "低延迟" without percentile and threshold.
- "高可用" without SLO/RTO/RPO.
- "兼容旧逻辑" without compatibility surface.
- "支持多租户" without tenant isolation model.
- "用现有权限" without named permission model.
- "接入上游" without upstream owner or contract.

## Refusal Boundary

If the user asks `arch-frame` to generate implementation code, DDL, IaC, CI files, or service scaffolding, refuse and explain that this suite produces architecture deliverables only. Offer to produce design intent or implementation plan instead.
