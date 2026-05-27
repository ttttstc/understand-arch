# 01 Overview

项目:sample
描述:暂无项目描述。
仓库数:1
节点总数:3
仓内边总数:1
跨仓边总数:0

## 1. 基线可信度

本页由 graph 确定性事实渲染,不是新的事实源。每个结论都应能回链到 repo graph、cross-repo graph、ADR、CR 或 rules。
如果本页与 graph 冲突,以 graph 为准,并应重新运行 arch-analyze 或 arch-wiki。

## 2. 仓库总览

| 仓库 | 主语言 | 本地路径 | 节点 | 仓内边 | 描述 |
|---|---|---|---:|---:|---|
| sample | markdown | ../../sample-repo | 3 | 1 | v2.0 sample single-repo workspace |

## 3. 节点类型分布

| 类型 | 数量 |
|---|---:|
| document | 1 |
| file | 1 |
| function | 1 |

## 4. 边类型分布

| 类型 | 数量 |
|---|---:|
| contains | 1 |

## 5. 跨仓关系

暂无跨仓边。N=1 单仓项目这是正常结果。

## 6. 关键证据样本

- `sample::doc-README-md` README.md: sample/README.md
- `sample::file-src-app-ts` src/app.ts: sample/src/app.ts
- `sample::func-src-app-ts-answer` answer: sample/src/app.ts

## 7. 设计阅读顺序

1. 先读 `02-components.md`,确认组件、文件、服务和配置的边界。
2. 再读 `03-interfaces.md`,确认 endpoint/schema 是否足够支撑方案设计。
3. 接着读 `06-quality.md` 与 `07-risks-and-debt.md`,识别 NFR、风险和技术债是否已补齐。
4. 最后读 `13-pending-changes.md`,确认 CR 状态和未完成事项。

## 8. 架构判断边界

当前 v2.0 确定性扫描能可靠覆盖文件、函数、类、配置、文档、基础设施线索、仓内 import 边和保守跨仓引用边。
业务能力、NFR、风险、技术债属于 LLM 推断层,必须由对应 subagent 产出 confidence 与 evidence_refs 后才能进入 cross-repo.json。
当 graph 中缺少接口、数据模型或部署事实时,wiki 不得自行补事实,只能在已知局限中指出缺口。

## 9. 后续维护

每次代码结构变化后,应先用 fingerprint 判断 freshness,再决定是否跑增量 arch-analyze。
CR 和 ADR 写入后,应同步 cross-repo.json 的 change_requests、architecture_decisions 与 traceability。
wiki 只是人类视图,不得绕过 graph 直接承载新事实。

## 10. 本页生成协议

渲染器优先按 LLM wiki prompt 的章节协议组织内容;在没有运行时 LLM 的环境中,使用 graph 证据执行确定性兜底渲染。
兜底渲染仍需满足:内容充分、引用 graph node id、保留已知局限、不制造新事实。
本页至少包含仓库、节点、边、跨仓关系、证据样本、阅读顺序、判断边界和维护协议。
