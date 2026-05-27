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

0. PREPARE:加载 repos.yaml、rules 摘要、state 与已有 fingerprint。
1. SCAN:确定性扫描文件树、语言、包管理、入口、配置、接口、数据、部署线索。
2. BATCH:按 repo 内目录或 package 切片,每片控制在可审范围。
3. ANALYZE:调用 4 个复刻 subagent 分析文件、架构、领域线索。
4. ASSEMBLE:合并 batch 输出为仓内 graph 草稿。
5. STRUCTURE:识别 layers 与结构风险。
6. DOMAIN:抽取 capabilities、flows、domain nodes。
7. QUALITY:抽取 NFR、风险、技术债,所有 LLM 推断字段必须带 `confidence` 与 `evidence_refs`。
8. FINALIZE:评审后写 `specs/repos/{repo_id}/knowledge-graph.json`、`.fingerprint.json`,并合成 `specs/cross-repo.json`。

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
