# understand-arch

> 给软件架构师的工作流套件 —— Claude Code 插件。

[English](./README.md) | [完整规格](./docs/spec-v1.0.md) | [贡献指南](./CONTRIBUTING.md)

**当前版本支持:Claude Code。**

---

## 这套件帮你做什么

把架构师日常的 4 类活动产品化:

### 接手不熟系统(`onboard`)

```
你说:  "帮我接手 ./order-system"
你得到:
  - 5 份 YAML 结构化证据(组件清单 / 依赖图 / 风险台账 / 决策索引 / 项目总览)
  - 6 页 Wiki(从首页开始读,目标 60-90 分钟看懂)
  - C4 现状架构图(Mermaid + 可选 SVG/PNG)
```

### 现状审计(`audit`)

```
你说:  "审视一下 order-system"
你得到:
  - 风险按严重度排序的台账
  - 技术债清单 + 影响范围
  - 改造路线图(短 / 中 / 长期)
```

### 根据 PRD 设计架构(`design`)

```
你说:  "根据 ./prd.md 设计架构"
你得到:
  - 2-3 候选方案 + 权衡矩阵(影响面 / 模块依赖 / 数据模型 / 回滚)
  - 选定方案的 ADR(架构决策记录)
  - 完整 RFC 设计文档
  - 17 章 SE 实施方案(研发可直接开工)
  - 目标架构图
```

**PRD 不清晰时**,工具会自动停下,产出 `PM问题清单.md`,等你和 PM 确认后才继续。

### 准备汇报(`brief`)

```
你说:  "给 CTO 出一份汇报"
你得到:
  - 受众适配的汇报包(HTML / PPT / markdown)
  - 管理层摘要(≤1 页,关键决策回链证据)
```

---

## 快速开始

### 安装

```bash
/plugin marketplace add ttttstc/understand-arch
/plugin install understand-arch
```

### 使用

**自然语言触发**(推荐):

| 你说 | 进入 |
|---|---|
| 接手 / 摸熟 / 全景 / 给个 overview | `onboard` |
| 架构审计 / 体检 / 审视架构 / 审视当前项目 | `audit` |
| 根据 PRD 设计 / 出 RFC / 出实施方案 / 迁移方案 | `design` |
| 准备汇报 / 给 CTO 一份 / 整理 PPT | `brief` |

**显式命令**:

```bash
/arch                          # 交互式选模式
/arch:onboard ./my-system
/arch:audit
/arch:design --prd=./prd.md
/arch:brief --audience=cto
```

**单项能力**(不走完整 workflow,适合小任务):

```bash
/arch-adr                      # 写一个架构决策记录
/arch-diagram                  # 画一张架构图
/arch-analyze --depth=manifest # 测绘单个仓
/arch-diff-judge               # 影响面分析
/arch-options                  # 评估几个方案
/arch-review                   # 评审设计 / 评 PR 架构漂移
/arch-radar                    # 业界对标 / 选型研究
```

---

## 产物存哪

默认 `arch/{project-name}/` 在 Claude Code 当前工作目录下:

```
arch/my-system/
├── evidence/         结构化证据(yaml,5 个)
├── wiki/             人类知识库(6 页)
├── diagrams/         架构图
├── adr/              决策记录(append-only,永不修改)
├── design-docs/      每次需求设计一个子目录
├── audits/           每次审计一份
└── briefs/           每次汇报一份
```

可通过 `output_path` 配置改到其它路径。

---

## 企业知识库(可选,推荐)

如果你的团队有约束(技术雷区 / 合规红线 / 命名规范 / 网络边界),放到 `~/.understand-arch/kb/`:

```
~/.understand-arch/kb/
├── banned-patterns.yaml
├── compliance-redlines.yaml
├── network-boundaries.yaml
├── naming-conventions.yaml
└── tech-radar.yaml
```

工作流自动加载,生成方案时对照检查,违规会显式标出。**不配置也能用**(套件优雅降级)。

---

## 架构图升级(可选)

默认 Mermaid 文本(GitHub / GitLab / VSCode 原生支持渲染)。

要 publication-ready 的 SVG / PNG?装上 [`fireworks-tech-graph`](https://github.com/yizhiyanhua-ai/fireworks-tech-graph):

```bash
/plugin install fireworks-tech-graph
```

工作流自动用 fireworks 出图。**不装也能用**。

---

## 边界

**只产架构描述类产物**:`*.md` / `*.yaml` / `*.mmd` / `*.svg+png`。

**不生成**业务代码 / IaC 脚本 / DDL 迁移脚本 / pipeline 模板 / 服务骨架。架构是认知,实施由专门的代码生成工具完成。

---

## 文档

- [完整规格](./docs/spec-v1.0.md) —— 套件 v1.0 的全部能力与契约
- [设计诊断记录](./docs/office-hours-2026-05-24.md)
- [贡献指南](./CONTRIBUTING.md)

---

## 状态

v0.2.0(全骨架)。10 个 skill 骨架已写,完整实现待接手。详见 [CONTRIBUTING.md](./CONTRIBUTING.md) 的 Build Order。

---

## License

MIT
