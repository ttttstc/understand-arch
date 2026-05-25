# understand-arch

> 面向 Claude Code 的 Docs-as-Code 架构知识套件。

[English](./README.md) | [完整规格](./docs/spec-v1.0.md) | [贡献指南](./CONTRIBUTING.md)

## 它现在的定位

`understand-arch` 不再追求“为每次需求生成一大包文档”，而是维护一套长期可信的架构知识底座：

- `specs/`：稳定架构基线
- `change-requests/CR-*`：单次变更的 delta
- `decisions/`：append-only ADR
- `generated/`：给人看的可重建视图

## 对用户暴露的入口

v1.0 第一版只暴露 4 个入口：

- `/arch:onboard`：建立或刷新 `specs/`
- `/arch:design`：针对一次需求创建 CR 并完成技术设计
- `/arch:audit`：审视当前 `specs` 是否完整、可信、过期，必要时建议 refresh
- `/arch:brief`：从 `specs / CR / ADR` 生成 wiki、brief、report

## 工作区结构

```text
arch/{project}/
├── specs/
├── decisions/
├── change-requests/
├── generated/
├── state.yaml
└── .metrics.jsonl
```

## 边界

允许产物：

- `*.md`
- `*.yaml`
- `*.mmd`
- `*.svg|*.png`

禁止产物：

- IaC
- DDL / migration
- CI workflow
- 服务骨架
- 业务代码

## 状态

当前仓库正从旧的“交付件工厂”模型迁移到新的 `specs + CR + governance` 模型。规范以 [docs/spec-v1.0.md](./docs/spec-v1.0.md) 为准。
