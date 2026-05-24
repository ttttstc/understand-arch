# understand-arch

> 面向高级软件架构师的 evidence-driven workflow skill suite。
> **Governance-first(治理优先)。Brownfield 主战场。只产描述类输出。**

[English](./README.md) | [完整规格](./docs/spec-v1.0.md) | [贡献指南](./CONTRIBUTING.md)

**当前状态:v0.2.0(全骨架)**。10 个 skill 骨架已全部写完 + 设计规格完整,完整实现待 Codex 接手 —— 详见 [CONTRIBUTING.md](./CONTRIBUTING.md) 的 Build Order。

---

## 它做什么

一个 Claude Code 插件,含 **9 个原子 skill + 1 个 workflow 编排器**,产出:

- **5+1 YAML 证据资产** —— 项目总览 / 仓库清单 / 依赖图谱 / 风险台账 / 决策索引;+ 企业级知识库
- **6 页 Wiki** —— 给人类看的架构知识库导航层
- **ADR** —— append-only 架构决策史,永不修改
- **设计文档 + 17 章 SE 实施方案** —— 研发可直接开工级
- **架构图** —— Mermaid(默认) + 可选 fireworks-tech-graph 后端
- **架构评审报告** —— 文档评审 + 代码漂移检测双模式

**所有产出都是描述类**。**不生成业务代码、IaC、DDL、骨架代码**。这些用 Cline / aider / 你的 IaC 工具完成。

---

## 4 个 Workflow Mode

| 触发词 | Mode | 用途 |
|---|---|---|
| 接手 / 摸熟 / 全景 / 给个 overview / 这是个什么系统 | `onboard` | 接手不熟系统,完整测绘 |
| 架构审计 / 体检 / 健康度 / 审视当前项目 / 审视架构 | `audit` | 健康度评估 + 改造建议路线图 |
| 根据 PRD 设计 / 出 RFC / 出实施方案 / 迁移方案 | `design` | 需求/变更的架构设计,带 PRD HARD GATE |
| 准备汇报 / 给 CTO 一份 / 整理 PPT | `brief` | 受众适配的汇报材料 |

原子 skill 可直接调用:`/arch-adr`、`/arch-diagram`、`/arch-analyze --depth=manifest` 等。

---

## 与同类工具的差异

| 工具 | 定位 | 我们怎么互补 |
|---|---|---|
| [Understand-Anything](https://github.com/Lum1104/Understand-Anything)(22.7k⭐) | visualization-first(看懂代码) | governance-first(做架构决策) |
| [wshobson/agents](https://github.com/wshobson/agents)(35.8k⭐) | 散落角色 agent | 统一 workflow + 状态机 |
| aider / Cline | 代码生成 | 架构决策 + 决策记录(不生成代码) |

**学他们的好思路**(2 阶段代码分析、ADR 范式等),但**保持独立**——**无强制依赖**。

---

## 快速开始(v1.0 发布后)

```bash
# 安装
/plugin marketplace add ttttstc/understand-arch
/plugin install understand-arch

# 交互式 mode 选择
/arch

# 或直接进 mode
/arch:onboard ./my-system
/arch:audit
/arch:design --prd=./prd.md
/arch:brief --audience=cto
```

---

## 状态与路线图

| 版本 | 包含内容 |
|---|---|
| **v0.2.0(当前)** | **10 个 skill 骨架全部写完** + 完整设计规格 + `arch-library/` + `internal/` MANIFEST + Skill Regression Suite 占位 |
| **v1.0(目标)** | 9 个 skill 完整实现 + `arch-library/` 知识库 seed + 验收 loop + JSON schema |
| **v1.1** | Skill Regression Suite + ADR `fitness_spec` + `arch-knowledge` Tool Wrapper skill + 多模型 review |

完整规格见 [docs/spec-v1.0.md](./docs/spec-v1.0.md)。

---

## 文档

- **[docs/spec-v1.0.md](./docs/spec-v1.0.md)** —— v1.0 完整规格(canonical 参考)
- **[docs/office-hours-2026-05-24.md](./docs/office-hours-2026-05-24.md)** —— 设计诊断记录(premises + 8 founder signals + YAML schema 草图)
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** —— Build Order + 设计原则(Codex / Claude / 贡献者入口)

---

## License

MIT
