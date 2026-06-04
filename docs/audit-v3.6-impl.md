# v3.6 实现验收报告

> 实现人 + 自验收: Codex  
> 分支: `feat/v3.6-impl`  
> 基线: `docs/spec-v3.6.md`  
> 主题: 技术深度补齐(UA parser 强化 + cards 扩展 + wiki 加深)

## 结论

v3.6 T1 收敛版实现完成。实现严格落在 graph / arch-layer / cards 三件套内:技术事实进入 graph 节点 `attributes`,cards 扩展为 12 类,wiki 原有章节追加技术清单,Agent 上下文只写 `.understand-arch/{project}/agent-context/`。

本轮未新增 `technical-reference.json`,未新增 `technical/` 目录,未新增 `architecture-consistency-check.mjs`,未写用户项目根目录。

## 实现清单

| 项目 | 文件 | 验收 |
|---|---|---|
| GraphQL 深字段 | `engine/core/src/plugins/parsers/graphql-parser.ts` | 参数、返回类型、directive 写入 endpoint/schema attributes |
| Protobuf 深字段 | `engine/core/src/plugins/parsers/protobuf-parser.ts` | message 字段、rpc 入参/出参写入 attributes |
| SQL 深字段 | `engine/core/src/plugins/parsers/sql-parser.ts` | column、primary key、index columns、foreign key 写入 attributes |
| OpenAPI parser | `engine/core/src/plugins/parsers/openapi-parser.ts` | OpenAPI 3.x path/method/params/requestBody/responses/schema 提取 |
| Integration extractor | `engine/core/src/plugins/parsers/integration-extractor.ts` | package/config/env 中外部服务 key、SDK、endpoint 提取 |
| Parser 多路合并 | `engine/core/src/plugins/registry.ts` | 同语言多个 parser 合并输出,保留后注册优先 API |
| Graph attributes 管道 | `engine/core/src/types.ts`, `graph-builder.ts` | Definition/Endpoint/Resource attributes 进入 graph node |
| cards schema | `internal/schemas/agent-card.schema.json` | type enum 8 → 12,id pattern 扩展 |
| cards 派生 | `engine/arch/cards-deriver.mjs` | 新增 ApiContractCard / DbSchemaCard / IntegrationCard / ProjectContextCard |
| wiki 加深 | `engine/arch/render-wiki.mjs` | `00-project-context.md`;03/04/13 追加技术清单 |
| Agent context | `engine/arch/agent-context-init.mjs` | 只写 archDir 下 AGENTS.md / CLAUDE.md,含 root 写入断言 |
| onboard | `skills/arch-onboard/SKILL.md` | 增加 `--no-agent-context` 高阶参数与默认 agent-context 产物 |
| audit | `skills/arch-audit/SKILL.md` | 报告段增加技术参考清单完整度 |
| README | `README.md`, `README.zh.md` | 只加一句用户视角能力描述 |
| 版本 | `package.json`, `.claude-plugin/*.json` | `3.6.0-rc1` |

## 确定性验收

| 命令 | 结果 | 摘要 |
|---|---|---|
| `pnpm --filter @understand-arch/core test` | exit 0 | 32 files / 664 cases passed |
| `pnpm arch:test` | exit 0 | 13 files / 35 cases passed |
| `pnpm --filter @understand-arch/core build` | exit 0 | TypeScript build passed |
| `pnpm dispatch:lint` | exit 0 | `dispatch-lint ok (13 skills checked, strict=true)` |
| `npm run verify` | exit 0 | dispatch lint、arch/core/dashboard test、core/dashboard build 全通过 |

新增测试覆盖:

- `parsers.test.ts`:GraphQL / Protobuf / SQL / OpenAPI / Integration 深字段。
- `cards-deriver-v36.test.mjs`:4 类新技术卡派生 + cards-check。
- `agent-context-init.test.mjs`:根目录已有 `CLAUDE.md` 时不触碰;`--no-agent-context` 跳过。

## 集成验收

使用 cards fixture 实测:

| 项 | 结果 |
|---|---|
| `wiki/00-project-context.md` | 已生成 |
| `wiki/03-interfaces.md` | 包含 `API 技术清单` 和 `集成清单` |
| `wiki/04-data-models.md` | 包含 `技术清单` |
| `wiki/13-pending-changes.md` | 包含 `集成清单` |
| `agent-context/AGENTS.md` | 已生成 |
| `agent-context/CLAUDE.md` | 已生成 |
| 仓库根 `AGENTS.md` | 未生成 |
| 仓库根 `CLAUDE.md` | 未生成 |
| `technical/` 目录 | 不存在 |
| `specs/technical-reference.json` | 不存在 |

### Typola 真实项目 dogfood

测试项目:`D:\AI\workspace\Typola`  
产物目录:`D:\AI\workspace\Typola\.understand-arch\typola`

| 命令 | 结果 | 摘要 |
|---|---|---|
| `node engine/arch/cards-deriver.mjs --arch-dir=D:\AI\workspace\Typola\.understand-arch\typola` | exit 0 | 生成 `cards/agent-cards.json`,共 26 张卡 |
| `node engine/arch/cards-check.mjs --arch-dir=D:\AI\workspace\Typola\.understand-arch\typola` | exit 0 | `ok:true`,无 stale,无 findings |
| `node engine/arch/render-wiki.mjs D:\AI\workspace\Typola\.understand-arch\typola` | exit 0 | 生成 17 个 wiki 页面,`ARCHITECTURE.md` 约 24KB / 255 行 |
| `node engine/arch/wiki-projection-check.mjs D:\AI\workspace\Typola\.understand-arch\typola` | exit 0 | `ok:true`,长文/切片比例 0.937,无 findings |
| `node engine/arch/eval-report.mjs D:\AI\workspace\Typola\.understand-arch\typola` | exit 0 | `trust_label:high`,`hallucination_rate:0`,`placeholder_count:0` |
| `node engine/arch/agent-context-init.mjs --arch-dir=D:\AI\workspace\Typola\.understand-arch\typola` | exit 0 | 只生成 `agent-context/AGENTS.md` 和 `CLAUDE.md` |

真实项目质量判断:

- Typola graph 当前为 37 nodes / 42 edges,包含 6 个 module,13 个 file,15 个 function,3 个 document。
- `arch-layer.json` 已有 architecture_style、7 个 component_profiles、5 个 tech_stack、8 个 capabilities、6 个 quality_attributes、4 个 risks、4 个 technical_debt、3 个 flows、3 个 external_dependencies。
- v3.6 新技术事实中,Typola 产生 1 张 `ProjectContextCard`;`ApiContractCard` / `DbSchemaCard` / `IntegrationCard` 为 0。原因是 Typola 当前源码没有 OpenAPI/SQL/schema/package manifest,也没有后端 HTTP API 或 DB schema;wiki 如实声明“没有独立后端服务接口/数据表清单/结构化外部服务集成清单”。
- 入口投影已按真实项目修正:`wiki/00-project-context.md` 现在列出 `src/App.tsx`,`src/main.tsx`,`src/renderer/index.html`,`src/renderer/main.tsx`,不再误报“未识别到明确入口”。
- 根目录零写入实测:Typola 根目录文件仍只有 `design.md`,`Markdown编辑器-规划文档.md`,`vision.md`;未新增根 `AGENTS.md` / `CLAUDE.md`。

## 红线验收

| 红线 | 结果 |
|---|---|
| 不新建 `technical-reference.json` | 通过:`Get-ChildItem -Recurse -Filter technical-reference.json` 空输出 |
| 不新建 `technical/` 目录 | 通过:`Get-ChildItem -Recurse -Directory -Filter technical` 空输出 |
| 不写用户项目根目录 | 通过:agent-context 单测 + fixture 实测 |
| 技术事实唯一来源为 graph attributes | 通过:parser 输出 attributes,arch-layer schema 未改 |
| cards 只扩 enum,不新建 schema | 通过:只修改 `agent-card.schema.json` |
| v3.5 dispatch lint 不破坏 | 通过 |

## 回归保护

- 未修改 `internal/schemas/arch-layer.schema.json`。
- 未新增 `architecture-consistency-check.mjs`。
- 未新增 subagent。
- 未改变 v3.3 CR 14 段结构。
- 未改变 v3.2 fireworks vendor 或图路径。
- 未改变 v3.5 Task dispatch 合同。

## 已知边界

- OpenAPI YAML parser 当前优先支持基础 path/method/operationId;复杂 YAML 结构仍建议通过 JSON 或后续增强解析器覆盖。
- wiki 当前仓库历史章节文件名为 `03-interfaces.md` 与 `13-pending-changes.md`;v3.6 技术清单按现有 14 章落位,未重排章节编号。

