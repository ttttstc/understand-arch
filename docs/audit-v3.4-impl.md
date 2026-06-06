# v3.4 实现验收报告

> 实现人 + 自验收: Codex  
> 分支: `feat/v3.4-impl`  
> 基线: `docs/spec-v3.4.md`  
> 主题: 知识自迭代、Agent-cards、决策回流、历史考古、真增量装配

## 结论

v3.4 全量实现完成。实现范围覆盖 T1-T4: cards 派生层、真增量 planner 装配、CR/ADR 决策回流、git-history 考古、design/impact/senior 上游消费、README/advanced 文档、版本收口。  
本轮未新增 `/arch-cards` 命令,未把 LLM 推断写进 Node,未改 v3.3 CR 14 段结构、pre-grill 或 CR-OPTION 流程,未改 v3.2 出图能力。

## 实现清单

| 项目 | 实现 | 验收 |
|---|---|---|
| Agent-cards schema | `internal/schemas/agent-card.schema.json` | 8 类卡统一结构 |
| cards 派生 | `engine/arch/cards-deriver.mjs` | 8 类卡、反向索引、pin 保护、summary 保留 |
| cards 校验 | `engine/arch/cards-check.mjs` | anchor、source_hash、missing_summary warning |
| cards summary | `agents/arch-card-summarizer.md` + `cards-summary-merge.mjs` | LLM 只产摘要,Node 只合并校验 |
| 真增量 planner | `engine/arch/incremental-planner.mjs` | 装配 UA `isStale/getChangedFiles/analyzeChanges/classifyUpdate/buildFingerprintStore/mergeGraphUpdate` |
| subset merge | `engine/arch/arch-layer-writer.mjs` | subset_mode 按节点 id 替换,其他保留 |
| fingerprint 路径 | `internal/playbooks/analyze/build-fingerprints.mjs` | 写 `specs/repos/<repo_id>/.fingerprint.json`,保留旧路径兼容 |
| 决策回流 | `agents/arch-decision-extractor.md` + `decision-extractor-runner.mjs` | CR/ADR -> proposed constraint,source `cr-derived` |
| history 考古 | `agents/arch-history-miner.md` + `history-miner-runner.mjs` | temporal coupling / hotspot / revert pattern |
| 约束红线 | `constraint.schema.json` + `constraint-check.mjs` | `ai-mined/cr-derived` 不得 confirmed,状态保持 proposed |
| post-merge | `hooks/post-merge` | hooks_enabled 时非阻断触发回流 |
| 上游消费 | `arch-design` / impact / solution / senior prompts | design 优先读 cards,raw graph + arch-layer 兜底 |
| 文档 | README 双语 + `docs/advanced/*` | README 主体零参数泄露 |
| 版本 | package + plugin manifests | `3.4.0-rc1` |

## 确定性验收

| 命令 | 结果 | 摘要 |
|---|---|---|
| `node --check skills\arch-analyze\build-fingerprints.mjs; node --check engine\arch\incremental-planner.mjs; node --check engine\arch\cards-deriver.mjs; node --check engine\arch\cards-check.mjs` | exit 0 | 关键 Node 工具语法通过 |
| `pnpm arch:test` | exit 0 | 10 个测试文件,26 个 case 全绿 |
| `npm run verify` | exit 0 | arch/core/dashboard 测试和 build 全通过 |
| `sh -n hooks\post-merge` | exit 0 | hook shell 语法通过 |
| README 泄露检查 | exit 1 | 6 个禁词无匹配 |

README 泄露检查命令:

```bash
rg -- '--incremental|--since|--full|/arch-cards|agent-cards|pinned\.json' README.md README.zh.md
```

## 增量硬指标实测

实测用临时 fixture 模拟 onboard 增量链路中的确定性阶段:

1. 创建单仓 baseline graph、arch-layer、cards、每仓 `.fingerprint.json`。
2. 修改 1 个源文件 `src/auth.ts` 的函数签名。
3. 运行 `planIncremental`。
4. 使用 `arch-layer-writer.mjs merge` 的 `subset_mode` 合并受影响节点。
5. 重新派生 cards 并统计变更卡片。

实测输出:

```json
{
  "action": "PARTIAL_UPDATE",
  "files_to_reanalyze": ["src/auth.ts"],
  "affected_arch_nodes": [
    "sample::endpoint:login",
    "sample::module:auth"
  ],
  "affected_arch_nodes_count": 2,
  "arch_layer_changed_nodes": 2,
  "cards_changed": 2
}
```

验收结论:

| 指标 | 实测 | 结论 |
|---|---:|---|
| 改 1 源文件 -> affected_arch_nodes ≤ 3 | 2 | 通过 |
| 改 1 源文件 -> arch-layer.json diff ≤ 3 节点 | 2 | 通过 |
| 改 1 源文件 -> cards/agent-cards.json diff ≤ 3 张卡 | 2 | 通过 |

说明:此实测覆盖 `/arch-onboard` 默认增量路径依赖的确定性核心:每仓 fingerprint、planner、反向索引、subset merge、cards 重新派生。真实 Claude 会话中的 LLM 子集重推仍由 `internal/playbooks/enrich/SKILL.md` 调度 subagent,没有移入 Node。

## LLM 通道抽检

| 通道 | 实现 | 铁律 |
|---|---|---|
| card 摘要 | `arch-card-summarizer` 只填 `focused_summary` | Node 只合并 JSON |
| CR/ADR 回流 | `arch-decision-extractor` 抽 proposed constraints | Node 只收集章节/合并写盘 |
| history 解释 | `arch-history-miner` 解释 history 信号 | Node 只跑 git log/统计信号 |
| impact/design | impact/solution/senior 优先读 cards | 输出 shape 和 CR 结构不变 |

## 文档验收

| 文件 | 验收 |
|---|---|
| `README.md` | 增加一句知识自迭代描述;未出现 6 个禁词 |
| `README.zh.md` | 增加一句知识自迭代描述;未出现 6 个禁词 |
| `docs/advanced/onboard-flags.md` | 高阶参数独立说明,README 不引用 |
| `docs/advanced/cards-pinning.md` | pin 机制独立说明,README 不引用 |
| `skills/arch-audit/SKILL.md` | 自迭代来源分布:CR 回流/git 历史/代码考古/访谈 |

## 回归保护

- v3.3 CR 14 段标题、pre-grill、CR-OPTION 流程未改。
- v3.2 `/arch-diagram`、fireworks vendor、diagram dispatcher 未改。
- 未新增 `/arch-cards` 命令。
- `README.md` / `README.zh.md` 未暴露内部参数或 cards 细节。
- `ai-mined` / `cr-derived` 仍不能自标 confirmed。
- UA incremental 原语只被装配复用,未重写。

## 已知边界

- SKIP 路径采用保守设计:cards-deriver 在 `source_hash` 不变时保留旧 summary;若 `missing_summary` 或 stale 出现,`arch-enrich` 只对受影响卡触发 cards summary。复杂场景可由 audit 兜底补齐。
- history runner 的确定性兜底会产 observed/proposed 信号;更高质量的语义解释仍依赖 `arch-history-miner` subagent。
- 本轮实测使用 fixture 验证增量硬指标;真实大型仓 dogfood 应在终审后单独跑完整 `/arch-onboard` 会话。
