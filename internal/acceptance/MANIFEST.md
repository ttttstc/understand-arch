# internal/acceptance/ — Per-Mode Acceptance Checklists

> `arch-workflow` 在 workflow-end 读这些 yaml,跑语义 acceptance loop。每 mode 一份 checklist(`expected_outputs` + `quality_criteria`)。

## 文件

| 文件 | Mode | 用途 |
|---|---|---|
| `onboard.yaml` | onboard | Structural: 5 yaml + 6 wiki + ≥3 diagrams。<br>Semantic: 7/8 验收问题通过(允许 1 项 degraded)|
| `audit.yaml` | audit | Structural: 风险台账 + 技术债清单 + 评审报告 + 改造路线图。<br>Semantic: 风险按严重度排;每条风险 4 字段齐 |
| `design.yaml` | design | Structural: 4 强制 md + ADR 7 段 + 实施方案 17 章。<br>Semantic: 4 列权衡矩阵齐;回滚步骤可执行;**不允许 degraded** |
| `brief.yaml` | brief | Structural: 汇报包 + 管理层摘要 ≤1 页。<br>Semantic: 摘要数字回链 evidence |

## YAML 格式(canonical example)

```yaml
mode: onboard
structural_checks:
  - id: yaml-count
    description: "5 evidence yaml files exist"
    check: file_count_eq
    target: evidence/*.yaml
    expected: 5
  - id: wiki-pages
    description: "6 wiki pages exist"
    check: file_count_eq
    target: wiki/*.md
    expected: 6
  - id: diagrams-min
    description: "at least 3 diagrams"
    check: file_count_gte
    target: diagrams/*.{mmd,svg,png}
    expected: 3

semantic_checks:
  - id: q1-repos-and-responsibilities
    question: "What repos compose this system, what is each responsible for?"
    severity: required
    rubric:
      - Each repo in 仓库与组件清单.yaml has name + owner + responsibility
      - Wiki/01-系统全景.md lists all repos with their role
  - id: q2-key-business-flows
    question: "What are the 3 most critical business flows?"
    severity: required
    rubric:
      - 依赖与链路图谱.yaml has ≥3 named business flows
      - Each flow has sequence diagram in diagrams/
  - id: q3-top-5-risks
    question: "What are the 5 biggest architecture risks?"
    severity: required (≥3 to pass)
    rubric:
      - 风险与技术债台账.yaml has ≥3 risks with severity=high|medium
      - Each risk has affected_scope + mitigation + evidence_refs
  # ... (q4-q10)

threshold:
  structural: 100%    # 全部 structural 必须通过
  semantic: 7/8       # 允许 1 项 degraded
```

## Acceptance loop 行为

1. workflow 跑完 pipeline
2. 加载 `acceptance/{mode}.yaml`
3. 跑 structural checks(脚本,秒级)
4. structural 全过 → 跑 semantic(LLM subagent + rubric,**与原产 subagent 必须不同**)
5. 算通过数
6. 低于阈值 → retry 失败的 skill(最多 2 次)
7. 仍失败 → escalate 用户(retry hints / manual fix / override / abort)

详见 `arch-workflow/SKILL.md` §9。

## 实现状态

- v0.1.0(当前): MANIFEST 已写,4 个 yaml 文件**待 Codex 实现**
- v1.0: 4 个 yaml 全部实现 + workflow 集成
- v1.1: rubric 根据真实失败模式优化
