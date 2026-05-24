---
name: arch-diff-judge
description: |
  变更影响识别(假设性分析)。回答「改 X 会动什么」。需要 change request(变更诉求)作为强制输入,基于 arch-analyze 的 baseline 推断受影响的服务 / 模块 / API / 数据模型 / 事件 / 权限 / 部署 / 配置。产 `影响面.yaml`。**必须 subagent 隔离**(读代码 + 假设推理 token 消耗大)。

  触发词:影响面 / 改 X 会动什么 / blast radius / 波及面 / 评估这个需求 / 这个改动会影响哪 / 触及面 / 关联改动 / 改了会炸 / impact analysis

  本 skill 是 design mode 的关键 phase。不做现状描述(那是 arch-analyze)、不出方案(那是 arch-options)、不写代码。
---

# arch-diff-judge — 变更影响识别

> 回答"改 X 会动什么",backward 看 baseline + forward 假设变更。

## 1. 角色定位

- 假设性分析(hypothetical):不读真实变更代码,基于变更**描述**推断
- 必须 subagent:推理过程消耗大,且要读 baseline yaml + 部分代码细节
- 强依赖:必须有 `arch-analyze` 的 manifest baseline 才能跑
- 强依赖:必须有 change request 输入

## 2. 输入

- `${ARCH_PROJECT_DIR}` —— 工作目录
- **change request**(强制):
  - 来自 `项目总览.yaml.design_intent`(workflow context)
  - 或显式 `--change="..."` 传入
- baseline:
  - `evidence/仓库与组件清单.yaml`
  - `evidence/依赖与链路图谱.yaml`
  - (可选)`evidence/风险与技术债台账.yaml`(用于关联风险)

**无 change request 必拒绝跑**,提示用户先调 `arch-frame` 把变更结构化。

## 3. 输出

- `${ARCH_PROJECT_DIR}/design-docs/{change-name}/影响面.yaml`
- 更新 `evidence/决策与证据索引.yaml`(影响面引用)

## 4. 行为(关键流程)

### 4.1 输入校验

- change request 为空 → 拒绝,提示先 `arch-frame`
- change request 过于模糊(无具体改动点)→ **先调 arch-frame 把变更结构化**,完成后再回来
- baseline manifest 缺 → 提示先 `arch-analyze --depth=manifest`(或 workflow 自动接)

### 4.2 加载 baseline 到 subagent

prompt template 给 subagent 的输入:
- 完整 manifest yaml
- 完整 dep graph yaml
- change request(结构化)
- analysis hints(从 risk yaml 提取相关风险)

### 4.3 影响推理(subagent)

按维度推理,每条产出含 `evidence_refs`:

| 维度 | 内容 |
|---|---|
| `services` | 受影响服务清单(change_type: add/modify/deprecate)+ owner |
| `modules` | 受影响模块 + 依赖变化方向 + 跨层耦合风险 |
| `apis` | 接口契约变化(新增 / 修改 / 弃用)+ 兼容策略 |
| `data_models` | 表 / 字段 / 索引 / 约束变化 + 迁移 + 回填 + 兼容 + 回滚 |
| `events_messages` | 事件 / 消息 schema 变化 + 兼容 |
| `permissions` | 权限边界 / 鉴权 / 审计影响 |
| `deployments` | 部署单元变化 + 发布顺序 |
| `configs` | 配置 / 开关变化 + 回退 |

每个 affected 条目格式见 `references/impact-categories.md`。

### 4.4 Scope Boundary(强制三段)

明确"改与不改"边界:
```yaml
scope_boundary:
  must_change: [id]           # 必改
  may_change: [id]            # 可能改
  should_not_change: [id]     # 明确不改(防方案越界)
```

### 4.5 衍生风险(不重复 risk-scan)

只产出**因变更而新增**的风险,不复制 `风险与技术债台账.yaml` 已有内容。重叠时用 `related_existing_risk: <risk_id>` 引用。

### 4.6 写产物

按 `internal/schemas/影响面.schema.json` 写到 `design-docs/{change-name}/影响面.yaml`。

## 硬规则

- **change request 强制**,无则拒绝
- **必 subagent** 隔离
- **必依赖 manifest baseline**,无则要求先跑 analyze(或 workflow 自动接)
- **`scope_boundary` 三段必填**(must/may/should_not 都要)
- **每个 affected 条目必含 `evidence_refs`**(违反 R1)
- **不复制现有风险**,重叠用 `related_existing_risk` 引用
- **不写代码 / 不给方案**(那是 arch-options 的事)
- **变更模糊时强制回 arch-frame**,不允许"我猜你想改什么"

## 验收(自检)

- `影响面.yaml` 通过 schema 校验
- 7 个维度都涵盖(无变化的标 `no_impact + reason`,不能省略)
- 每个 affected 条目有 `id + change_type + evidence_refs`
- `scope_boundary` 三段齐全
- `data_models` 变化每个有 `migration + backfill + compat + rollback`(design mode 强制)
- 衍生风险标记 `derived_from_change: true`,与现有风险有引用关系

## 降级

| 场景 | 降级路径 |
|---|---|
| change request 模糊 | 调 arch-frame 结构化,完成后回来 |
| baseline manifest 缺 | 提示先 analyze;workflow 模式下自动接 |
| 数据模型推理无 schema 文件可读 | 标 `data_model_inference: best_effort`,提示用户人工核对 |
| subagent 跑挂 | retry 1 次;再挂 → 标 phase blocked,提示 manual 估计 |
| 跨大量仓的影响推理(超阈值)| 拆分按仓 subagent 并行,合并结果 |

## 参考资料(Codex 创建)

- `references/change-request-parsing.md` —— 变更诉求结构化要求(从 frame 接 OR 直接传)
- `references/impact-categories.md` —— 7 维度的字段定义 + 推理启发式
- `references/subagent-prompt-template.md` —— judge subagent 的 prompt 模板
- `references/scope-boundary-rubric.md` —— must/may/should_not 判定规则
- `references/data-model-impact-rules.md` —— 数据模型变化的迁移/回填/兼容推理

## Codex Implementation Notes

- judge 的产物是 design mode 后续阶段的关键输入,**字段完整性必须严格**(reviewer 会回炉)
- `data_models` 这一维特别重要(用户研究文档反复强调),展开时给充足模板
- 推理质量取决于 baseline 完整性,subagent prompt 要明确说"基于以下 baseline 推理,无 baseline 支持的不要瞎猜"
- `scope_boundary.should_not_change` 是降噪关键 —— 明确告诉后续 options 阶段"这些不要改"
- 跨仓影响:不要让 subagent 一次吃所有仓,按 service-by-service 拆分 prompt
