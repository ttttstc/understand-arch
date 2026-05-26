---
name: arch-onboard
description: |
  建立或刷新当前项目的架构基线 specs/。扫代码仓 → 产 baseline / quality / risks / decisions / traceability 五份 schema-locked yaml + 稳定 Mermaid 图,并自动计算 freshness。是新接手项目或定期重建基线时的入口。

  触发词: 接手 / 摸熟 / 全景 / baseline / 建立架构基线 / 给个 overview / 这是个什么系统 / refresh specs / 更新基线 / /arch-onboard

  本 skill 不写业务代码,不生成 IaC / DDL / CI / 服务骨架。
---

# arch-onboard — 建立/刷新架构基线

## 角色

- 用户级入口,直接触发 onboard 流程
- 自己编排 onboard 链路(不委托给其他用户 skill);共享逻辑读 `internal/orchestration/playbook.md`
- 维护 `state.yaml`(本 skill 活跃期间作为单 writer)

## 输入

- `${ARCH_PROJECT_DIR}`(默认 `arch/{项目名}/`)
- 可选 `--refresh`(强制重扫,忽略 freshness)
- 可选 `--language <lang>`(中文优先,默认 zh)
- 可选 `--no-ua`(跳过 UA 知识图谱检测)

## 输出

| 路径 | 何时产 |
|---|---|
| `specs/baseline.yaml`(含内嵌 capabilities[]) | 总是 |
| `specs/quality.yaml` | 总是 |
| `specs/risks.yaml` | 总是 |
| `specs/decisions.yaml`(仅索引) | 总是 |
| `specs/traceability.yaml` | 总是 |
| `specs/diagrams/*.mmd` | 总是 ≥2 张(C4 context + container) |
| `generated/overview.md`(11 段 ≤200 行) | 总是 |
| `generated/wiki/01-06.md`(6 页) | 总是 |
| `state.yaml`(workflow 状态机) | 总是 |
| `.metrics.jsonl`(append 埋点) | 总是 |

## 链路(7 step)

1. **工作区准备**: 若 `${ARCH_PROJECT_DIR}` 不存在,从 `arch/_template/` copy。读 `state.yaml` 恢复或初始化
2. **KB 加载**: 从 `~/.understand-arch/kb/` 读 5 个组织 KB yaml(banned-patterns / compliance-redlines / network-boundaries / naming-conventions / tech-radar);标 `kb_loaded` 状态。详见 `internal/orchestration/playbook.md` § KB 加载
3. **Mode 选择**: 检测 `.understand-anything/knowledge-graph.json`,FRESH 时进 ua-augmented mode(见 `arch-analyze/references/ua-graph-adapter.md`),否则 standalone
4. **dispatch arch-analyze**: mode=baseline-refresh,产 specs/*.yaml + diagrams/*.mmd。大仓自动多 agent 切片(`arch-analyze/references/subagent-orchestration.md`)
5. **dispatch arch-diagram**: source=specs,补全 C4 图源
6. **dispatch arch-review**: mode=specs,内部 gate 检查证据闭合 / 4+1 覆盖 / freshness 字段;产 findings 不落盘
7. **dispatch arch-pack**: audience=onboarding,产 overview.md + 6 页 wiki

每步收到子 skill 的 `state_delta`,merge 进 state.yaml(append-only `history` / `overrides`)。详见 `internal/orchestration/playbook.md` § state_delta merge。

## 关键路口(用户确认)

- **profile 确认**: arch-analyze 输出 `architecture_profile` 后,中文展示给用户;用户可调整 `identified_styles` / `recommended_references`
- **预算预告**: 若估算 > 80k token,先告知用户是否继续
- **仓重要性排序**: 多仓场景列各仓重要性,确认深扫范围

## acceptance

跑完 `internal/acceptance/onboard.yaml`:
- structural: specs 5 文件 + state.yaml + ≥2 diagrams + overview.md 存在 + schema validate pass + no_writes_outside_scope
- semantic 7 项: baseline-complete / four-plus-one / freshness / risks-and-debt / traceability / capabilities-coverage / ua-integration-trace(conditional)
- 失败 2 次 retry → 第 3 次升级用户决策

## 硬规则

1. 用户可见提示默认中文
2. 不允许在残缺 baseline 上跑(integrity check 失败即停)
3. `freshness_status` 必须显式写入
4. 所有架构判断带 `evidence_refs`(governance pillar 6)
5. 遇到禁止产物请求拒绝(IaC / DDL / 服务骨架等)

## 降级

| 失败模式 | 行为 |
|---|---|
| Git 不可用 | `freshness_status=unknown`,降级为内容完整性审视 |
| KB 不存在 | `kb_loaded.*=not_configured`,继续(不阻塞) |
| 大仓 LLM token 不够 | 启用多 agent 切片;详见 `arch-analyze/references/subagent-orchestration.md` |
| UA 图谱 STALE | 中文提示用户重跑 `/understand` 或继续(标 stale) |
| arch-pack 产 overview 失败 | retry 2 次仍失败 → 标 `degraded`,弹出失败原因 |

## Write Scope

完整定义见 `internal/tool-contracts/write-scope.yaml#skills.arch-onboard`。

- ✅ 可写:`state.yaml`(全字段;`history` / `overrides` append-only) · `.metrics.jsonl`(append-only)
- ✅ 子 skill 通过本 skill 间接写 `specs/**` / `generated/overview.md` / `generated/wiki/**`(本 skill 是 dispatcher,write-scope check 校验子 skill 落盘合法性)
- ❌ 禁写:`decisions/**`(归 arch-adr) · `change-requests/**`(归 arch-design)

### state.yaml 合并协议

本 skill 是本次 dispatch 的**单 writer**。其他内部 skill 返 `state_delta`,本 skill merge 后写盘。

详见 `internal/orchestration/playbook.md` § state_delta merge protocol。

## 参考

- `internal/orchestration/playbook.md`(state.yaml 状态机 / merge 协议 / KB 加载 / 反合理化 / freshness)
- `internal/acceptance/onboard.yaml`
- `internal/tool-contracts/write-scope.yaml`
- `internal/schemas/state.schema.json`
- `skills/arch-analyze/references/subagent-orchestration.md`(大仓切片)
- `skills/arch-analyze/references/ua-graph-adapter.md`(UA 集成)
- `skills/arch-pack/references/overview-template.md`(overview 11 段)
- `skills/arch-pack/references/wiki-pages-template/01-06.md`
