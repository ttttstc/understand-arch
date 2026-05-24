---
name: arch-options
description: |
  方案探索 + 权衡矩阵 + 选型。基于 arch-frame 的项目总览 + arch-analyze 的 baseline + (design mode 时) arch-diff-judge 的影响面,生成 2-3 候选方案并按 4 列强制矩阵(影响面 / 模块依赖变化 / 数据模型变化 / 回滚策略)做权衡。对照企业 KB(banned-patterns / compliance-redlines / tech-radar)做合规检查,违反则降级或拒绝。产 options.md + 更新决策与证据索引.yaml。

  触发词:几个方案 / 方案对比 / 选项 / options / 权衡 / trade-off / 取舍 / ABCDE 怎么选 / 该用哪种 / 评估方案 / 技术选型 / 选型 / X 和 Y 怎么选

  本 skill 不做现状分析(那是 arch-analyze)、不做影响推理(那是 arch-diff-judge)、不写代码、不替用户做最终选择(关键路口必须用户拍板)。
---

# arch-options — 方案探索 + 权衡

> 答 "几个候选方案、各自代价、推荐谁",不答 "现状是什么" 或 "改了会动什么"。

## 1. 角色定位

- 综合上游产物 → 给出 ≥2 候选方案 + 权衡矩阵 + 推荐
- **4 列强制权衡**:影响面 / 模块依赖变化 / 数据模型变化 / 回滚策略
- **对照企业 KB** 检查合规
- **关键路口**:展示方案对比 → 等用户选 → 之后才允许 arch-adr 接力
- `subagent: 可选`(方案探索阶段重时启动隔离;权衡矩阵在主上下文)

## 2. 输入

- `${ARCH_PROJECT_DIR}/evidence/项目总览.yaml`(含 design_intent + org_constraints)
- `${ARCH_PROJECT_DIR}/evidence/仓库与组件清单.yaml` + `依赖与链路图谱.yaml`
- (design mode)`${ARCH_PROJECT_DIR}/design-docs/{change-name}/影响面.yaml`
- (条件加载)`arch-library/{architecture_profile.recommended_references}/`
- 企业 KB(从 frame 已加载,在 项目总览.yaml.org_constraints)

## 3. 输出

- `${ARCH_PROJECT_DIR}/design-docs/{change-name}/options.md`
- 更新 `${ARCH_PROJECT_DIR}/evidence/决策与证据索引.yaml`(加候选方案 + 推荐)

## 4. 行为

### 4.1 加载上下文

- 读项目总览 / manifest / dep graph / 影响面 / org_constraints
- LLM 根据 `architecture_profile.recommended_references` 加载相关 references(微服务模式 / agent 架构 / 迁移模式...)

### 4.2 生成候选方案

- **默认 2-3 方案**。**单方案需说明 "为什么不拆第二方案"**
- 每方案描述:核心思路(1-2 句)/ 改动范围 / 技术栈 / 参考实现

### 4.3 4 列强制权衡矩阵

每方案必填:

| 列 | 内容 |
|---|---|
| **影响面** | 受影响 services / modules / apis / data / 配置(链回 影响面.yaml 条目) |
| **模块依赖变化** | 新增 / 修改 / 废弃依赖 + 跨层风险 + 循环依赖风险 |
| **数据模型变化** | 表 / 字段 / 索引 / 约束 + 迁移 + 回填 + 兼容策略 |
| **回滚策略** | 代码 / 配置 / 数据 / 灰度 / 开关的回退路径;不能回滚必标原因 + 补救方案 |

**缺任一列 → reject 不交付**(违反 R1 反合理化"先出报告证据后补")。

### 4.4 对照企业 KB 合规检查

- 加载 banned-patterns / compliance-redlines / tech-radar
- 每方案标记冲突:`violations: [{rule_id, severity, reason}]`
- 严重冲突 → 方案降级为"不推荐 + 原因"
- 全部方案都冲突 → workflow 回到 frame 要求 PM 确认是否豁免

### 4.5 推荐 + 不推荐原因

- 推荐方案 + 理由(显式说明适用前提)
- **每个不推荐方案必给原因**(不能只列 + 沉默)
- 输出 `recommendation` 字段在 决策与证据索引.yaml

### 4.6 等用户选(关键路口)

- 展示方案对比 + 推荐
- **不允许在用户未选定前调 arch-adr / arch-diagram / arch-pack**
- 用户可:选推荐方案 / 选非推荐方案(必填理由 → 记 overrides)/ 让 options 重出 / abort

## 硬规则

- **≥2 方案** OR 单方案必填 "why not split"
- **4 列权衡矩阵强制**,缺任一列 reject
- **推荐 + 每个不推荐都必填理由**
- 违反企业 KB **必显式标记**
- **关键路口必须等用户选**,不能默认推荐方案直接进 ADR

## 验收

- options.md 通过 `internal/schemas/options.schema.json`(v1.0 待 Codex 实现)
- 决策与证据索引.yaml 同步更新,含 candidates + recommendation
- 每方案 4 列齐
- 不推荐方案理由非空
- KB 对照结果记录到 yaml

## 降级

| 场景 | 行为 |
|---|---|
| 方案差异不显著 | 出 1 主方案 + 显式 "why not split B/C" 说明,readiness=degraded |
| 全部方案违反 KB | 回到 frame 要求 PM 决策是否豁免 |
| 输入信息不足(影响面缺) | 提示先跑 arch-diff-judge,workflow 自动接 |
| 用户反复让 options 重出(>3 轮) | 提示 "需求可能没界定清楚,建议回 arch-frame 重新框定" |

## References needed(Codex 创建)

- `references/option-template.md` —— options.md 固定结构
- `references/tradeoff-rubric.md` —— 4 列权衡的评分标准
- `references/org-conformance-check.md` —— 如何对照企业 KB
- `references/agent-architecture-considerations.md` —— AI 域专用考量(条件加载)

## Codex Implementation Notes

- 关键路口"等用户选"是强约束,不许默认选推荐方案进 ADR
- LLM 易倾向输出 1 个"完美方案",必须 push 它给真实 trade-off(2-3 方案 + 各有代价)
- agent 域设计时,4 列里"数据模型变化"= memory schema,"回滚策略"= fallback to deterministic path
- 对照企业 KB 时,LLM 易"自动豁免"违规(因为方案看起来对),必须把每条 violation 真实标出,不要润色
