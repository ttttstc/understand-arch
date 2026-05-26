# understand-arch

> 面向 Claude Code 的 Docs-as-Code 架构知识套件。

[English](./README.md) · [完整规格](./docs/spec-v1.0.md)

---

## 它解决什么

`understand-arch` **不**是又一个文档生成器。它给项目维护一份**可信、可版本化、Agent 可读**的架构基线,并把每次变更当作相对基线的 delta 记录下来。

它在任何时刻都能回答:

- 当前系统架构是什么样? *(specs)*
- 这次改动会动什么、回滚怎么走? *(CR)*
- 哪些结论有证据支撑? *(traceability)*
- 哪些知识可能过期了? *(freshness 状态机)*

## 用户入口

| 命令 | 你会怎么说 | 实际发生 |
|---|---|---|
| `/arch-onboard` | "帮我看懂这套系统" / "建一份基线" | 扫代码,产 `specs/`(5 份 schema-locked YAML + Mermaid 图源) |
| `/arch-design` | "根据 PRD 设计 X" / "开个 CR" | 建 `change-requests/CR-*/`,产影响面 / 方案权衡 / ADR / 评审 |
| `/arch-audit` | "现在的基线还能信么" | 只读 `specs/`,审视完整度 + 新鲜度;必要时建议 refresh 或 drift audit |
| `/arch-brief` | "给新人写个 wiki" / "给 CTO 一份汇报" | 重组已有事实成 `generated/overview.md`、5 页 wiki、或受众化摘要 |

`arch-review`、`arch-options`、`arch-adr`、`arch-diagram`、`arch-pack`、`arch-radar` 都是内部 skill,由上面 4 个入口按需调度。

## 工作区结构

```text
arch/{项目名}/
├── specs/                            # 100% 事实层(只有 yaml + Mermaid 图源,无 markdown 解释)
│   ├── baseline.yaml                 # 组件、接口、数据模型、部署单元、capabilities[](v1.0 内嵌)
│   ├── quality.yaml                  # NFR、组织 KB、运行/发布/回滚约束
│   ├── risks.yaml                    # 风险 + 技术债台账
│   ├── decisions.yaml                # ADR 索引 + superseded[] 关系
│   ├── traceability.yaml             # CR ↔ specs ↔ ADR ↔ release 追溯链
│   └── diagrams/                     # 稳定 C4 Mermaid 源
├── decisions/                        # append-only ADR markdown(文件本身永不修改)
│   └── ADR-NNN-*.md
├── change-requests/
│   └── CR-YYYY-NNN-{slug}/
│       ├── cr.md
│       ├── impact.yaml
│       ├── review.yaml
│       ├── traceability.yaml
│       └── options.md                # 条件产出,仅当存在真实方案分歧时
├── generated/                        # 派生人类视图,可删可重建
│   ├── overview.md                   # 1 页稳定入口(11 段固定结构,≤200 行硬上限)
│   ├── wiki/01-..06-*.md             # 6 页 onboarding 展开(含 06-能力雷达)
│   ├── audit/                        # {date}-健康度.md(audit 收尾产,问题集成视图)
│   ├── diagrams/                     # 渲染后的 SVG/PNG
│   └── briefs/                       # 受众化摘要
├── state.yaml                        # workflow 状态机(writer = 当前活跃的 user-facing skill)
└── .metrics.jsonl                    # 每次 skill 运行的埋点
```

## 治理六条(Governance Pillars)

随 LLM 能力提升,**乱产文档**的风险越大,治理价值越显著。这 6 条是套件长期能站住的根:

1. **specs 是唯一事实源** — `specs/*.yaml` schema-locked。任何 `generated/`、`cr.md`、ADR 正文或汇报里出现的事实如果与 specs 矛盾,就是 bug。
2. **Append-only 历史** — `decisions/ADR-*.md` commit 后永不修改;supersede 关系记在 `specs/decisions.yaml#superseded[]`。`state.yaml.history` 与 `state.yaml.overrides` 同样仅追加。
3. **新鲜度状态机** — 每份 baseline 带 `freshness_status: fresh|possibly_stale|stale|unknown`,基于 commit diff 命中架构敏感文件计算。`stale` 时 design 会用中文给 refresh 建议,不让用户在过期基线上做决定。
4. **state.yaml 单 writer** — 唯一可写者是**当前活跃的 user-facing skill**(`arch-onboard` / `arch-design` / `arch-audit` / `arch-brief`)。内部 skill 通过返 `state_delta` 让其合并(协议见 `internal/orchestration/playbook.md`)。杜绝并发状态污染。
5. **Write-scope 契约** — `internal/tool-contracts/write-scope.yaml` 声明每个 skill 的可写/可读/禁写路径。`arch-pack` 不能动 `specs/`、`arch-review` 除了 `review.yaml` 全只读、`arch-analyze` 不能写 `decisions/`。v1.0 靠 acceptance 审计,v1.1 上 PreToolUse hook 硬拦截。
6. **证据闭合** — YAML 里每条断言带 `evidence_refs`;`overview.md` 与 wiki 里每条结论必须回链到 YAML 字段或 ADR/CR 路径。**禁止**"应该 / 大概 / 通常"等弱化词。

## 产物边界

| ✅ 允许 | ❌ 拒绝 |
|---|---|
| `*.md`(overview / wiki / ADR / CR / brief) | Terraform / Helm / Pulumi |
| `*.yaml`(schema-locked 事实) | DDL / ORM migration |
| `*.mmd`(Mermaid 源) | `.github/workflows/*` / `.gitlab-ci.yml` |
| `*.svg` / `*.png`(渲染图) | 服务骨架 / OpenAPI 客户端代码 |
|   | 业务代码 |

Write-scope 契约在 tool 层强化:即便 prompt 上来要求,也会被拦截。

## 包含什么

| 层 | 内容 |
|---|---|
| 13 个 skill(4 用户入口 + 9 内部) | `arch-onboard / arch-design / arch-audit / arch-brief (用户入口) + arch-analyze / arch-frame / arch-diff-judge / arch-options / arch-adr / arch-diagram / arch-review / arch-pack / arch-radar (内部)`,每个含 `SKILL.md` + 可执行 `references/`(rubric / template / playbook) |
| Schema | 5 个 specs schema + 3 个 CR schema + state schema + 5 个组织 KB schema |
| Acceptance | 4 入口各一份 YAML,含 `structural_checks` + `semantic_checks` + `scope_audit` |
| Tool 契约 | `internal/tool-contracts/write-scope.yaml` — 每 skill write/read/forbidden 矩阵 |
| 模板 | `arch/_template/` 工作区骨架 + `arch/sample/` 示例 |
| KB seed(`arch-library/`) | 8 个域、共 18 份 ≤200 行的高信号 seed:`typescript-patterns/` × 4 · `microservices-patterns/` × 3 · `devops-patterns/` × 3 · `migration-patterns/` × 3 · `nfr-checklists/` × 4 · `anti-patterns/` × 1 |

AI / agent 架构 KB(`arch-library/agent-architecture/`)有意先 defer,等 AI 域支持落地后再补。

## 用户交互语言

用户可见提示**默认中文**(eg. "当前架构基线可能已过期"),首次出现关键英文术语时加括号(eg. "架构漂移(drift)"、"写回(writeback)")。YAML key 与 schema 字段保持稳定英文。

## 安装

### 前置条件

- 支持 plugin marketplace 的 Claude Code

### 从 GitHub 安装

在 Claude Code 里依次执行:

```text
/plugin marketplace add https://github.com/ttttstc/understand-arch
/plugin install understand-arch@understand-arch
/reload-plugins
```

Claude Code 从 [`.claude-plugin/marketplace.json`](./.claude-plugin/marketplace.json) 读取插件定义。

### 验证

`/reload-plugins` 之后,在任意 prompt 输入 `/arch-`,应出现 4 个补全:

- `/arch-onboard`
- `/arch-design`
- `/arch-audit`
- `/arch-brief`

### 装完没看到 `/arch-*` 命令?

按顺序排查:

1. **执行了 `/reload-plugins` 吗?** 没执行 Claude Code 不会扫到新 skill。
2. **检查插件是否真装上**:`/plugin list` 应看到 `understand-arch`。
3. **检查命令格式**:命令是 `/arch-onboard`(短横线连接),**不是** `/arch:onboard`(冒号语法不被 Claude Code 支持)。
4. **强制重载**:重启 Claude Code 后再 `/reload-plugins`。

### 可选:Understand-Anything 联动

`understand-arch` **不强依赖** [Understand-Anything](https://github.com/Lum1104/Understand-Anything)。若你装了它并跑过 `/understand`,产出 `.understand-anything/knowledge-graph.json`,`arch-analyze` 会自动识别并切到 ua-augmented mode(扫描更快更准)。不装时本套件走自带扫描链路,用户入口和用法不变。

## 怎么开始

```text
/arch-onboard
```

首次运行扫代码 → 写 `specs/` 基线 → 计算 `freshness_status` → 用中文列出 `known_unknowns`(例如未识别 owner 的组件)。后续的 `/arch-design`、`/arch-audit`、`/arch-brief` 都在同一工作区上增量演进。

也可以用自然语言触发:

- "帮我看懂这个项目" → 自动走 `/arch-onboard`
- "根据这份 PRD 设计架构" → `/arch-design`
- "现在的 specs 还能信么" → `/arch-audit`
- "给 CTO 整一份汇报" → `/arch-brief`

## 当前状态

**v1.0 specs-CR 模型已落地**,含:

- spec + 10 skill + **14 JSON schema**(v1.0 收敛:capabilities 内嵌 baseline) + 4 acceptance gate + write-scope 契约 + **19 份 reference 文档** + 18 份知识库 seed
- `arch/_template/` 骨架 + `arch/sample/` 演示工作区
- **多 agent 并行扫描编排**(`scan-shard` 契约 + 切片规则 + 主上下文聚合)— 解决大仓上下文溢出
- **业务能力地图**(`specs/baseline.yaml#capabilities[]`,v1.0 内嵌于 baseline)— 能力 × 成熟度 × 重要度 × 承载组件 × gaps,支撑业务能力维度的汇报与差距分析
- **系统问题集成视图**(`generated/audit/{date}-健康度.md`)— audit 收尾聚合 risks/debt/open_questions/KB 漂移/反模式/drift,10 段 ≤250 行,一份表掌握项目健康度
- **Understand-Anything 集成**(可选)— 用户装了 [UA plugin](https://github.com/Lum1104/Understand-Anything)(31K+ ⭐)后,arch-analyze 自动检测 `.understand-anything/knowledge-graph.json` 并切换到 ua-augmented mode,把 UA 的 nodes/edges 直接转成我们 specs;不装时走 standalone 不退化

未进 v1.0(见 [v1.1 候选](./docs/spec-v1.0.md#v11-candidates)):

- `arch-review --mode=fitness`(ADR fitness spec 兜底)
- PreToolUse hook 硬拦截 write-scope
- 真正的 LLM 渲染 wiki / 基于 specs/CR 的 RAG 问答(overview.md 只是 1 页索引,不是问答入口)
- AI / agent 架构知识库 seed

## License 

License 见 [LICENSE](./LICENSE)。
