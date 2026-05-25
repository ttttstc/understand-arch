# arch-adr Playbook

## 1. 什么时候值得写 ADR

满足任意一条就应考虑：

- 该决策会影响后续多个 CR
- 会改变组件边界、接口边界、数据边界
- 会影响组织约束、部署模式、技术选型
- 若不记录，团队很快会忘记“为什么这么定”

## 2. 不该写 ADR 的内容

- 纯实现细节
- 一次性 workaround
- 只影响一个小函数或单文件的取舍

## 3. 最小结构

1. Context
2. Decision
3. Consequences
4. Alternatives
5. Evidence

## 4. append-only 规则

- 不重写既有 ADR 正文
- 变更方向用 supersede
- 索引同步到 `specs/decisions.yaml`

## 5. 模板使用

- 新 ADR 先套 `adr-template.md`。
- `Supersedes`、`Supersede Notes`、`v1.1 Fitness Spec Placeholder` 三个区域默认保留，不要擅自删空标题。
