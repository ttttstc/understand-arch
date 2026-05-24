# Mode Pipelines

> This file is the workflow operator map. `arch-workflow` uses it to decide phase order, hard gates, acceptance points, and which artifacts are allowed to be written in each mode.

## Global Phase Contract

Every phase follows the same envelope:

1. Load `state.yaml` and verify `phase` matches the phase about to run.
2. Load prior YAML evidence required by the phase.
3. Run anti-rationalization checks before accepting output.
4. Write artifacts only under `${ARCH_PROJECT_DIR}`.
5. Run structural validation for phase outputs.
6. Append `.metrics.jsonl`.
7. Append `completed_phases[]` and advance `state.yaml.phase`.

Allowed outputs remain descriptive only: `*.md`, `*.yaml`, `*.mmd`, and optional `*.svg|*.png` diagram renders.

Forbidden outputs are rejected at workflow level: Terraform, Helm, DDL, CI workflow files, service scaffolds, OpenAPI client code, and business source code.

## Shared Gates

| Gate | Runs When | Blocking Condition | Recovery |
|---|---|---|---|
| integrity | workflow start | `state.yaml` invalid, append-only artifact missing, schema failure | Use `integrity-recovery-matrix.md` |
| prereq | before mode pipeline | baseline or upstream deliverable missing | Auto-chain when defined, otherwise block |
| hard-gate | after `arch-frame` in design mode | PRD clarity score has 3 or more blocking gaps | Write `PM问题清单.md`, set `awaiting-pm-confirmation` |
| profile-confirmation | after `arch-frame` | `architecture_profile.confirmed_by_user_at` is null | Ask user to confirm or edit profile |
| budget | before heavy subagent phases | user has not accepted scan scope | Show budget and wait |
| option-selection | after `arch-options` | no user-selected option | Wait before ADR/diagram/pack |
| acceptance | workflow end | structural or semantic checklist fails | Retry up to 2, then escalate |

## Onboard Mode

Purpose: create a reusable baseline for a system the user is taking over.

Pipeline:

| Order | Phase | Skill | Inputs | Outputs | Notes |
|---|---|---|---|---|---|
| 1 | frame | `arch-frame` | user brief, repo list, KB path | `evidence/项目总览.yaml` | Load org KB and produce architecture profile |
| 2 | analyze | `arch-analyze --depth=full` | repo paths, project overview | 5 evidence YAML candidates, C4 current-state diagrams | Requires budget confirmation before deep scans |
| 3 | diagram | `arch-diagram` | manifest, dependency graph, current-state model | at least 3 diagrams | Mermaid is acceptable when fireworks is unavailable |
| 4 | pack | `arch-pack --audience=onboarding` | evidence YAML, diagrams | 6 wiki pages | Wiki is derived from evidence, not a new fact source |
| 5 | review | `arch-review --mode=doc` | generated wiki/evidence | acceptance report | Uses internal acceptance checklist |

Required artifact set:

- `state.yaml`
- `evidence/项目总览.yaml`
- `evidence/仓库与组件清单.yaml`
- `evidence/依赖与链路图谱.yaml`
- `evidence/风险与技术债台账.yaml`
- `evidence/决策与证据索引.yaml`
- `wiki/首页.md`
- `wiki/01-系统全景.md`
- `wiki/02-现状架构.md`
- `wiki/03-关键业务链路.md`
- `wiki/04-风险与技术债.md`
- `wiki/05-决策与待办.md`
- `diagrams/` with at least 3 `.mmd|.svg|.png` files

Completion: set `phase=done`, append a `mode_history` record with `readiness=ready|degraded|blocked`.

## Audit Mode

Purpose: evaluate current architecture health and produce decision-ready remediation guidance.

Prereq behavior:

- If no baseline exists, auto-chain onboard with a combined budget notice.
- If baseline exists but commit hashes drift, ask whether to refresh manifest before risk review.

Pipeline:

| Order | Phase | Skill | Inputs | Outputs | Notes |
|---|---|---|---|---|---|
| 1 | frame | `arch-frame` | audit goal, audience, KB | refreshed `项目总览.yaml` context | Do not redefine business scope unless user asks |
| 2 | analyze | `arch-analyze --depth=full` | baseline and selected repos | refreshed manifest, dep graph, risk register | May reuse cached manifest |
| 3 | review | `arch-review --mode=doc` | evidence, ADR, org constraints | `audits/{date}/arch-review.md` | Must include org-conformance |
| 4 | pack | `arch-pack --audience=decision` | review and evidence | `audits/{date}/改造路线图.md` | Recommendations must cite evidence |

Required audit report sections:

- Executive summary
- Top risks sorted by severity
- Technical debt themes
- Architecture drift or conformance findings
- Recommended remediation roadmap
- Explicit non-recommendations

Completion requires no `error` finding without an owner or mitigation.

## Design Mode

Purpose: turn a PRD/change request into a decision record, RFC-level design, implementation plan, and reviewable evidence.

Pipeline:

| Order | Phase | Skill | Inputs | Outputs | Notes |
|---|---|---|---|---|---|
| 1 | frame | `arch-frame` | PRD/change request, KB | `design-docs/{change}/frame.yaml`, `evidence/项目总览.yaml` | May hard-gate on unclear PRD |
| 2 | analyze | `arch-analyze --depth=manifest` | repos and profile | manifest and dependency graph | Auto-run if no baseline exists |
| 3 | judge | `arch-diff-judge` | change request, manifest, dep graph | `design-docs/{change}/影响面.yaml` | Requires structured change request |
| 4 | options | `arch-options` | frame, baseline, impact, org constraints | `options.md`, decision index update | Must produce 2+ options or explain single-option case |
| 5 | decision | user selection | options output | selected option recorded | Required before ADR |
| 6 | adr | `arch-adr` | selected option and evidence | `ADR-NNN-*.md`, decision index update | Append-only |
| 7 | diagram | `arch-diagram` | selected target design | target diagrams | Source must be impact/options/ADR |
| 8 | pack | `arch-pack --audience=dev-implementation` | all upstream outputs | design doc and `实施方案.md` | Implementation plan is descriptive, not code |
| 9 | review | `arch-review --mode=doc` | full design package | `arch-review.md` | No degraded acceptance allowed |

Design hard stops:

- `phase=awaiting-pm-confirmation` means no judge/options/ADR may run.
- `arch-options` cannot be followed by ADR until a user selection is recorded.
- `实施方案.md` must contain all 17 chapters before review can pass.

Required 4 design markdown files:

- `影响面清单.md`
- `模块依赖变化.md`
- `数据模型变更.md`
- `回滚方案.md`

Required 17 implementation-plan chapters:

1. 需求摘要与验收
2. 目标实现架构
3. 受影响服务
4. 接口设计
5. 数据模型
6. 权限安全
7. 关键流程时序
8. 错误降级
9. 配置发布
10. 数据迁移回填
11. 测试计划
12. 可观测性
13. 实施任务拆解
14. 联调发布顺序
15. 兼容性
16. 风险清单
17. 研发注意事项

## Brief Mode

Purpose: repack existing evidence for a target audience without inventing new architecture facts.

Prereq behavior:

- Requires at least one upstream source: onboard wiki, audit report, or design package.
- If no source exists, block and suggest onboard, audit, or design.

Pipeline:

| Order | Phase | Skill | Inputs | Outputs | Notes |
|---|---|---|---|---|---|
| 1 | frame | workflow prompt | audience, format, source package | brief scope | Keep this lightweight; no new project overview unless needed |
| 2 | pack | `arch-pack` | selected evidence and diagrams | `briefs/{audience}-{date}/` | Summary must cite source evidence |
| 3 | diagram | `arch-diagram` optional | existing diagram sources | refreshed diagrams | No diagram from pure prose |
| 4 | review | `arch-review --mode=doc` | brief package | readiness result | Management summary must fit one page |

Audience defaults:

| Audience | Default Format | Required Emphasis |
|---|---|---|
| onboarding | wiki/md | system map, key flows, risks |
| decision | md/html | options, trade-offs, recommendation |
| dev-implementation | md | implementation plan, risks, rollout |
| management | md/pptx | summary, cost/risk, decision ask |

## Insertable Phases

`architecture_profile.recommended_phases` may insert predefined phases after `options` and before `adr`, unless the phase document says otherwise.

v1.0 supported phase:

- `eval-design`: AI/agent/RAG systems; produces `eval-strategy.md`.

Insertable phase outputs must be included in `arch-review --mode=doc` and linked from `决策与证据索引.yaml` when they affect the chosen option.

## Metrics

Each phase appends one JSON Lines entry:

```json
{"ts":"ISO-8601","skill":"arch-analyze","mode":"onboard","inputs_summary":"3 repos, depth=manifest","outputs_paths":["arch/foo/evidence/仓库与组件清单.yaml"],"duration_s":120,"token_estimate":45000,"overrides_used":false,"verify_passed":true}
```

If a phase is skipped because it is cached, still append a metrics line with `duration_s=0` and `inputs_summary` explaining the cache hit.
