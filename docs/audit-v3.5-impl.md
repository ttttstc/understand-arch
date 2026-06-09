# v3.5 实现验收报告

> 实现人 + 自验收: Codex  
> 分支: `feat/v3.5-impl`  
> 基线: `docs/spec-v3.5.md`  
> 主题: 真并行 Subagent 调度规范化

## 结论

v3.5 T1 的实现范围已完成:7 个用户入口 SKILL 的 dispatch 段统一为 Claude Code Task 工具范式,`arch-onboard` 增加 Task 调用约定,新增确定性 `dispatch-lint` 并接入 `npm run verify`,版本收口到 `3.5.0-rc1`。

本轮追加 Typola 真实项目 dogfood,并修复 dogfood 暴露出的确定性链路问题:cards 锚点污染、cards summary 空洞、旧 fingerprint 增量崩溃、Windows 默认 Python/Bash 探测失败、空 tour 无确定性兜底。`npm run verify` 已全绿,Typola 的 graph/arch-layer/wiki/eval/cards/svg/png 复验通过。

## 实现清单

| 项目 | 文件 | 验收 |
|---|---|---|
| arch-enrich dispatch 规范化 | `internal/playbooks/enrich/SKILL.md` | Phase 7/8/9/9.5/9.6/10/11/11.5/12 均显式 Task;Phase 9.5 双 miner 单消息并发 |
| arch-audit dispatch 规范化 | `skills/arch-audit/SKILL.md` | senior-reviewer、decision-extractor、5b 三项检查规范化;5b 单消息并发 |
| arch-design dispatch 规范化 | `skills/arch-design/SKILL.md` | pre-grill/frame/impact/CR-OPTION/interface/solution/senior 均显式 Task;CR-OPTION A/B/C 三路并发 |
| arch-interview dispatch 规范化 | `skills/arch-interview/SKILL.md` | 主访谈循环的问题准备阶段显式 Task |
| arch-wiki dispatch 规范化 | `skills/arch-wiki/SKILL.md` | wiki-reviewer、senior-reviewer 显式 Task;多受众 N 路并发 |
| arch-diagram dispatch 规范化 | `skills/arch-diagram/SKILL.md` | fireworks JSON 翻译和 Mermaid 语义分组均显式 Task |
| arch-improve dispatch 规范化 | `skills/arch-improve/SKILL.md` | improvement RFC 候选显式 Task |
| onboard 编排约定 | `skills/arch-onboard/SKILL.md` | 末尾增加 Task Calling Convention |
| 静态 lint | `engine/arch/dispatch-lint.mjs` | 扫描 skills dispatch 红线 |
| lint 单测 | `engine/arch/__tests__/dispatch-lint.test.mjs` | arch-analyze 标杆 + 4 类违规 fixture |
| verify 接入 | `package.json` | 新增 `dispatch:lint`;`verify` 先跑 dispatch lint |
| 版本 | `package.json`、`.claude-plugin/plugin.json`、`.claude-plugin/marketplace.json` | `3.5.0-rc1` |
| cards 真实锚点修复 | `engine/arch/cards-deriver.mjs` | graph node id 不再写入 `anchors.file_paths`;summary 从已有事实确定性投影 |
| cards 回归测试 | `cards-deriver.test.mjs` / `cards-check.test.mjs` | summary 非空、file anchor 无 `::`、cards-check 干净 |
| tour 兜底 | `engine/arch/arch-layer-writer.mjs` | LLM tour 缺失时由已有 arch-layer 生成确定性导览;新增 `repair` |
| 非 git 增量兜底 | `engine/arch/incremental-planner.mjs` | 非 git 不再触发 `git diff` 噪音;旧 fingerprint 返回 FULL_UPDATE 不崩溃 |
| Windows 出图依赖探测 | `engine/arch/diagram-dispatch.mjs` | 自动寻找可用 Python 3/cairosvg 和 Git Bash |

## 确定性验收

| 命令 | 结果 | 摘要 |
|---|---|---|
| `node engine/arch/dispatch-lint.mjs --strict` | exit 0 | `dispatch-lint ok (13 skills checked, strict=true)` |
| `rg -n "Subagent Dispatch Is Mandatory" <7 SKILL.md>` | exit 0 | 7 个目标 SKILL 全部命中 |
| `rg -n "Send these N dispatches in a single message" internal/playbooks/enrich/SKILL.md skills/arch-audit/SKILL.md skills/arch-design/SKILL.md skills/arch-wiki/SKILL.md` | exit 0 | 4 个并行场景命中;design 在 workflow 和详细模板各出现一次 |
| `git diff -- README.md README.zh.md` | exit 0 | 空输出,README 双语未改 |
| `pnpm arch:test` | exit 0 | 11 个测试文件,32 个 case 全绿 |
| `npm run verify` | exit 0 | dispatch lint、arch/core/dashboard 测试与 build 全通过 |

`npm run verify` 摘要:

- `engine/arch`:11 files / 32 cases passed
- `engine/core`:32 files / 661 cases passed
- `dashboard`:6 files / 42 cases passed
- `dashboard build`:passed

## Typola 真实项目复验

测试对象:`D:\AI\workspace\Typola`。

| 命令 | 结果 | 摘要 |
|---|---|---|
| `node engine/arch/arch-layer-writer.mjs validate D:\AI\workspace\Typola ...` | exit 0 | `arch-layer ok` |
| `node engine/arch/cards-deriver.mjs --arch-dir=...` | exit 0 | 25 张 cards |
| `node engine/arch/cards-check.mjs --arch-dir=...` | exit 0 | `ok:true`,0 findings,0 stale |
| `node engine/arch/arch-layer-writer.mjs repair ...` | exit 0 | tour 从 0 修复为 4 步 |
| `node engine/arch/render-wiki.mjs ...` | exit 0 | 16 个 wiki 页面 |
| `node engine/arch/wiki-projection-check.mjs ...` | exit 0 | `ok:true`,ARCHITECTURE 与切片比例 0.934 |
| `node engine/arch/eval-report.mjs ...` | exit 0 | `trust_label:high`,hallucination_rate 0 |
| `node engine/arch/diagram-dispatch.mjs --type=architecture --style=6 ...` | exit 0 | SVG 输出成功 |
| `node engine/arch/diagram-dispatch.mjs --format=png --type=architecture --style=6 ...` | exit 0 | PNG 输出成功 |
| `node engine/arch/incremental-planner.mjs --arch-dir=...` | exit 0 | 旧 fingerprint 被识别为 incompatible baseline,返回 FULL_UPDATE,无 git stderr 噪音 |

Typola 复验计数:

```json
{
  "graph_nodes": 37,
  "graph_edges": 42,
  "module_service_nodes": 6,
  "component_profiles": 7,
  "capabilities": 8,
  "flows": 3,
  "quality_attributes": 6,
  "risks": 4,
  "technical_debt": 4,
  "cards": 25,
  "missing_card_summary": 0,
  "tour_steps": 4
}
```

## 文本规范验收

| 规则 | 结果 |
|---|---|
| 7 个 SKILL 头部含 `Subagent Dispatch Is Mandatory` | 通过 |
| LLM dispatch 含 `Use the Claude Code Task tool` | 通过 |
| LLM dispatch 含 `subagent_type=<name>` | 通过 |
| LLM dispatch 含 `Do not inline this phase` | 通过 |
| LLM dispatch 含 `The user must see subagent activity in Claude Code` | 通过 |
| 并行场景含 `Send these N dispatches in a single message to run concurrently` | 通过 |
| README.md / README.zh.md 不动 | 通过 |
| schemas / agents 不改 | 通过 |

## 回归保护

- 未修改 `internal/playbooks/analyze/SKILL.md`;它仍是 UA 范式标杆。
- 未修改 `agents/*.md`。
- 未修改 `internal/schemas/*.json`。
- 未修改 README 双语。
- 未新增用户命令或参数。
- 未改变 v3.3 CR 14 段结构、pre-grill、CR-OPTION 用户流程。
- 未改变 v3.2 fireworks vendor。
- Node 工具只做确定性调度、校验、投影和兼容兜底;没有把 LLM 推断写入脚本。

## 已知边界

- Typola 当前不是 git 仓库,history miner 没有 commit 信号可挖,这是项目输入边界;planner 会要求 FULL_UPDATE 建立新的 structural fingerprint baseline。
- `arch-layer-writer repair` 的 tour 是确定性兜底,质量不替代 `tour-builder` subagent 的语义导览,但能保证 dashboard/导航消费不为空。
