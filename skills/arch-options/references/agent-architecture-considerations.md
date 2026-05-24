# Agent Architecture Considerations

> Load this reference when `architecture_profile` includes LLM application, RAG, multi-agent, tool workflow, or eval quality concerns.

## Treat Agent Design As Architecture

Agent systems have architecture surfaces beyond code:

- prompts;
- tools and tool schemas;
- model/provider routing;
- memory;
- retrieval;
- guardrails;
- evals;
- human handoff;
- cost and latency budgets.

These count in the four forced tradeoff columns.

## Impact Scope Examples

- Tools: add/modify/deprecate tool contract.
- Retrieval: change chunking, index, reranking, source permissions.
- Memory: add session memory or long-term store.
- Guardrails: add policy checks or refusal paths.
- Model routing: introduce fallback or provider switch.
- Eval: create golden set or regression suite.

## Module Dependency Changes

Agent options should name:

- orchestrator dependencies;
- tool service dependencies;
- retrieval/index dependencies;
- model provider dependencies;
- human approval dependencies.

Watch for "tool soup": too many tools exposed without clear ownership or error semantics.

## Data Model Changes

For AI systems, data models include:

- vector index schema;
- document metadata;
- conversation memory;
- trace/eval records;
- prompt/version registry;
- tool call logs.

Backfill may mean re-embedding, re-indexing, or replaying eval traces.

## Rollback Strategy

Agent rollback must cover:

- prompt version rollback;
- model/provider rollback;
- retrieval index rollback;
- memory compatibility;
- eval regression threshold;
- deterministic fallback path if agent behavior is unsafe.

"Revert code" is not enough if prompts, indexes, or provider config changed.

## Option Patterns

Useful option shapes:

- deterministic workflow first, agent only for ambiguous cases;
- single agent with narrow tools;
- supervisor-worker with bounded worker roles;
- RAG with offline eval gate;
- human-in-the-loop for high-risk actions.

High-risk option shapes:

- recursive agents without budget/depth limits;
- tools with side effects and no idempotency;
- unversioned prompts;
- RAG without source permissions;
- no eval before rollout.

## Recommendation Checks

For any recommended agent option, require:

- eval strategy or inserted `eval-design` phase;
- guardrail story;
- tool error semantics;
- cost/latency budget;
- fallback/rollback path;
- evidence link to business acceptance criteria.
