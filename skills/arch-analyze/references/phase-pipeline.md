# v2.0 Phase 0-8 Pipeline

0. PREPARE
1. SCAN
2. BATCH
3. ANALYZE
4. ASSEMBLE
5. STRUCTURE
6. DOMAIN
7. QUALITY
8. FINALIZE

所有 phase 输出先落 `intermediate/`,最终由 Phase 8 写入 `specs/repos/{repo_id}/knowledge-graph.json` 与 `specs/cross-repo.json`。

