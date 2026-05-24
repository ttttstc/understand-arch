# Clarity Detection Rubric

> Design mode must not proceed when the PRD is too unclear. This rubric turns ambiguity into a countable hard gate.

## Hard Gate Rule

In design mode, evaluate 6 categories.

Each category can contribute at most 1 blocker point.

If blocker points are 3 or more:

- Write `PM问题清单.md`.
- Return `readiness=blocked`.
- Set workflow `phase=awaiting-pm-confirmation`.
- Do not run `arch-diff-judge`, `arch-options`, `arch-adr`, `arch-diagram`, or `arch-pack`.

## Categories

### C1. Required Field Missing

Score 1 if any of these are absent:

- Business goal.
- In-scope behavior.
- Acceptance criteria.

Blocking examples:

- "做一个新能力" without why or success definition.
- "优化现有流程" without stating which workflow changes.

Question shape:

- "这次变更的业务目标是什么? 请用 1-3 条可验收结果描述。"

### C2. Acceptance Not Quantified

Score 1 if acceptance criteria exist but cannot be verified.

Blocking examples:

- "性能更好。"
- "体验更顺滑。"
- "结果更准确。"

Question shape:

- "性能目标是哪个指标、哪个分位、阈值是多少? 例如 p95 < 300ms。"
- "准确率如何验收? golden set、人工抽检、线上指标还是 A/B?"

### C3. Important NFR Unspecified

Score 1 when a relevant NFR dimension is missing.

Relevance guide:

| Change Type | Relevant NFRs |
|---|---|
| online user path | latency, reliability, observability |
| payment/account/security | security, compliance, reliability |
| migration | rollback, compatibility, data integrity |
| LLM/RAG/agent | eval quality, cost, latency, guardrails |
| data model change | migration, backfill, consistency |

Question shape:

- "这条链路的可用性/RTO/RPO 有要求吗?"
- "LLM 调用成本是否有单次或月度预算上限?"

### C4. Non-Goals Missing or Vague

Score 1 if the PRD lacks explicit non-goals or uses vague language.

Blocking examples:

- No out-of-scope section.
- "尽量不影响老逻辑" without naming what must not change.
- "暂不考虑太多兼容问题."

Question shape:

- "这次明确不做什么? 请列出至少 2-5 条边界。"
- "哪些 API、数据、权限、流程不能改?"

### C5. Ambiguous Sentence

Score 1 if one or more key sentences have multiple plausible meanings.

Blocking examples:

- "支持历史查询" without time range.
- "复用现有权限" without permission names.
- "接入上游订单" without upstream owner or API.
- "灰度发布" without rollout percentage or rollback trigger.

Question shape:

- "这里的『历史』指多久?"
- "这里的『现有权限』具体是哪组角色/权限点?"

### C6. Critical Dependency Unknown

Score 1 if design depends on a missing upstream/downstream fact.

Blocking examples:

- Upstream API owner unknown.
- Event contract unknown.
- Database ownership unknown.
- Required platform capability not confirmed.
- Third-party provider SLA unknown.

Question shape:

- "依赖的上游系统是谁负责? 合约路径或文档在哪里?"
- "这个能力依赖的平台组件是否已存在? 如果没有，是否在本次范围内?"

## Warning Findings

Warnings do not count toward hard gate unless they materially affect architecture shape.

Examples:

- Preferred naming not specified but naming KB exists.
- Nice-to-have metric missing.
- Exact launch date unknown but rollout window is flexible.

Warnings should still appear in `PM问题清单.md` under `Warnings`.

## Scoring Output

Produce an internal scoring block before deciding:

```yaml
clarity_score:
  blockers:
    required_field_missing: true
    acceptance_not_quantified: true
    important_nfr_unspecified: false
    non_goals_missing: true
    ambiguous_sentence: false
    critical_dependency_unknown: false
  blocker_count: 3
  readiness: blocked
```

The scoring block does not have to be persisted in final project overview, but it must drive `PM问题清单.md` and workflow state.

## Override Behavior

If the user overrides a hard gate:

- Keep unanswered assumptions in `design_intent.assumptions`.
- Record override in `state.yaml.overrides`.
- Add a risk to downstream design artifacts: "Design proceeds with unresolved PM assumptions."
- `arch-review --mode=doc` must treat unresolved blocking assumptions as at least `warning`, and as `error` if they affect rollback, security, compliance, or data integrity.

## Recheck

After PM answers arrive:

1. Map each answer to the originating category.
2. Update `design_intent`.
3. Remove answered questions from `PM问题清单.md`.
4. Recalculate blocker count.
5. Continue only when blocker count is less than 3, or when user override is recorded.
