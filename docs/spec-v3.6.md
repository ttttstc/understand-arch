# understand-arch v3.6 Spec(技术深度补齐:UA parser 强化 + cards 扩展 + wiki 加深)

> Version: 3.6 · Status: Draft(收敛版,替换原 1336 行版本)· 基于:`docs/spec-v3.5.md`
> 主题:把架构知识库的**技术事实深度**补齐(API 参数、DB 字段、外部集成配置、模块依赖),但**不新增并列层**。强化已有 UA parser、扩展已有 cards、加深已有 wiki 章节。

---

## 0. 摘要

v3.0 ~ v3.5 把架构知识库建到了「叙事 + 判断 + 约束 + 出图 + CR + 知识自迭代 + 真并行调度」7 个维度。剩下的缺口很明确:

> 工程师改一个 API 或一张表时,需要看到 **API 参数 / 响应 / DB 字段 / 索引 / 外键 / 外部服务配置 key** 这种结构化技术事实。当前 graph 里有 endpoint / schema / table 节点,但深度不足。

v3.6 的设计原则是**收敛而非扩张**。本轮一个第一性原理审视后的结论:

> 当前架构知识库的健康抽象是「graph(事实)+ arch-layer(判断)+ cards(Agent 检索派生)」三件套。**任何新需求都应该落在这三件套之内,不新增并列层**。一旦新增并列 JSON / 并列文档目录 / 跨层 consistency check,就是冗余设计的信号。

v3.6 三件事:

1. **强化 UA parser 深度**:graphql / openapi / protobuf / sql parser 输出更深的节点 attributes,API 参数 / 响应 / DB 字段 / 索引 / 外键 / 外部配置 key **全部进 graph 节点**(不另建 JSON)。
2. **扩展 cards 类型**:8 类 → 12 类,新增 `ApiContractCard` / `DbSchemaCard` / `IntegrationCard` / `ProjectContextCard`,从加深后的 graph 节点派生。Agent 一跳到位。
3. **加深 wiki 章节**:`wiki/04-data-models.md` / `wiki/05-interfaces.md` / `wiki/13-external-dependencies.md` 各章追加「技术清单」段落(确定性投影自 graph 节点 + 新 cards)。不建并列 `technical/` 目录。

`AGENTS.md` / `CLAUDE.md` **不写到项目根目录**(破坏 v3.0 「只占 `.understand-arch/` 一个目录」铁律)。产到 `.understand-arch/{project}/agent-context/AGENTS.md`,提示用户自行 `ln -s` 或复制到根。

v3.6 用户入口数量不变(仍 8 个),命令行为不变,wiki 章节数不变。增量是**信息密度提升 + 4 类新检索卡 + 1 个可选 Agent 上下文产物**。

---

## 1. 全局规约(继承 + 新增 1 条收敛铁律)

v3.6 继承:

1. LLM 推断只在 Skill / subagent;Node/Python 确定性
2. 不推翻 UA 底座 —— **本轮反过来更深复用**
3. 不破坏 v3.1 约束层 / v3.2 出图 / v3.3 CR / v3.4 cards 派生 + 增量 / v3.5 真并行
4. 所有面向人产物默认中文
5. AI-mined / cr-derived 不可自标 confirmed
6. wiki 不显示 evidence(继承 v3.4 决策)

新增 v3.6 收敛铁律:

7. **三件套不可扩**:架构知识库永久只有 `graph.json`(事实)+ `arch-layer.json`(判断)+ `cards/agent-cards.json`(Agent 检索派生)三个核心模型。**任何新需求只能选三件套之一作为落点**,严禁新增并列 JSON。
8. **唯一事实来源**:技术事实(API 参数、DB 字段、外部 service 配置 key、模块依赖)**只能存在于 graph 节点 attributes**。arch-layer 通过节点 id 引用,不复制字段。cards 从 graph + arch-layer 确定性派生。
9. **wiki 是唯一面向人投影**:架构知识库面向人的产物只有 `wiki/`。不建 `technical/` 或其他并列目录。新内容加到现有 14 章对应位置。
10. **不污染项目根目录**:除 `.understand-arch/` 外不在用户仓库根写任何文件。`AGENTS.md` / `CLAUDE.md` 产到 `.understand-arch/{project}/agent-context/`,**严禁覆盖、追加、格式化用户根目录已有同名文件**。

---

## 2. 需求来源

### 2.1 第一性原理审视(为什么收敛)

原 v3.6 spec(1336 行)提议建并列 `technical-reference.json`(5 视图)+ `technical/` 目录(5 文档)+ 根目录 `AGENTS.md` + 跨层 consistency check。审视后发现 4 处冗余:

| 冗余 | 描述 | 收敛 |
|---|---|---|
| `technical-reference.json` ↔ `graph.json` | graph 已有 endpoint / schema / table / service / module 节点,UA parser 已挖 graphql / protobuf / sql。新建并列 JSON 90% 字段重叠 | 强化 UA parser 节点深度,不建新 JSON |
| `technical/*.md` ↔ `wiki/*.md` | wiki 04-data-models / 05-interfaces / 13-external-dependencies 已存在,讲同一件事 | wiki 对应章节加深 |
| `cards` ↔ `technical-reference` | 两者消费方都是 Agent,Agent 读路径会变 4 跳(`cards → arch-layer id → tech-ref id → graph node`)| 扩展 cards 类型,Agent 一跳到位 |
| 根目录 `AGENTS.md` ↔ v3.0 「只占 `.understand-arch/`」铁律 | 写根目录破坏边界,无法兜底用户已有同名文件 case | 产到 `.understand-arch/{p}/agent-context/`,用户自决 |

健康架构的标志:**改 1 个 API,只更新 1 处事实**。当前(v3.5)是 graph 节点 1 处,cards 自动派生,wiki 自动渲染。原 v3.6 方案会变成 5 处事实同步,所以引入 consistency check —— check 本身是冗余信号。

### 2.2 业界对照(为什么有的部分必须做)

| 模型 | 关键思想 | 收敛后 v3.6 对应 |
|---|---|---|
| C4 Container/Component | 组件 + 边界 + 接口 | 强化 graph 接口节点深度 + 新 `ApiContractCard` |
| arc42 Building Block | 模块依赖 + 接口契约 | 强化 module / interface 节点 + cards 扩展 |
| OpenAPI / AsyncAPI / Protobuf | 接口契约结构化 | UA parser 直接产结构化字段进 graph 节点 |
| ER 模型 | 表 / 列 / 外键 / 索引 | 强化 sql-parser 产 column / index / fk 子节点 |
| 12-factor `III. Config` | 配置外置 | 强化外部依赖 parser,挖配置 key + envvar |

业界共识是「这些事实必须结构化」,**但不要求物理上分离成新文件**。

### 2.3 用户决策

| # | 决策 | 来源 |
|---|---|---|
| 1 | v3.6 主线 = 收敛设计,不建并列层 | 用户拍板(本会话) |
| 2 | graph 是事实唯一来源,深度由 UA parser 负责 | 用户拍板 |
| 3 | cards 是 Agent 唯一检索层,扩展类型而非新建并列 | 用户拍板 |
| 4 | wiki 是唯一面向人投影,加深章节而非建并列目录 | 用户拍板 |
| 5 | AGENTS.md 写到 `.understand-arch/{p}/agent-context/`,用户自决 ln -s 到根 | 用户拍板 |

---

## 3. 目标 & 非目标

### 3.1 目标

1. **强化 UA parser 4 个**(graphql / openapi / protobuf / sql),让节点 attributes 包含 API 参数 / 响应 / DB 字段 / 索引 / 外键 / 外部 service 配置 key
2. **扩展 cards schema** 从 8 类到 12 类(加 `ApiContractCard` / `DbSchemaCard` / `IntegrationCard` / `ProjectContextCard`)
3. **加深 wiki 3 章**(04-data-models / 05-interfaces / 13-external-dependencies)各追加「## X.N 技术清单」段落,从 graph + 新 cards 确定性投影
4. **新增 1 章** `wiki/00-project-context.md`(项目上下文总览,给 Agent 工具读)
5. **`.understand-arch/{project}/agent-context/AGENTS.md`** 可选产出,**项目根目录零写入**
6. `npm run verify` exit 0,v3.0~v3.5 全部行为不破坏
7. 版本号 → `3.6.0-rc1`

### 3.2 非目标

- 新建 `technical-reference.json`(冗余 1)
- 新建 `technical/` 目录(冗余 2)
- 新建 `architecture-consistency-check.mjs`(冗余信号)
- 修改 `arch-layer.json` schema(它只引用 graph 节点 id,本来就够)
- 修改 v3.3 CR 流程 / v3.5 真并行调度 / v3.4 cards 派生流程(只扩 type,不改派生器逻辑)
- 修改 wiki 14 章结构(只加深内容,不增减章节)
- 项目根目录写入任何文件(v3.0 铁律)
- 状态机 / business-rule 维度(v3.7 候选)

---

## 4. 用户视角变化

### 4.1 命令清单

完全不变,仍 8 个。

### 4.2 用户感知的变化

| 用户做的事 | 内部自动发生 | 用户看到 |
|---|---|---|
| 跑 `/arch-onboard` | UA parser 4 个增强后产更深 graph 节点;cards 自动派生 12 类卡 | wiki/04 / 05 / 13 章节多了「技术清单」段;wiki/00 多了项目上下文章节 |
| 跑 `/arch-audit` | cards-check 校验新 4 类卡 anchor;Agent context 产物校验 | 报告增段「技术参考清单完整度:N 个 API / M 张表 / K 个外部依赖」 |
| 跑 `/arch-design` | impact / solution 召回时多了 4 类技术卡 | 影响面 / 详细设计的「参考材料」段引用更细 |

### 4.3 README 描述

不改 README 主体。仅可在「能做什么」段落里**一句话**升级:

> 知识库现在能从代码里把 API 参数、数据库字段、外部依赖配置自动识别,让 Agent 检索和设计变更时直接拿到结构化技术事实。

不出现「technical/」「technical-reference」「ApiContractCard」「ln -s」等内部字样。

### 4.4 Agent 上下文产物(可选)

跑 `/arch-onboard --emit-agent-context`(默认开启,可关)产出:

```text
.understand-arch/{project}/agent-context/
├── AGENTS.md          ← 通用 Agent 上下文,引用 wiki/00-project-context.md
└── CLAUDE.md          ← Claude Code 专用,引用同上 + 项目命令清单
```

用户提示(audit 报告):「若希望 Claude Code / Cursor 等 Agent 工具自动读取,可 `ln -s .understand-arch/{p}/agent-context/CLAUDE.md ./CLAUDE.md`」。**我们绝不主动写根目录**。

---

## 5. 实施要点

### 5.1 UA parser 强化(本轮工程量主体)

**改 4 个现有 parser**:

| Parser | 当前已挖 | v3.6 补 |
|---|---|---|
| `engine/core/src/plugins/parsers/graphql-parser.ts` | type / query / mutation 节点 | 参数列表(name + type + required)、返回类型、嵌套字段、@directive |
| `engine/core/src/plugins/parsers/protobuf-parser.ts` | message / service / rpc 节点 | message 字段(name + type + repeated/optional)、service rpc 入参出参引用 |
| `engine/core/src/plugins/parsers/sql-parser.ts` | table / view / index 节点 | column(name + type + nullable + default)、index columns、foreign_key references、primary key |
| **新建** `engine/core/src/plugins/parsers/openapi-parser.ts` | — | 从 yaml/json OpenAPI 3.x 挖 path / method / params / requestBody / responses |
| **新建** `engine/core/src/plugins/parsers/integration-extractor.ts` | — | 扫 `package.json` / `pom.xml` / `requirements.txt` + 配置文件中常见外部 service key(database url、redis、kafka、rabbitmq、s3、stripe、github 等) |

**节点 schema 不动**(`engine/core/src/schema.ts` 的节点 type enum 不增减),只在节点 `attributes` 字段下添加结构化子字段:

```typescript
// 示例:enriched endpoint node
{
  id: "repo-a::endpoint::POST::/orders",
  type: "endpoint",
  name: "POST /orders",
  filePath: "src/orders/controller.ts",
  attributes: {
    // v3.6 新增字段
    http_method: "POST",
    path: "/orders",
    request_params: [
      { name: "userId", in: "body", type: "string", required: true },
      { name: "items", in: "body", type: "array<Item>", required: true }
    ],
    responses: {
      "200": { type: "Order" },
      "400": { type: "ErrorResponse" },
      "401": { type: "ErrorResponse" }
    },
    auth_required: true
  }
}
```

attributes 是开放字段,**v3.0 schema 已经允许**,无需改 schema。

### 5.2 cards 扩展(8 → 12)

改 `internal/schemas/agent-card.schema.json`:`type` enum 加 4 个值:

```json
"enum": [
  "ComponentCard", "CapabilityCard", "InterfaceCard", "DataModelCard",
  "FlowCard", "RiskCard", "ConstraintCard", "DecisionCard",
  "ApiContractCard",      // 新增
  "DbSchemaCard",         // 新增
  "IntegrationCard",      // 新增
  "ProjectContextCard"    // 新增
]
```

card id pattern 扩同步:加 `api-contract` / `db-schema` / `integration` / `project-context` 段。

改 `engine/arch/cards-deriver.mjs`,新增 4 个派生函数:

| 卡片类型 | 派生自 | 单卡覆盖 |
|---|---|---|
| `ApiContractCard` | graph endpoint 节点 attributes(增强后) | 一个 API:method、path、参数、响应、auth、调用方 |
| `DbSchemaCard` | graph table 节点 attributes(增强后) | 一张表:列、索引、外键、引用方 |
| `IntegrationCard` | graph external-service 节点 attributes | 一个外部依赖:服务类型、配置 key、调用代码位置 |
| `ProjectContextCard` | arch-layer.project + graph 全局 + tech-stack | 一份项目总览:技术栈、入口、构建命令、关键路径 |

数量 **每仓 1 张 ProjectContextCard**,其他按 graph 节点数量产。

cards-check 自动扩展(它本来就按 anchor 校验,不需要专门改)。

### 5.3 wiki 加深(不增减章节)

修改现有 wiki 章节模板(`skills/arch-wiki/SKILL.md` 触发的 `render-wiki.mjs`):

| 章节 | 现有内容 | v3.6 追加段 |
|---|---|---|
| `wiki/04-data-models.md` | 数据模型叙事 + Mermaid 关系图 | `## 4.N 技术清单`:每张表的列、索引、外键(确定性投影自 graph 节点 attributes) |
| `wiki/05-interfaces.md` | 接口职责叙事 | `## 5.N API 技术清单`:method、path、参数、响应、auth(确定性投影) |
| `wiki/13-external-dependencies.md` | 外部依赖叙事 | `## 13.N 集成清单`:服务、配置 key、调用代码位置 |

**新增章节**:

| 文件 | 内容 |
|---|---|
| `wiki/00-project-context.md` | 项目上下文总览:技术栈、入口、构建命令、关键路径 —— 给 Agent 工具读,wiki/ARCHITECTURE.md 不引用(它是 ARCHITECTURE 的前置摘要) |

`render-wiki.mjs` 加 4 个 renderer 函数,从 graph + 4 类新 cards 确定性投影,**无 LLM 调用**。

### 5.4 Agent 上下文产物(可选)

新建 `engine/arch/agent-context-init.mjs`(确定性,无 LLM):

```bash
# 默认开启,可关
/arch-onboard
/arch-onboard --no-agent-context
```

产出 `.understand-arch/{project}/agent-context/AGENTS.md` 和 `CLAUDE.md`,内容是:

```markdown
# Project Context for Agent Tools

> Auto-generated by understand-arch v3.6. Read [00-project-context.md](../wiki/00-project-context.md) for details.

## Quick Reference
- Architecture: see [../wiki/ARCHITECTURE.md]
- API contracts: see [../wiki/05-interfaces.md]
- DB schema: see [../wiki/04-data-models.md]
- External services: see [../wiki/13-external-dependencies.md]

## How to enable
To let Claude Code / Cursor / other Agent tools auto-read this:
  ln -s .understand-arch/{project}/agent-context/CLAUDE.md ./CLAUDE.md
or copy it to your repo root. understand-arch never writes your root directory directly.
```

**严禁**:扫描或修改用户根目录的 `AGENTS.md` / `CLAUDE.md`,无论它们是否存在。

### 5.5 不动清单(铁律 §7~10 边界)

- **不动**:agents/*.md(extractor 是确定性,不需要新 subagent)
- **不动**:`internal/schemas/arch-layer.schema.json`(它通过节点 id 引用 graph,本来就够)
- **不动**:wiki 14 章结构(只加深内容,新增 wiki/00 不算 14 章变化,它是前置上下文)
- **不动**:v3.5 真并行 SKILL 调度
- **不动**:用户项目根目录任何文件

---

## 6. 文件清单

### 6.1 新增

#### engine/core/src/plugins/parsers
- `openapi-parser.ts`(新)
- `integration-extractor.ts`(新)

#### engine/arch
- `engine/arch/agent-context-init.mjs`(确定性 Node)
- `engine/arch/__tests__/agent-context-init.test.mjs`
- `engine/arch/__tests__/cards-deriver-v36.test.mjs`(覆盖 4 类新卡派生)

#### wiki
- `wiki/00-project-context.md` 模板段(写入 render-wiki.mjs)

#### docs
- `docs/spec-v3.6.md`(本文档)
- `docs/audit-v3.6-impl.md`(实现后写)

### 6.2 修改

#### engine/core/src
- `plugins/parsers/graphql-parser.ts`:补参数、返回类型、嵌套字段
- `plugins/parsers/protobuf-parser.ts`:补 message 字段、rpc 入参出参
- `plugins/parsers/sql-parser.ts`:补 column、index、foreign_key
- 单测(若已有):跑通新字段提取

#### internal/schemas
- `agent-card.schema.json`:type enum 加 4 值;id pattern 扩

#### engine/arch
- `cards-deriver.mjs`:加 4 个派生函数(`deriveApiContractCards` / `deriveDbSchemaCards` / `deriveIntegrationCards` / `deriveProjectContextCards`)
- `render-wiki.mjs`:加 wiki/04 / 05 / 13 加深段 renderer + wiki/00 renderer

#### skills/arch-onboard/SKILL.md
- 加 `--no-agent-context` 高阶参数(默认开启 agent-context,README 不暴露)

#### skills/arch-audit/SKILL.md
- 报告段加「技术参考清单完整度:N 个 API / M 张表 / K 个外部依赖」

#### .claude-plugin/plugin.json / marketplace.json / package.json
- 版本 → `3.6.0-rc1`

### 6.3 不动

- `internal/schemas/arch-layer.schema.json` / `knowledge-graph.json` 节点 type enum
- 任何现有 subagent(`agents/*.md`)
- v3.3 CR / v3.4 增量 / v3.5 真并行
- 用户项目根目录

---

## 7. 依赖

无新增运行时依赖。

OpenAPI parser 用 `yaml` + 现有 json 解析,UA 工具链已有。

---

## 8. 验收

### 8.1 确定性层

- [ ] 4 个 parser 单测:对 fixture 文件(典型 GraphQL schema / proto / SQL DDL / OpenAPI 3.x yaml)产出新字段
- [ ] integration-extractor 单测:对典型 `package.json` + `application.yaml` 识别 ≥3 类外部服务
- [ ] cards-deriver 单测:4 类新卡正确派生,anchor 通过 cards-check
- [ ] render-wiki 单测:加深段确定性渲染,不调 LLM
- [ ] agent-context-init 单测:产物路径正确,**严禁写到根目录**(测试用例需故意构造根目录已有 CLAUDE.md 场景,验证我们的工具不去碰)
- [ ] `npm run verify` exit 0
- [ ] 所有 v3.5 测试不破坏(11+ 文件 31+ case)

### 8.2 集成层

- [ ] 在真实仓库跑 `/arch-onboard`,wiki/04 / 05 / 13 章节出现「技术清单」段,内容非空
- [ ] 跑 `/arch-onboard --no-agent-context`,`agent-context/` 不产出
- [ ] 跑 `/arch-onboard`(默认),`agent-context/` 产出,**项目根目录无任何新文件**(硬指标,git status 验证)
- [ ] cards 数量增加(8 类 → 12 类,实测条数视项目而定)

### 8.3 回归保护

- [ ] v3.5 dispatch-lint --strict exit 0
- [ ] v3.4 cards-check 不破坏(原 8 类卡 + 新 4 类卡共存)
- [ ] v3.3 CR 14 段流程不破坏
- [ ] v3.2 fireworks 出图不破坏
- [ ] v3.1 约束层不破坏

### 8.4 文档

- [ ] README 主体只更一句(见 §4.3),不暴露内部设计
- [ ] `docs/audit-v3.6-impl.md` 三层验收报告齐全
- [ ] 不出现 `technical-reference.json` / `technical/` 目录残留(grep 验证)

### 8.5 铁律实测(硬指标)

- [ ] **「项目根目录零写入」实测**:在带 root CLAUDE.md 的仓库跑完整 onboard,git status 显示 root CLAUDE.md 未被改;无新增根目录文件
- [ ] **「单一事实来源」实测**:修改 1 个 API 参数,只需改 1 处源码,parser 自动产新 graph 节点 attributes,cards 自动派生,wiki 自动渲染(等价 v3.4 增量硬指标的 API 维度扩展)

---

## 9. 不做的事(v3.7 候选)

| # | 能力 | 推后理由 |
|---|---|---|
| 1 | 行为视图层(state-machine / business-rule 节点 type 扩展) | 涉及节点 type enum 改动,工程量独立 |
| 2 | 任务级端到端效果评估 | 独立轴,等 v3.6 落地后基线更稳再做 |
| 3 | cards 向量召回 | 等 cards 数量真出现瓶颈再加,目前 12 类够用 |
| 4 | git-history 作者维度 | 单团队价值低,继续观察 |
| 5 | 跨仓技术清单聚合 view | 视真实多仓场景需求评估 |

---

## 10. 交付节奏

由于以「强化现有」为主,1 个 T 即可收口:

| T | 产出 | 复用 / 新增 |
|---|---|---|
| T1 | 4 个 parser 强化(其中 2 个新建)+ cards schema 扩 4 类 + cards-deriver 加 4 派生函数 + render-wiki 加 wiki/00 + 3 章加深段 + agent-context-init + 单测 + audit 报告 + 版本 3.6.0-rc1 | 复用 UA parser 框架 + cards / render-wiki 现有派生流水线 |

工期估 2-3 天(parser 强化最重)。

---

## 11. 风险

| 风险 | 缓解 |
|---|---|
| parser 强化引入解析错误,破坏 v3.0 已有 graph | T1 单测覆盖新字段,跑全量 v3.5 测试集回归;若 fixture 缺失则补 |
| 4 类新卡数量爆炸(大仓 API 几百个)| cards-deriver 按现有规则去重 + sort,与 v3.4 一致;若数量真过大,可加 `--max-cards-per-type` 阈值(留高阶) |
| 用户根目录已有 CLAUDE.md,我们误碰 | T1 「项目根目录零写入」硬指标实测;agent-context-init 工具实现层有 assertion「never touch repo root」 |
| 用户期望根目录自动产 CLAUDE.md | audit 报告明确提示 ln -s 方法;不主动写根目录是 v3.0 铁律,不破坏 |
| OpenAPI yaml 解析依赖 | 用 `yaml` npm 包(UA 链路已有);无依赖时降级到正则提取(精度降但不阻断) |
| cards 派生增加 v3.4 增量 onboard 计算量 | v3.4 增量 planner 按文件粒度判断,parser 强化后单文件产更多节点但映射逻辑不变,影响可控 |

---

## 12. 与原 v3.6(1336 行)的差异说明

原 v3.6 设计的 4 处冗余:`technical-reference.json` / `technical/*.md` / 跨层 consistency check / 根目录 AGENTS.md / CLAUDE.md。

本收敛版的核心置换:

| 原方案 | 本版方案 |
|---|---|
| 新建 `specs/technical-reference.json`(5 视图) | 强化 graph 节点 attributes,不建新 JSON |
| 新建 `technical/*.md`(5 文档) | wiki/04 / 05 / 13 加深 + wiki/00 新增 |
| 新建 `architecture-consistency-check.mjs` | 不需要(层数没增加,没有跨层不一致问题) |
| 根目录 `AGENTS.md` / `CLAUDE.md` | `.understand-arch/{p}/agent-context/`,用户自决 ln -s |
| 1 个新 subagent | 不需要(extractor 是确定性的) |
| 6 个新 Node 工具 | 1 个新工具(agent-context-init)+ 强化现有 cards-deriver / render-wiki |
| 新增 1 个 schema 文件 | 改 1 处 enum(cards schema 加 4 值) |

**维护面**:原方案约 30 件工具,本版约 13 件(增量主要在 parser 增强,不是新工具)。

铁律 §7「三件套不可扩」是本轮最关键的边界保护 —— **以后任何新需求,先问能不能落在 graph / arch-layer / cards 三件套之一,不能就拒绝设计**。
