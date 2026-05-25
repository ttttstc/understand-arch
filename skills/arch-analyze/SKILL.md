---
name: arch-analyze
description: |
  代码仓架构扫描与 specs 刷新器。把代码仓现状转成 `specs/baseline.yaml`、`quality.yaml`、`risks.yaml`、`decisions.yaml`、`traceability.yaml` 以及稳定 Mermaid 图。扫描算法借鉴 Understand-Anything 的分层思路，但产出完全采用 understand-arch 自己的标准。支持 baseline refresh 与 drift audit。

  触发词: 扫一下架构 / refresh specs / 建基线 / 更新基线 / drift audit / 看看代码和 specs 偏了没

  本 skill 不设计未来方案，不写代码，不直接产最终 brief。
---

# arch-analyze

## 角色定位

- 负责“系统现在是什么样”。
- 负责维护 `specs/` 的结构化事实源。
- 负责判断 `specs` 是否可能过期。

## 输入

- 目标仓路径
- `${ARCH_PROJECT_DIR}`
- `mode`:
  - `baseline-refresh`
  - `drift-audit`
  - `targeted-refresh`
- 可选 `paths` 或 `repos`

## 输出

- `specs/baseline.yaml`(含 `capabilities_index` 索引字段同步)
- `specs/capabilities.yaml`(业务能力地图,新增)
- `specs/quality.yaml`
- `specs/risks.yaml`
- `specs/decisions.yaml`(仅索引字段;ADR 正文归 arch-adr)
- `specs/traceability.yaml`
- `specs/diagrams/*.mmd`

`generated/overview.md` 归 `arch-pack`,不由本 skill 产。

## 扫描算法

遵循 5 段式：

1. `project scanner`
   - 扫仓库树、语言、包管理、入口、配置、测试、部署线索
   - **同时估算规模**: 文件数 + token 估算,据此决定是否启用多 agent(见下)
2. `file analyzer`
   - 对关键文件产结构化摘要
   - **大仓必须多 agent 切片**(详见 `references/subagent-orchestration.md`)
3. `architecture analyzer`
   - 聚合组件、依赖、接口、数据模型、部署单元、关键链路
   - 多 agent 模式下,本阶段只读子任务返回的 `scan-shard.schema.json` yaml,不读原始代码
4. `graph reviewer`
   - 检查孤立节点、悬挂边、命名不稳定、证据缺失
5. `specs writer`
   - 写入自己的 schema-locked YAML

原则：

- 确定性工作优先
- LLM 只做分层、归纳、命名、风险解释
- 不依赖外部工具目录、CLI 或 JSON 格式
- **子任务和主上下文之间只走 schema-locked yaml**,不传自然语言摘要

## 多 agent 启用门槛(防上下文溢出)

| 项目规模 | 策略 |
|---|---|
| `src 文件数 ≥ 60` 或 `估算 token ≥ 50k` | **必须**多 agent;`Project Scanner` 阶段就按项目类型切片(monorepo 按 package / 单仓按顶层子目录),每片 ≤50 文件且 ≤30k token |
| 30-60 文件且 < 50k token | 主上下文单跑;中途撞 token 上限再回退到切片 |
| < 30 文件 | 主上下文单跑;切片反而开销大于收益 |
| `targeted-refresh` / `drift-audit` | 主上下文单跑 |

具体切片规则、子任务 prompt 模板、主上下文聚合算法、并发上限、失败降级,见 `references/subagent-orchestration.md`。

## Freshness 判定

优先使用 Git：

1. 读取 `specs/baseline.yaml.last_scanned_commit`
2. 比较当前 commit
3. 分析中间 diff 是否命中架构敏感文件
4. 给出:
   - `fresh`
   - `possibly_stale`
   - `stale`
   - `unknown`

无 Git 时：

- 检查 `evidence_refs`
- 检查 4+1 coverage
- 检查 known unknowns
- 检查 owner 缺口
- 检查风险/技术债更新时间

## 硬规则

1. `specs/baseline.yaml` 必须覆盖 4+1 视图所需事实。
2. 所有架构判断都必须带 `evidence_refs`。
3. `freshness_status` 必须显式写入。
4. 不能用“看起来没变”替代 diff 或证据判断。
5. `drift-audit` 只有在 audit 或用户明确要求时才跑。

## 验收

- 所有 `specs/*.yaml` 通过对应 schema
- `baseline.yaml` 含 `last_scanned_commit` 与 `view_coverage`
- `risks.yaml` 可支持风险/技术债审视
- 各 `specs/*.yaml` 不发明超出代码事实的字段(`overview.md` 不再由本 skill 负责;归 arch-pack)

## 降级

- Git 不可用：`freshness_status=unknown`
- 语言不支持深解析：保留文件树与依赖线索，标注 best effort
- 仓库过大：建议限定目录或改 targeted refresh

## Write Scope

完整定义见 `internal/tool-contracts/write-scope.yaml#skills.arch-analyze`。

### baseline-refresh mode

- ✅ 可写: `specs/baseline.yaml`(含 `capabilities_index` 索引同步) · `capabilities.yaml`(新增) · `quality.yaml` · `risks.yaml` · `traceability.yaml` · `diagrams/*.mmd`;`specs/decisions.yaml` 仅索引字段(append-only,不修改既有条目)
- ❌ 禁写: `generated/**`(归 arch-pack) · `decisions/ADR-*.md`(归 arch-adr) · `change-requests/**` · `state.yaml`(走 state_delta)

### drift-audit mode

- 完全只读:`${CODE_REPO}/**` + `specs/**`
- 不落盘任何文件;findings 通过 returns_to_workflow 传给 arch-review

### state_delta(返 workflow 合并)

```yaml
state_delta:
  current_phase: baseline_refresh|drift_audit
  status: idle|running|completed|blocked
  kb_loaded: {...}
  history_append:
    ts: "..."
    skill: arch-analyze
    action: baseline_refreshed     # 或 drift_audited / targeted_refreshed
    status: ok                     # 或 degraded / blocked
    ref: {scanned_files: N, components_found: M, freshness_status: stale|fresh|...}
```

## 参考

- `docs/spec-v1.0.md`
- `internal/schemas/specs-*.schema.json`
- `internal/tool-contracts/write-scope.yaml`
- `internal/acceptance/onboard.yaml`
- `references/scanner-playbook.md`
- `references/freshness-rules.md`
- `references/architecture-composition-rubric.md`
- `references/risk-and-debt-rubric.md`
- `references/capabilities-rubric.md`
- `references/subagent-orchestration.md`
- `internal/schemas/specs-capabilities.schema.json`
- `internal/schemas/scan-shard.schema.json`
