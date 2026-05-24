# Implementation Plan 17 Chapters

> `实施方案.md` is a descriptive engineering plan. It must not contain generated source code, DDL, IaC, CI, clients, or service scaffolds.

Every chapter must contain content or `not_applicable: <reason>`.

## Chapters

1. 需求摘要与验收: from `design_intent` and acceptance criteria.
2. 目标实现架构: selected option, ADR, target diagrams.
3. 受影响服务: from `影响面.yaml.affected.services/modules`.
4. 接口设计: API contract changes and compatibility strategy.
5. 数据模型: data model impact, migration, backfill, compatibility.
6. 权限安全: permissions, audit, security and compliance notes.
7. 关键流程时序: sequence/data-flow diagrams and flow steps.
8. 错误降级: failure modes and fallback behavior.
9. 配置发布: feature flags, config, release controls.
10. 数据迁移回填: descriptive migration/backfill plan only.
11. 测试计划: unit, integration, regression, canary, eval if applicable.
12. 可观测性: logs, metrics, traces, alerts, dashboards.
13. 实施任务拆解: tasks by role and rough size.
14. 联调发布顺序: dependency order and milestones.
15. 兼容性: old clients, old data, old events, migration windows.
16. 风险清单: sorted risks and mitigations.
17. 研发注意事项: pitfalls, boundaries, known unknowns.

## Chapter Quality Bar

Each chapter should answer:

- What changes?
- Why is it needed?
- Which evidence supports it?
- What can go wrong?
- How do we verify or rollback?

## Task Format

Implementation tasks are descriptive:

```markdown
- [ ] Add feature flag for new read path
  - Owner: backend
  - Size: M
  - Source: 影响面.yaml#configs.new-read-path
```

Do not include code blocks that implement the task.
