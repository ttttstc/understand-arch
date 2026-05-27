---
name: arch-analyze
description: |
  v2.0 内部扫描器。读取 `.understand-arch/{project}/specs/repos.yaml`,按仓运行 Phase 0-8,
  生成分仓 `knowledge-graph.json`、分仓 fingerprint 与跨仓 `cross-repo.json`。
---

# arch-analyze

## 定位

`arch-analyze` 是事实层唯一写入者。它回答“系统现在是什么样”,不生成 wiki,不设计未来方案,不写 ADR/CR 正文。

## 输入

- `.understand-arch/{project}/specs/repos.yaml`
- 模式:`full`、`targeted-refresh`、`fingerprint-check`、`drift-audit`
- 可选 repo id 列表与 paths 过滤

## Phase 0-8

0. Pre-flight:加载 repos.yaml、rules 摘要、state、已有 fingerprint,决定 full/incremental。
1. SCAN:调度 `arch-project-scanner`,写 `intermediate/scan-result-{repo_id}.json`。
1.5. BATCH:运行 `engine/bin/compute-batches.js`,写 `intermediate/batches-{repo_id}.json`。
2. ANALYZE:调度 `arch-file-analyzer` 并行分析 batch,写 `intermediate/batch-{n}.json`。
3. ASSEMBLE:运行 `merge-batch-graphs.py` + v2 adapter,写 `intermediate/assembled-graph-{repo_id}.json`。
4. STRUCTURE:调度 `arch-architecture-analyzer`,写 `intermediate/layers-{repo_id}.json`。
5. DOMAIN:调度 `arch-domain-analyzer`,写 `intermediate/domain-{repo_id}.json`。
6. QUALITY:调度 `arch-quality-analyzer`,写 `intermediate/quality-{repo_id}.json`;所有 LLM 推断字段必须带 `confidence` 与 `evidence_refs`。
7. REVIEW:调度 `arch-graph-reviewer --mode=phase-7-final`,写 `intermediate/review-phase-7-{repo_id}.json`。
8. FINALIZE:运行 `finalize-cross-repo.js` + `write-outputs.js`,写 `specs/repos/{repo_id}/knowledge-graph.json`、`.fingerprint.json` 与 `specs/cross-repo.json`。

## Subagent Dispatch 模板

### Phase 1 SCAN

Dispatch a subagent using the `arch-project-scanner` agent definition.

Append the following additional context:

```text
Project: {projectName} — {projectDescription}
Workspace: {workspace}
Repo id: {repo_id}
Repo root: {repoRoot}
README(first 3000 chars): {README_CONTENT}
Manifest: {MANIFEST_CONTENT}
Rules summary: {rulesSummary}
```

Pass these parameters:

```text
Run Phase 1 SCAN for repo {repo_id}.
Use UA deterministic scanner tools.
Write output to {workspace}/intermediate/scan-result-{repo_id}.json.
Do not write graph/wiki/CR/ADR.
```

### Phase 2 ANALYZE

Dispatch a subagent using the `arch-file-analyzer` agent definition.

Append the following additional context:

```text
Project: {projectName} — {projectDescription}
Repo id: {repo_id}
Batch: {batchIndex}/{batchTotal}
Batch import data: {batchImportData}
Cross-batch neighbors: {neighbors}
Rules summary: {rulesSummary}
```

Pass these parameters:

```text
Analyze this batch and produce v2 GraphNode/GraphEdge objects.
Project root: {repoRoot}
Output: {workspace}/intermediate/batch-{batchIndex}.json
All node ids must use {repo_id}:: prefix.
Only emit repo-local edges.
```

### Phase 4 STRUCTURE

Dispatch a subagent using the `arch-architecture-analyzer` agent definition.

```text
Analyze {workspace}/intermediate/assembled-graph-{repo_id}.json.
Use directory structure, imports, fileCategory and rules to derive layers.
Write {workspace}/intermediate/layers-{repo_id}.json.
```

### Phase 5 DOMAIN

Dispatch a subagent using the `arch-domain-analyzer` agent definition.

```text
Read graph + layers + README + cross-repo context.
Infer capabilities, flows and domain nodes with confidence/evidence_refs.
Write {workspace}/intermediate/domain-{repo_id}.json.
```

### Phase 6 QUALITY

Dispatch a subagent using the `arch-quality-analyzer` agent definition.

```text
Read graph + layers + domain + rules.
Infer quality_attributes, risks and technical_debt candidates.
Every inferred item must include confidence and evidence_refs.
Write {workspace}/intermediate/quality-{repo_id}.json.
```

### Phase 7 REVIEW

Dispatch a subagent using the `arch-graph-reviewer` agent definition.

```text
Review Phase 7 final repo graph readiness for {repo_id}.
Mode: phase-7-final
Inputs: scan-result, batches, assembled graph, layers, domain, quality, warnings.
Write {workspace}/intermediate/review-phase-7-{repo_id}.json.
```

## Engine 调用

当前 v2 engine fork 自 `D:\AI\workspace\understand-anything-upstream`。入口位于 `engine/bin/`:

- `scanner.js --workspace .understand-arch/{project}`:端到端生成分仓 graph、fingerprint、cross-repo graph。
- `extract-structure.js <input.json> <output.json>`:包装 UA `extract-structure.mjs`。
- `extract-import-map.js <input.json> <output.json>`:包装 UA `extract-import-map.mjs`。
- `merge-batch-graphs.py` / `merge-subdomain-graphs.py`:来自 UA 原脚本。
- `validate-phase-1.js` / `validate-phase-3.js`:确定性验收。
- `finalize-cross-repo.js` / `write-outputs.js`:v2 输出写入辅助。
- `analyze-workspace.js`:读 repos.yaml,生成分仓 graph、fingerprint、cross-repo graph,并做保守的确定性 cross-edge 推断。

运行前应先执行 `npm run verify`,它会 build forked core 并跑 v2 smoke test。

## 多仓规则

- 所有 node id 必须是 `{repo_id}::{local-id}`。
- 仓内 edge 写入对应 repo graph。
- 跨仓 edge 写入 `cross-repo.json#cross_edges`,且 `cross_repo: true`。
- 确定性 cross-edge 推断只在文件内容明确引用其它 repo id、`@repo/...`、`repo/...` 或 remote basename 时触发;不得凭空猜测跨仓依赖。
- 单仓必须走同一套路径,N=1 只是 repos.yaml 里只有一个仓。

## 写权限

见 `internal/tool-contracts/write-scope.yaml#skills.arch-analyze`。允许写 `specs/repos/**`、`specs/cross-repo.json`、`specs/repos.yaml` commit hash 镜像与 `.metrics.jsonl`;禁止写 wiki、decisions、change-requests。
