# 反合理化清单(Anti-Rationalization Checklist)

> workflow 在每个 phase 启动前 + 关键决策点都会跑这套检查,封住 LLM 常见捷径。**每条命中 → workflow 显式拒绝 + 告知规则编号 + 等用户处理。**

---

## R1: 「先出报告,证据后补」

**触发条件**:
- skill 输出的 yaml 缺 `evidence_refs` 字段
- ADR 缺 `Evidence` 段
- 设计文档断言无回链
- 风险条目无 `evidence_refs` / `affected_files`

**Workflow 反驳**:"没证据 = 没产物。当前产出缺 evidence,reject。请补充证据或显式标 `evidence: not_available_because=<reason>`。"

**例外**:用户显式 override(必填理由,记 `state.yaml.overrides`)。

---

## R2: 「这仓看起来不重要」

**触发条件**:
- `arch-analyze --depth=manifest` 后,后续 depth(risk / model)排除了某些仓**但没解释为什么**
- judge 阶段对某仓标"no impact"但**没说**依赖图谱里这仓的位置

**Workflow 反驳**:"未进入 `仓库与组件清单.yaml` 前,不允许排除任何仓。若确实低优先级,请在 yaml 标 `priority: low + reason=<具体理由>`,而不是不出现。"

---

## R3: 「图可以凭描述画」

**触发条件**:
- `arch-diagram` 收到的输入不来自:
  - `仓库与组件清单.yaml` / `依赖与链路图谱.yaml`(现状图)
  - `项目总览.design_intent` / `影响面.yaml` / `options.md`(目标图)
  - 用户显式提供的 spec(且需写明 source)

**Workflow 反驳**:"架构图必须有数据来源。当前 diagram 请求没指明 source。请引用 yaml 路径或用户 spec,不允许凭对话上下文'想象'画图。"

---

## R4: 「风险先写几个典型」

**触发条件**:
- `风险与技术债台账.yaml` 条目缺以下任一字段:
  - `severity`(high/medium/low)
  - `affected_scope`(具体仓/服务/模块)
  - `mitigation`(处置建议)
  - `evidence_refs`(代码位置 / commit / 文档)

**Workflow 反驳**:"风险条目必须四件齐:严重度 + 影响范围 + 处置建议 + 证据来源。'XX 可能有问题'不是风险,是猜测。reject。"

---

## R5: 「PPT 只是汇报,不用太严格」

**触发条件**:
- `arch-pack --audience=management` 或 `--format=pptx/html` 产物中,任一关键数字 / 结论缺:
  - `source_evidence_id`(回链到 `决策与证据索引.yaml` 的某条目)
  - `generated_at`(派生时间)

**Workflow 反驳**:"汇报材料是派生产物,必须能回链事实源。摘要不能是新创作内容。请补 `source` 引用或从 evidence 删除该断言。"

---

## R6: 「先帮我改 src 业务代码」

**触发条件**:
- 用户在 design 流程中要求"顺便修一下 X 代码"
- 任何 skill 被请求产出 `*.ts/py/go/java/...` 业务代码文件
- 请求生成 IaC(Terraform/Helm/Pulumi)/ DDL 迁移脚本 / `.gitlab-ci.yml` / `.github/workflows/*` / 服务骨架

**Workflow 反驳**:"本套件只产**描述类**架构产物(md/yaml/mermaid/svg)。生成业务代码 / IaC / pipeline / DDL / 骨架超出边界。请使用 Cline / aider / 你的 IaC 工具完成实施。本流程会出实施方案.md 描述要做的事,但不替你做。"

---

## 执行机制

1. **每个原子 skill 在产出后,workflow 自动跑反合理化扫描**
2. 命中 → 写 `state.yaml.degradations` + 显示给用户:`违反规则 R<编号>:<规则名>`
3. 用户两选项:
   - 让 skill 重做(把违反内容当 prompt 反馈)
   - `override` 显式跳过(必填理由,记 `state.yaml.overrides`)

## 与验收 loop 的关系

反合理化是**预防**(产出时拦截),验收 loop 是**事后审计**(全部产出完检查)。两层叠加。

## v1.1 扩展

R6 之外的边界检查(例如"在 design 阶段擅自调用 arch-diff-judge 而没经过 frame")会在 v1.1 加。v1.0 先稳 R1-R6。
