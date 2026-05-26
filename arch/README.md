# `arch/` — Per-Project Architecture Workspaces

`arch/{project}/` 是每个项目的架构知识工作区。这里不再区分 `agent/` / `user/` 双桶，而是直接围绕稳定基线、变更请求、决策史和派生视图组织。

## 目录结构

```text
arch/{project}/
├── specs/                            # 100% 事实层(只有 yaml + Mermaid 图源)
│   ├── baseline.yaml                 # 含内嵌 capabilities[] 字段(v1.0 收敛)
│   ├── quality.yaml
│   ├── risks.yaml
│   ├── decisions.yaml
│   ├── traceability.yaml
│   └── diagrams/
├── decisions/                        # append-only ADR markdown(文件永不修改)
│   └── ADR-001-*.md
├── change-requests/
│   └── CR-YYYY-NNN-{slug}/
│       ├── cr.md
│       ├── impact.yaml
│       ├── review.yaml
│       ├── traceability.yaml
│       └── options.md
├── generated/                        # 可删可重建的人类视图
│   ├── overview.md                   # 1 页稳定入口(≤200 行)
│   ├── wiki/                         # 6 页 onboarding 展开(含 06-能力雷达)
│   ├── audit/                        # {date}-健康度.md(audit 收尾产)
│   ├── diagrams/                     # 渲染图(SVG/PNG)
│   └── briefs/                       # 受众化摘要
├── state.yaml                        # workflow 状态机(仅 arch-workflow 可写)
└── .metrics.jsonl
```

## 设计语义

- **`specs/` 100% 事实层** — 全是 schema-locked yaml + Mermaid diagram 源;**没有**任何 markdown 解释文件
- **`decisions/` append-only ADR** — markdown 文件 commit 后永远只读;supersede 关系全记在 `specs/decisions.yaml#superseded[]`
- **`change-requests/`**: 单次变更的 delta,不复制全量架构
- **`generated/` 可删可重建** — 含 `overview.md`(1 页稳定入口)+ 5 页 wiki + 渲染图 + briefs
- **`state.yaml`**: workflow 状态机、history、overrides、freshness 建议、下一步动作。**唯一可写者是 `arch-workflow`**;其他 skill 通过 `state_delta` 走 workflow merge

## 给人看的视图

- **`generated/overview.md`**: 1 页稳定入口,任何人第一次进入项目先读这一页(11 段固定结构,≤200 行硬上限)
- `generated/wiki/`: onboarding 展开视图,默认固定 5 页:
  - `01-系统全景.md`
  - `02-组件与依赖.md`
  - `03-数据与关键链路.md`
  - `04-质量属性与运行约束.md`
  - `05-风险、决策与近期变更.md`
- `generated/briefs/`: 面向管理层或特定受众的短摘要。

## 工作区如何创建

1. 用户运行 `/arch:onboard`
2. `arch-workflow` 创建 `arch/{project}/`
3. 从 `_template/` 复制基础结构
4. `arch-analyze` 产出第一版 specs
5. 之后的 `/arch:design`、`/arch:audit`、`/arch:brief` 都在同一工作区上增量更新

## 版本治理

- `decisions/` 和历史 CR 是架构史，默认 append-only。
- `generated/` 不是事实源，允许重建。
- `specs/` 允许通过 refresh 和 writeback 演进，但必须保留 traceability 与 evidence_refs。
