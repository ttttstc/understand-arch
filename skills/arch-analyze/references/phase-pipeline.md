# v2.0 Phase 0-8 Pipeline

本文件是 `arch-analyze` 的执行参考,编号必须严格匹配 `docs/spec-v2.0.md` §3.7。

## Phase 0 Pre-flight

- 输入:`specs/repos.yaml`、`state.yaml`、rules 摘要、已有 fingerprint。
- 工具:`engine/bin/preflight.js`。
- 责任:决定 full/incremental、校验 repo path、检测 Python/Node、准备 intermediate。
- 输出:运行决策与仓库列表。
- 禁止:写 graph/wiki/CR/ADR。

## Phase 1 SCAN

- subagent:`arch-project-scanner`。
- 工具:UA `scan-project.mjs` + `extract-import-map.mjs`。
- 输出:`intermediate/scan-result-{repo_id}.json`。
- 验收:`graph-reviewer phase-1-scan` 或 `validate-phase-1.js`。
- 注意:确定性可完成的文件枚举、语言识别、importMap 不得交给 LLM 重新实现。

## Phase 1.5 BATCH

- 工具:`engine/bin/compute-batches.js`。
- 输入:`intermediate/scan-result-{repo_id}.json`。
- 输出:`intermediate/batches-{repo_id}.json`。
- 责任:按 import community、目录、非代码语义原子切片。
- 注意:这是 1.5,不得写成 Phase 2。

## Phase 2 ANALYZE

- subagent:`arch-file-analyzer`。
- 输入:`batches-{repo_id}.json` + `batchImportData`。
- 输出:`intermediate/batch-{n}.json`。
- 并发:最多 M=5。
- 责任:产 batch-level GraphNode/GraphEdge。
- 注意:只写仓内事实,跨仓 edge 不在本阶段写。

## Phase 3 ASSEMBLE

- 工具:`merge-batch-graphs.py` + `extract-structure.js` + `build-fingerprints.js` + v2 adapter。
- 输入:所有 `batch-{n}.json`。
- 输出:`intermediate/assembled-graph-{repo_id}.json`。
- 验收:`graph-reviewer phase-3-assemble`。
- 责任:去重、修正 id、过滤 dangling edge、生成 fingerprint baseline。

## Phase 4 STRUCTURE

- subagent:`arch-architecture-analyzer`。
- 输入:`assembled-graph-{repo_id}.json`、目录树、rules。
- 输出:`intermediate/layers-{repo_id}.json`。
- 验收:`graph-reviewer phase-4-structure`。
- 责任:识别 layer、结构风险、边界问题。

## Phase 5 DOMAIN

- subagent:`arch-domain-analyzer`。
- 输入:graph、layers、README、cross-repo context。
- 输出:`intermediate/domain-{repo_id}.json` 与跨仓 capability 候选。
- 验收:`graph-reviewer phase-5-domain`。
- 责任:业务能力、flow、domain node 候选。

## Phase 6 QUALITY

- subagent:`arch-quality-analyzer`。
- 输入:graph、layers、domain、rules。
- 输出:`intermediate/quality-{repo_id}.json`。
- 验收:`graph-reviewer phase-6-quality`。
- 责任:NFR、risks、technical_debt 候选。
- 硬规则:所有 LLM 推断字段必须有 `confidence + evidence_refs`。

## Phase 7 REVIEW

- subagent:`arch-graph-reviewer`。
- mode:`phase-7-final`。
- 输出:`intermediate/review-phase-7-{repo_id}.json`。
- 责任:最终仓内 graph readiness 自审。
- 注意:Phase 7 不是 FINALIZE,不得跳过。

## Phase 8 FINALIZE

- 工具:`engine/bin/finalize-cross-repo.js` + `engine/bin/write-outputs.js`。
- 输出:`specs/repos/{repo_id}/knowledge-graph.json`、`.fingerprint.json`、`specs/cross-repo.json`。
- 验收:`graph-reviewer phase-8-cross-repo`。
- 责任:仓内/跨仓边切分、repos 镜像、cross-repo graph 完整性。

## 错误处理

- 任一 phase 失败先保留 intermediate。
- producer 失败可用 reviewer findings 重试 2 次。
- 第 3 次失败进入 refiner loop:retry/manual fix/override/abort。
- override 必须写 `state.yaml.overrides[]`,reason 不少于 20 字符。
