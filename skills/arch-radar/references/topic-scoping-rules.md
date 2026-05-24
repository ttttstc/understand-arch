# Topic Scoping Rules

> Research topics that are too broad produce mush. Narrow them before subagent work.

## Too Broad

Examples:

- "AI architecture"
- "microservices best practices"
- "database choice"
- "DevOps platform"

Ask for narrowing by:

- decision to make;
- system context;
- scale;
- constraints;
- candidate list;
- time horizon.

## Good Scope

Examples:

- "Compare pgvector, Milvus, and Elasticsearch vector search for a 2M-document internal RAG system."
- "Evaluate blue-green vs canary rollout for a payments microservice with strict rollback."
- "Compare Temporal vs custom queue workers for long-running order workflows."

## Scoping Prompt

```text
这个 radar 题目太宽。为了给出可验证对标，请选一个决策范围:
1. 技术候选 A/B/C 对比
2. 某个架构模式是否适合当前系统
3. 某类工具/平台的短名单

请补充: 规模、约束、已有候选、必须排除的方案。
```

## When To Proceed Anyway

Proceed with broad research only if the user explicitly asks for a landscape scan. Mark output:

```yaml
degraded: true
degraded_reason: broad_landscape_scan
```
