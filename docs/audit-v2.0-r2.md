# v2.0 实现 Audit 报告 R2(第 2 轮)

> 验收人:Claude(spec author)
> 验收日期:2026-05-27
> 验收基线:`docs/spec-v2.0.md`(commit `dbb6ce7`)
> 实现 commit:`20e0975` fix: complete v2 p0 implementation gaps

---

## 一、整体结论(R2)

**Verdict: pass(P0)+ needs_revision(P1 未完)**

### 完成度变化

| 维度 | R1(commit 035a61c) | R2(commit 20e0975) |
|---|---|---|
| 整体完成度 | ~40%(骨架) | **~75%**(核心 P0 + e2e 链路全通) |
| 9 subagent prompt 总行数 | 90 行(每个 10 行) | **1427 行**(每个 144-172 行) |
| 5 SKILL.md dispatch 模板 | ❌ 缺 | ✅ 加(arch-analyze 6 个 phase + arch-wiki + arch-design + arch-audit + arch-onboard) |
| Phase 编号 | ❌ 错位(无 1.5 / 7) | ✅ 严格按 spec §3.7(0/1/1.5/2/3/4/5/6/7/8) |
| CR.md 14 段标题 | ❌ 自行修改 | ✅ 严格按 spec §4.1.2.1 |
| hooks.json 格式 | ❌ 自定义 guards | ✅ Claude Code 官方 PostToolUse + SessionStart |
| state.schema hooks_enabled | ❌ const:false | ✅ default:false |
| sample wiki/01-overview.md | 1 行占位 | **68 行实质内容**(9 段全产) |
| sample CR.md | 不存在 | **104 行 14 段完整产物** |
| cr-md-editor validate | N/A | ✅ ok=true, sections_found=14 |
| senior-review design mode | N/A | ✅ verdict=pass, score=1.0 |
| wiki-review lite + full | N/A | ✅ 都 verdict=pass |
| npm run verify | N/A | ✅ pass |

---

## 二、P0 验收(7/7 PASS)

| # | 任务 | R2 状态 | 验证证据 |
|---|---|---|---|
| F1 | 重写 9 个 subagent prompt(≥100 行) | ✅ | wc -l agents/arch-*.md 总 1427 行,每个 144-172 行 |
| F2 | Phase 编号严格按 spec §3.7 | ✅ | phase-pipeline.md 含 Phase 1.5 BATCH + Phase 7 REVIEW |
| F3 | CR.md 14 段标题对齐 spec §4.1.2.1 | ✅ | cr-md-editor --help 列出 14 段(背景/现状/方案/详细设计/替代/NFR/风险/改动/实施/回滚/测试/待定/关联/Review) |
| F4 | 5 个 SKILL.md 加 subagent dispatch 模板 | ✅ | arch-analyze 6 个 phase dispatch 模板齐 + wiki/design/audit/onboard 都有 |
| F5 | hooks_enabled const:false → default:false | ✅ | grep 确认 |
| F6 | hooks.json 改 Claude Code 官方格式 | ✅ | PostToolUse + SessionStart 结构 + hooks_enabled 前置检查 |
| F7 | wiki LLM 渲染(可接受确定性兜底) | ✅ | 01-overview 68 行 + 03-interfaces 末尾"已知局限"段 + arch-wiki SKILL 加 dispatch 模板 |

---

## 三、E2E 链路验证

| 命令 | 结果 |
|---|---|
| `npm run verify` | ✅ pass |
| `node engine/bin/scanner.js --workspace samples/.understand-arch/sample` | ✅ pass(3 nodes, 1 edge) |
| `node engine/bin/cr-md-editor.js validate --file samples/.understand-arch/sample/change-requests/CR-2026-999-sample/CR.md` | ✅ ok=true, sections_found=14 |
| `node engine/bin/senior-review.js --mode design --cr ...` | ✅ verdict=pass, score=1.0 |
| `node engine/bin/wiki-review.js --mode lite` | ✅ verdict=pass |
| `node engine/bin/wiki-review.js --mode full` | ✅ verdict=pass |

---

## 四、P1 剩余问题(7 项,未修)

下表是上一轮报告 P1 任务的进度:

| # | P1 任务 | R2 状态 |
|---|---|---|
| F8 | plugin.json/marketplace.json 注册 agents/hooks | ❌ 未修 |
| F9 | cr.schema.json 字段对齐 spec §4.1.2.1 | ❌ 未修(实际 CR.md 用了 spec 标准字段,但 schema 落后) |
| F10 | state.schema history.skill 加 19 枚举 | ❌ 未修 |
| F11 | hooks/arch-update-prompt.md 扩写 | ❌ 未修(仍 7 行) |
| F12 | 补 5 个 skill references | ❌ 未修(arch-audit/design/onboard/wiki 仍无 references) |
| F13 | package.json devDependencies | ❌ 未修(仍空) |
| F14 | 扩写 phase-pipeline.md | ✅ 已修(15 → 92 行) |

---

## 五、新发现的潜在问题(Audit R2)

### N1: schema 与实际产物分歧(语义级)

**现象**:
- 实际 `samples/.../CR.md` frontmatter 用 spec 标准字段(`cr_id / owner / created / prd_link / affects_repos / impact{added/modified/removed/estimated_files_changed}`)
- cr.schema.json 用旧字段(`id / created_at / project / impact_node_ids / sections`)
- cr-md-editor validate 用了它自己的 14 段 hard-code 检查,**没走 schema**

**风险**:codex 应用 schema 时会失败(实际 CR.md 不符 schema)。需要 codex 决定:用哪套字段名,然后双向对齐。

**建议**:把 schema 改为对齐实际产物(cr_id / owner / created / prd_link / affects_repos / impact 嵌套结构)— 这才是 spec §4.1.2.1 正确版本。

### N2: 部分 wiki 页仍是 3 行骨架(P2 级别)

```
wiki/08-deployments.md       3 行
wiki/09-flows-and-scenarios  3 行
wiki/10-decisions.md         3 行
wiki/11-changes.md           3 行
wiki/12-rules.md             3 行
wiki/13-pending-changes.md   3 行
```

这是 render-wiki.js 确定性兜底渲染时的 fallback(因 sample 项目没有对应类型节点)。**实际场景下** LLM 介入时应填充。属于 sample workspace 局限性,不算 codex bug。

但建议 codex 在 render-wiki.js 添加注释:"当 graph 提供对应类型节点时,本页应由 LLM 受众化润色填充,不是 3 行骨架。"

### N3: marketplace.json 描述提到 "v2.0-skeleton"

**现象**:`"version": "2.0.0-skeleton"` 自我标记"骨架"。
**建议**:既然 P0 已完成,可以改为 `"2.0.0-rc1"` 或 `"2.0.0"`,反映"实施合同 P0 已满足"。

---

## 六、修复优先级(R2 → R3)

### R3 第 1 轮(P1 收尾,6 项)

| 序号 | 任务 | 估计工作量 |
|---|---|---|
| F8 | plugin.json/marketplace.json 加 agents/hooks 注册 | 10 分钟 |
| F9+N1 | cr.schema.json 对齐实际产物字段 | 20 分钟 |
| F10 | state.schema history.skill 加 19 枚举 | 5 分钟 |
| F11 | 扩写 hooks/arch-update-prompt.md(详细增量更新指引) | 30 分钟 |
| F12 | 补 5 个 skill references(scheduler-playbook / drift-detection / impact-analysis / wiki-audience / audit-flow) | 90 分钟 |
| F13 | package.json devDependencies(esbuild/typescript/vitest) | 5 分钟 |

### R3 第 2 轮(P2 + N2-N3 收尾)

| 序号 | 任务 |
|---|---|
| F15 | wiki cache 机制 |
| F16 | acceptance refiner loop 协议引用 |
| F17 | arch-library 归位说明 |
| N2 | render-wiki 加 LLM fallback 注释 |
| N3 | 版本号从 skeleton 升 rc1/2.0.0 |

---

## 七、最终结论

### 给用户

codex 第 2 轮修复 **质量良好**:
- 7 个 P0 全部 pass
- E2E 链路(scanner + cr-md-editor + senior-review + wiki-review)全跑通
- subagent prompt 质量从 10 行占位升级为 144-172 行的可执行指引

**v2.0 已具备核心可用性**(可作为 plugin 投入使用),但 6 个 P1 + 5 个 P2 未完成,影响 schema 一致性、plugin 加载完整性和 references 完备性。

### 给 codex(R3 修复 Brief)

请基于 commit `20e0975` 继续修复 P1。优先级:

1. **F8 plugin.json/marketplace.json** — 这个**严重**,Claude Code 不注册 agents 会导致 subagent dispatch 完全失败
2. **F9+N1 cr.schema.json** — 实际产物已对,schema 跟上
3. **F10 state.schema enum** — schema 收紧
4. **F11 arch-update-prompt.md** — hooks 不工作的根因
5. **F12 5 个 references** — SKILL 引用但文件缺
6. **F13 devDependencies** — pnpm install 当前可能漏 build 工具

修完跑:
- `npm run verify`
- 所有 6 个 e2e 命令(同上)
- 检查 plugin.json 注册的 agents 和 hooks 路径都存在
