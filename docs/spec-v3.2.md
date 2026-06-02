# understand-arch v3.2 Spec(图能力升级:fireworks-tech-graph 集成)

> Version: 3.2 · Status: Draft · 基于:`docs/spec-v3.1.md`(增量 delta,不重写 v3.1)
> 主题:`/arch-diagram` 从「只产 Mermaid」升级到「Mermaid / SVG+PNG / PlantUML 三路并存」,集成 [fireworks-tech-graph](https://github.com/yizhiyanhua-ai/fireworks-tech-graph)(MIT)的生产级 SVG 出图能力,新增 sequence / state-machine / class / ER 等图类型。

---

## 0. 摘要

v3.0/v3.1 让架构知识库可信、可演进、有约束护栏。但**图层一直停留在 Mermaid 文本**,无法满足:
- 业界标准技术文档要求的**生产级时序图 / 类图 / 状态机 / ER**
- 风格统一的对外汇报材料(7 风格:flat-icon / dark-terminal / blueprint / notion / glass / claude-official / openai)
- 离线 PNG 资产沉淀(可嵌 Confluence / 飞书 / 钉钉)

v3.2 不动 schema、不动 graph、不动 arch-layer,只升级 `/arch-diagram` 的「出图通道」:

1. **完整搬迁 fireworks-tech-graph**(LLM-side SKILL.md + Python-side 模板渲染 + 7 风格知识库 + 10 模板 + 7 fixtures)到 `vendor/fireworks-tech-graph/`
2. **三路输出**:`--format=svg|png|plantuml|mermaid`,默认 SVG 走 fireworks 新出图能力,Mermaid 作为兼容与降级路径
3. **14 图类型 ↔ 6 语义类型映射**:context/container/component/flow/risk/c4 自动选模板,额外暴露 sequence / state-machine / class / ER / use-case / timeline / comparison / mind-map
4. **5 套项目类型 → 推荐组合**:Web 应用 / 中间件 / 数据流水线 / Agent 系统 / 多仓微服务

v3.2 用户入口数量不变(仍 7 个),`/arch-diagram` 能力增强。

---

## 1. 全局规约(继承 v3.1)

引用 `docs/spec-v3.1.md` §1 全局中文规约,本 spec 不复述。

---

## 2. 需求来源

### 2.1 当前 `/arch-diagram` 的局限

| 维度 | v3.1 现状 | 问题 |
|---|---|---|
| 输出格式 | 仅 Mermaid 文本 | 无法嵌 Word / Confluence / PPT;无 PNG 资产沉淀 |
| 图类型 | 6 种(context/container/component/flow/risk/c4) | 缺时序、状态机、类图、ER —— 业界标准技术文档 4 类必备 |
| 风格 | 无 | 客户汇报 / 内部架构评审 / 工程蓝图无差异化 |
| 时序图 | Mermaid sequenceDiagram(质量受限) | 用户明确要求「生产级时序能力」,PlantUML 也在期望范围 |

### 2.2 fireworks-tech-graph 调研结论

- **形态**:纯 Claude Code Skill,根 `SKILL.md`(31KB prompt)+ Python 渲染器 `scripts/generate-from-template.py`(64KB,确定性 SVG 合成)
- **许可证**:MIT,与本项目兼容
- **运行依赖**:Python 3 + `cairosvg`(主)/ `rsvg-convert`(兜底)/ `puppeteer`(像素级);**无外部 API、无网络调用**
- **图类型**:14 种(architecture / data-flow / flowchart / sequence / comparison / timeline / mind-map / agent / memory / use-case / class / state-machine / er-diagram / network-topology)
- **风格**:7 种,通过 `references/style-{1..7}-*.md` 注入 LLM 上下文
- **输入契约**:`python3 generate-from-template.py <type> <out.svg> '<JSON spec>'`,JSON 含 `style/title/containers/nodes/arrows/route_points/...`
- **铁律契合度**:LLM 做编排(SKILL.md 教 Claude 把语义→JSON),Python 做确定性渲染 —— 与本项目铁律一致,**无需重写翻译层**

### 2.3 用户决策(讨论纪要)

| # | 决策 | 来源 |
|---|---|---|
| 1 | 5 套推荐组合按项目类型 | 用户明示 |
| 2 | 保留 Mermaid + 新增 SVG/PNG/PlantUML 多路并存 | 用户明示「能力,PlantUML 也在范围内」 |
| 3 | 不加 NOTICE,仅保留 LICENSE 文件 | 用户明示 |
| 4 | 默认用新增出图方式,Mermaid 作为降级;显式 `--format=svg|png` 时缺 Python/cairosvg 直接报错 | 用户明示 |
| 5 | 直接用 fireworks 自带 SKILL,不重写翻译层 | 用户明示「直接用自带的」 |
| 6 | 本轮(v3.2)只解决图能力,**集成视图 / 行为视图 / 数据深度 3 大 schema 缺口留给 v3.3** | 用户明示「先落」 |

---

## 3. 目标 & 非目标

### 3.1 目标

1. `/arch-diagram` 支持 `--format=svg|png|plantuml|mermaid`(默认 `svg`,Mermaid 为兼容和降级路径)
2. `/arch-diagram` 支持 `--type=<14 种之一>`(向后兼容原 6 种)
3. `/arch-diagram` 支持 `--style=<1..7>` + `--profile=<5 套项目类型预设>`
4. fireworks 完整搬迁,upstream 升级可追溯(锁 commit SHA,写入 vendor README)
5. 集成测试:跑通 fireworks 自带 7 fixtures,SVG + PNG 全部产出
6. `npm run verify` exit 0(v3.1 行为不破坏)

### 3.2 非目标(本轮明确不做)

- 修改 `internal/schemas/arch-layer.schema.json` 或 `knowledge-graph.json` 节点类型
- 新增「集成视图层」(topic/integration/contract)节点维度 → v3.3
- 新增「行为视图层」(state-machine/business-rule)mining → v3.3
- 新增「数据深度」(config/mapping/ER 基数)字段 → v3.3
- 重写 fireworks 自带 SKILL prompt(直接复用)
- 自建 PlantUML 渲染服务(只产 .puml 文本源码,渲染留给用户 IDE)
- 显式 `--format=svg|png` 时的降级路径(直接报错,提示 `pip install cairosvg`)

---

## 4. 用户视角变化

### 4.1 命令签名

```bash
# 默认使用 fireworks SVG 出图
/arch-diagram c4

/arch-diagram sequence --format=svg --style=6                 # 生产级时序图(claude-official 风格)
/arch-diagram architecture --format=png --profile=web         # Web 应用推荐预设
/arch-diagram state-machine --format=plantuml                 # PlantUML 源码(.puml)
/arch-diagram er-diagram --format=svg --style=3               # ER + blueprint 风格
/arch-diagram c4 --format=mermaid                             # v3.1 Mermaid 兼容路径
```

### 4.2 默认行为

- 不带 `--format` 时:**svg**(写入 `wiki/assets/diagrams/*.svg`,并在 `wiki/14-diagrams.md` 追加嵌图引用)
- 默认 SVG 路径失败时:降级到 **mermaid** v3.1 路径,并向用户说明降级原因
- 不带 `--style` 时:`profile` 推荐风格;若无 `profile`,默认 `1`(flat-icon)
- 不带 `--type` 时:沿用 v3.1 默认 `c4`

### 4.3 输出位置

| format | 位置 | 备注 |
|---|---|---|
| svg | `wiki/assets/diagrams/{type}-{style}.svg` | 默认路径 |
| png | `wiki/assets/diagrams/{type}-{style}.png` | 同上 |
| plantuml | `wiki/assets/diagrams/{type}.puml` | 同上 |
| mermaid | `wiki/14-diagrams.md` 段落 | 兼容与降级路径 |

`wiki/14-diagrams.md` 在 svg/png 模式下自动追加 `![architecture](assets/diagrams/architecture-6.png)` 嵌图引用。

---

## 5. 实施要点

### 5.1 vendor 搬迁(完整复制策略)

```
understand-arch/
├── vendor/
│   └── fireworks-tech-graph/         ← git subtree,完整 mirror
│       ├── LICENSE                   ← MIT(必须保留,头条款)
│       ├── PROMPT.md                 ← 原 SKILL.md 改名,避免 Claude 双挂载冲突
│       ├── README.md                 ← upstream 原文,加一行「vendored at SHA xxx」
│       ├── references/               ← 9 个 md 全量
│       ├── templates/                ← 10 个 SVG 模板全量
│       ├── scripts/                  ← 4 个 sh + py 全量
│       ├── fixtures/                 ← 7 个 JSON 全量
│       └── assets/samples/           ← 7 张 PNG 全量(测试基准)
```

**搬迁约束**:
- `SKILL.md` 必须改名 `PROMPT.md`(根目录两个同名 `SKILL.md` 会被 Claude 同时发现,产生命令冲突)
- 除改名外,**一字不改**,保留 upstream 原始结构,便于 `git subtree pull` 升级
- 锁定一个 upstream commit SHA,写入 `vendor/fireworks-tech-graph/VENDORED.md`(本项目用,不污染 upstream)

### 5.2 `/arch-diagram` SKILL 改造

`skills/arch-diagram/SKILL.md` 重写为**调度器**:

1. 解析 `--format` / `--type` / `--style` / `--profile` 参数
2. 未指定 `--format` → 默认走 svg fireworks 新出图路径
3. format=mermaid → 走 v3.1 原路径(完全不动)
4. format=svg|png|plantuml → 调用 `engine/arch/diagram-dispatch.mjs`
5. SVG/PNG 路径下,把 graph 节点 + arch-layer 节点 + 用户语义描述,拼成自然语言上下文,**透传给 vendor/fireworks-tech-graph/PROMPT.md 自带的 LLM 编排**(不重写)
6. PlantUML 路径下,LLM 直接出 `.puml` 文本(不调 fireworks)

### 5.3 调度器 `engine/arch/diagram-dispatch.mjs`(新增,确定性,无 LLM)

职责(铁律范围内):
- 参数 schema 校验(type / style / format / profile 枚举)
- profile → (type, style) 解析
- 依赖检查(format=svg|png 时,`python3 -c "import cairosvg"`,显式图片格式不通过直接报错;默认未指定 format 时由 SKILL 降级 Mermaid)
- 调 `python3 vendor/fireworks-tech-graph/scripts/generate-from-template.py <type> <out.svg> '<JSON>'`
- 调 `vendor/fireworks-tech-graph/scripts/validate-svg.sh` 验 SVG
- format=png 时,调 cairosvg 导 PNG
- 写产物路径,追加 wiki/14-diagrams.md 嵌图引用
- 失败精确报错(JSON 格式问题 / Python 缺包 / SVG 校验失败)

**不做的事**:不做语义→JSON 的翻译(交 SKILL/LLM)。

### 5.4 项目类型 → 推荐组合(5 套 profile)

| profile | 默认 type 集 | 默认 style | 选择理由 |
|---|---|---|---|
| `web` | architecture, flow, sequence | 6 claude-official | 主流 Web 应用,3 层架构清晰,官方风更稳重 |
| `middleware` | architecture, data-flow, sequence | 2 dark-terminal | 中间件偏底层,终端风更技术氛围 |
| `pipeline` | data-flow, flowchart, timeline | 3 blueprint | 数据流水线强调时序与转换,蓝图风工程感强 |
| `agent` | agent, memory, sequence | 5 glassmorphism | Agent 系统多组件协作,玻璃风层次感强 |
| `multi-repo` | architecture, network-topology, c4 | 1 flat-icon | 多仓系统组件多,扁平风视觉负载低 |

写入 `skills/arch-diagram/SKILL.md` 的 profile 章节。

### 5.5 14 图类型 ↔ 6 语义类型映射

| v3.1 语义 type | 默认 fireworks type | 备注 |
|---|---|---|
| context | architecture | 外部系统 + 系统边界 |
| container | architecture | 服务 / 模块 / 资源层 |
| component | class | 模块内组件级 |
| flow | data-flow / flowchart | 默认 data-flow,业务逻辑流用 flowchart |
| risk | architecture(+ 风险热度叠加) | 通过 style 暗示风险等级(暂用 dark-terminal) |
| c4 | architecture(context+container 拼) | 调多次,叠图 |

**额外暴露给用户的 fireworks 原生 type**(8 种):`sequence` / `state-machine` / `er-diagram` / `use-case` / `mind-map` / `timeline` / `comparison` / `network-topology` —— 用户可直接 `--type=<原生名>` 调用。

---

## 6. 文件清单(改 / 新增)

### 6.1 新增

- `vendor/fireworks-tech-graph/`(整目录搬迁,见 §5.1)
- `vendor/fireworks-tech-graph/VENDORED.md`(锁 commit SHA + 搬迁说明,本项目自用)
- `engine/arch/diagram-dispatch.mjs`(确定性调度)
- `engine/arch/__tests__/diagram-dispatch.test.mjs`(单测)
- `docs/spec-v3.2.md`(本文档)
- `docs/audit-v3.2-impl.md`(实现后写)

### 6.2 修改

- `skills/arch-diagram/SKILL.md`(重写为调度器,保留 v3.1 mermaid 路径)
- `README.md` / `README.zh.md`(`/arch-diagram` 段落加 `--format` 说明 + 5 套 profile)
- `.claude-plugin/plugin.json` / `marketplace.json` / `package.json` → `3.2.0-rc1`
- `package.json` 新增脚本:`"diagram:test": "bash vendor/fireworks-tech-graph/scripts/test-all-styles.sh"`(可选)
- `.gitignore`:确认不忽略 vendor/

### 6.3 不动

- 任何 schema(`internal/schemas/*.json`)
- 任何现有 subagent
- v3.1 约束层全部产物
- 现有 v3.1 验收脚本

---

## 7. 依赖与运行时

### 7.1 新增依赖

| 依赖 | 必需性 | 安装 |
|---|---|---|
| Python 3.8+ | format=svg/png 时必需 | 用户自备 |
| `cairosvg` | format=png 时必需(主) | `pip install cairosvg` |
| `rsvg-convert` | 可选兜底 | `brew install librsvg` / `apt install librsvg2-bin` |

### 7.2 错误提示约定

format=png 但 cairosvg 缺失:

```
[arch-diagram] PNG export requires cairosvg.
  Install: pip install cairosvg
  Alternative: install librsvg and use rsvg-convert
```

显式 `--format=svg|png` 不降级到 mermaid;默认未指定 format 时可降级 Mermaid。

---

## 8. 验收(三层,本 spec 落地后必跑)

### 8.1 确定性层

- [ ] vendor 目录结构 = upstream(diff 仅 SKILL.md→PROMPT.md 一处改名)
- [ ] `diagram-dispatch.mjs` 单测:format=mermaid 走原路径不调 python;format=svg 触发 python 调用并产 svg
- [ ] 跑通 `vendor/fireworks-tech-graph/scripts/test-all-styles.sh`(7 fixtures 全产 SVG + PNG)
- [ ] `npm run verify` exit 0(v3.1 行为完整保留)
- [ ] `.claude-plugin/*.json` 版本 = 3.2.0-rc1

### 8.2 LLM 层(本会话内人工抽检)

- [ ] 真实跑 `/arch-diagram sequence --format=svg --style=6`,产物视觉无明显畸变
- [ ] 真实跑 `/arch-diagram architecture --format=png --profile=web`,推荐组合正确
- [ ] 默认路径产出 SVG;显式 `--format=mermaid` 路径与 v3.1 完全一致

### 8.3 文档层

- [ ] README.md / README.zh.md `--format` 段落完整,展示 5 套 profile
- [ ] docs/audit-v3.2-impl.md 三层验收报告齐全

---

## 9. 不做的事(v3.3 候选,明确给后续)

1. **集成视图层** schema 扩展:`messaging-topic` / `integration-point` / `external-contract` 节点类型 + miner
2. **行为视图层**:`state-machine` 节点 + `business-rule` 抽取 subagent + 状态图自动生成
3. **数据深度**:`config-mapping` / `er-cardinality` / `dto-do-mapping` 字段 + miner
4. fireworks 出图 + 风险热度自动叠加
5. CR.md / ADR 自动嵌入 fireworks 图(目前需手动 `--format=png` 后引用)

---

## 10. 交付节奏

| 阶段 | 产出 | 负责 |
|---|---|---|
| T1 | vendor 搬迁 + LICENSE + PROMPT.md 改名 | codex |
| T2 | `engine/arch/diagram-dispatch.mjs` + 单测 | codex |
| T3 | `skills/arch-diagram/SKILL.md` 重写为调度器(三路并存) | codex |
| T4 | 5 套 profile + 14↔6 映射表写入 SKILL | codex |
| T5 | README 双语 + `.claude-plugin/*.json` 版本 + 集成测试 | codex |
| T6 | `docs/audit-v3.2-impl.md` 三层验收报告 | codex |

每个 T 阶段完成 Claude 验收,T6 完成后整体 Codex 终审 → PR。

---

## 11. 风险

| 风险 | 缓解 |
|---|---|
| upstream fireworks SKILL.md 改名后,内部相对路径引用断裂 | T1 完成后,通过 `python3 generate-from-template.py` 跑 1 个 fixture 验证;断了改 PROMPT.md 内部链接 |
| 双 SKILL 同名挂载 | 强制改名 PROMPT.md;`.gitignore` 确认 vendor 下原 SKILL.md 不存在 |
| Python 3 / cairosvg 跨平台差异 | 验收脚本仅在有 Python + cairosvg 环境跑;无环境 skip 而不 fail |
| Mermaid 兼容路径回归 | T2 单测覆盖显式 mermaid 不调 python;T5 抽检 v3.1 Mermaid 路径仍可用 |
