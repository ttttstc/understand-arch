---
name: arch-audit
description: |
  审视当前 specs/ 是否完整、可信、过期。默认只读 specs/,不重扫代码仓。产 generated/audit/{date}-健康度.md 集成视图(评分 + Top 风险 + 待答问题 + KB 漂移 + 反模式命中 + 改造路线图)。freshness_status=stale|unknown 时用中文建议 refresh;用户授权后可跑 drift audit 真实扫代码对比。

  触发词: 审视架构 / 审计 / 健康度 / 看看 specs 过没过期 / refresh 要不要跑 / 架构体检 / drift audit / /arch-audit

  本 skill 不修问题,只识别问题。
---

# arch-audit — 审视 specs 可信度与新鲜度

## 角色

- 用户级入口,直接触发 audit 流程
- 自己编排 audit 链路;共享逻辑读 `internal/orchestration/playbook.md`
- 维护 `state.yaml`(本 skill 活跃期间作为单 writer)
- **只识别问题,不修问题**(不允许写 specs / change-requests / decisions)

## 输入

- `${ARCH_PROJECT_DIR}`
- 可选 `--drift`(用户已确认要跑全仓 drift)
- 可选 `--no-ua`

## 输出

| 路径 | 何时产 |
|---|---|
| `generated/audit/{date}-健康度.md`(10 段集成视图,≤250 行) | 总是 |
| `state.yaml`(`history` append + freshness 更新) | 总是 |
| 内部 review findings(返给 arch-review,不直接落盘) | 总是 |
| Drift findings(若跑 `--drift`) | 条件 |

## 链路(4 step)

1. **prereq 检查**: `specs/` 完整存在?不完整 → 中文提示先 `/arch-onboard`;详见 `internal/orchestration/playbook.md` § integrity check
2. **dispatch arch-review**: mode=specs,默认只读 `specs/`,审视:
   - 4+1 视图覆盖
   - `freshness_status`(基于 commit diff + 命中架构敏感文件)
   - 风险与技术债是否可用
   - evidence 闭合
   - known_unknowns 是否被掩盖
   - KB 漂移
3. **freshness 分支**:
   - `fresh` → 继续 step 4
   - `possibly_stale` → 在结论中提示,继续 step 4
   - `stale` / `unknown` → 中文提示用户:"建议先刷新 specs;若需要验证代码漂移,运行 `--drift`"
     - 用户同意 refresh → 中止 audit,提示跑 `/arch-onboard --refresh`
     - 用户同意 drift → step 3b
4. **dispatch arch-pack**: 产 `generated/audit/{date}-健康度.md`(10 段:评分 / blocking / high / medium 摘要 / open questions / KB 漂移 / 反模式命中 / drift 结果 / 改造路线图 / non-recommendations);详见 `arch-pack/references/health-check-template.md`

**3b. dispatch arch-analyze --mode=drift-audit**(仅 `--drift`): 重扫代码对比 specs,产 drift findings 给 arch-review 用于 step 4

## 关键路口(用户确认)

- **freshness != fresh**: 显式问"refresh / drift / 继续(标 degraded)"三选一
- **drift 触发**: 提示成本(token / 时间)+ 影响(arch-analyze 重扫部分代码)

## acceptance

跑完 `internal/acceptance/audit.yaml`:
- structural: core-specs-present + state-present + health-check-view + audit-readonly
- semantic 5 项: freshness-decision / drift-risk / reviewability / actionability / health-check-integration
- 失败 2 次 retry → 第 3 次升级用户决策

## 硬规则

1. 默认**不扫全仓**,只读 specs/(成本控制)
2. drift audit 必须用户**显式同意**才跑
3. stale / unknown 必须给**中文 refresh 建议**(不允许"装作没事")
4. 不允许"没有发现问题"掩盖证据不足(必须显式标 known_unknowns)
5. 健康度视图 0 新事实(每条结论可追溯到 risks / decisions / quality / KB / anti-patterns / drift)

## 降级

| 失败模式 | 行为 |
|---|---|
| Git 不可用 | drift 无法跑;只能给 `freshness_status=unknown` |
| KB 未配置 | 健康度 §6 KB 漂移段 标 degraded(不阻塞) |
| arch-pack 产健康度失败 retry 3 次 | 写 placeholder,标 degraded + 列失败原因 |

## Write Scope

完整定义见 `internal/tool-contracts/write-scope.yaml#skills.arch-audit`。

- ✅ 可写:`state.yaml` · `.metrics.jsonl`
- ✅ 子 skill 间接写:`generated/audit/{date}-健康度.md`(arch-pack 落盘)
- ❌ 禁写:`specs/**` / `decisions/**` / `change-requests/**` / `generated/overview.md` / `generated/wiki/**`
- ❌ **核心边界:audit 只识别问题,不修问题** — 任何"修复"动作都不在本 skill 范围(用 `/arch-design` 走 CR 或 `/arch-onboard --refresh`)

## 参考

- `internal/orchestration/playbook.md`(freshness / integrity)
- `internal/acceptance/audit.yaml`
- `skills/arch-review/references/specs-review-rubric.md`
- `skills/arch-review/references/drift-heuristics.md`
- `skills/arch-pack/references/health-check-template.md`
