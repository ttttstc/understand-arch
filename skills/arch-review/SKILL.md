---
name: arch-review
description: |
  架构评审。**双模式**:① **doc mode**(默认)—— 评设计文档质量,主上下文,产 readiness;② **code mode** —— 评 PR / 代码库的架构漂移,**必 subagent**,对照已有 ADR + 目标架构。同时跑 **org-conformance** 检查(对照企业 KB 的 banned-patterns / compliance-redlines)。风险按严重度排序输出。v1.1 加 **fitness mode**(主动跑所有 ADR 的 fitness_spec)。

  触发词(doc mode):评审这设计 / 这设计能用吗 / 设计合理吗 / 把把关 / sanity check / 评审
  触发词(code mode):PR review / 这 PR 看一下 / 这次改动是不是偏了 / 漂移 / drift / 合不合规 / 符不符合架构 / conformance check / 架构漂移

  本 skill 不修复 finding(只识别),不写代码,不替用户决策 readiness=ready 与否(展示证据,用户拍板)。
---

# arch-review — 架构评审

> doc / code 双模式。前者主上下文,后者必 subagent。

## 1. 角色定位

- 评审 = 找问题 + 分级 + 给证据,**不修问题**
- **doc mode**:评设计文档(决策质量、完整性、readiness)
- **code mode**:评代码(架构漂移、目标架构偏离)
- 同时跑 **org-conformance**(对照企业 KB)
- v1.1:**fitness mode**(跑所有 ADR 的 fitness_spec)
- `subagent: code mode 必须 / doc mode 否 / fitness mode 必须(v1.1)`

## 2. 输入

### doc mode

- 设计文档路径:`${ARCH_PROJECT_DIR}/design-docs/{change}/design-doc.md`(或显式 `--doc=<path>`)
- ADR(`${ARCH_PROJECT_DIR}/adr/`)
- 影响面.yaml / options.md / 4 强制 md / 实施方案.md
- `org_constraints`(从 项目总览.yaml)

### code mode

- PR diff 或代码库路径(`--pr=<NNN>` 或 `--repo=<path>`)
- 目标架构:`${ARCH_PROJECT_DIR}/adr/` 中 `status=accepted` 的 ADR + `evidence/依赖与链路图谱.yaml`
- `org_constraints`

## 3. 输出

- doc mode:`${ARCH_PROJECT_DIR}/design-docs/{change}/arch-review.md`
- code mode:`${ARCH_PROJECT_DIR}/reviews/pr-{NNN}-{date}.md`
- 必含:`readiness: ready|degraded|blocked` + 按严重度排序的 finding 列表

## 4. 行为

### 4.1 Mode 检测

- 显式 `--mode=doc|code|fitness`
- 触发词推断
- 默认 doc

### 4.2 doc mode 评审项(主上下文)

| 评审项 | 检查 |
|---|---|
| **Readiness 完整性** | 4 强制 md 齐?ADR 7 段齐?实施方案 17 章齐? |
| **决策质量** | options 4 列权衡齐?推荐有理由?Alternatives 非空? |
| **Evidence 可追溯** | 每条断言回链 yaml / code? |
| **Org-conformance** | 设计是否违反 banned-patterns / compliance-redlines? |
| **ATAM 权衡点** | 关键 trade-off 是否显式? |
| **风险完整性** | Top 5 风险是否被识别且各有 mitigation? |

### 4.3 code mode 评审项(subagent)

| 评审项 | 检查 |
|---|---|
| **架构漂移** | 实际依赖图是否偏离目标架构(ADR + dep graph)? |
| **跨层调用** | PR 是否引入禁止的跨层引用(对照 banned-patterns) |
| **数据库直访** | PR 是否绕过约定的访问层? |
| **API 契约** | 接口变更是否破坏向后兼容? |
| **测试覆盖** | 改动模块的测试是否同步更新? |
| **命名规范** | 对照企业 KB 的 naming-conventions |

### 4.4 Severity 分级

- 🔴 **error**:阻塞 readiness(架构漂移、安全违规、不可回滚改动)
- 🟡 **warning**:不阻塞但应修(命名不规范、文档缺失)
- ℹ️ **info**:优化建议(可读性、性能小优化)

### 4.5 Readiness 决策

- 任何 error → `blocked`
- 仅 warning → `degraded`
- 全过 → `ready`
- **必有据**:决策回链具体 finding ID

### 4.6 输出格式

按严重度排序,每 finding 含:
```yaml
- id: F-001
  severity: error|warning|info
  category: drift|conformance|completeness|...
  location: file:line:commit OR doc-section
  description: ...
  evidence_ref: ...
  suggested_fix: ...
```

## 硬规则

- **code mode 必 subagent**
- **readiness 决策必有据**(回链 finding)
- 每 finding **必带 evidence_ref**(违反 R1)
- 风险按**严重度排序**输出,不能无序(违反 R4)
- **org-conformance 检查强制**(不允许跳过)
- **ATAM 权衡点必体现**在 doc mode 评审中

## 验收

- arch-review.md 通过 `internal/schemas/arch-review.schema.json`(v1.0 待 Codex 实现)
- readiness 决策有据(决策段引用具体 finding)
- 漂移 finding(code mode)回链代码位置(file:line:commit)
- 至少 1 条建议(若无 finding,显式 "no issues found")

## 降级

| 场景 | 行为 |
|---|---|
| 目标架构定义不全(无 ADR + dep graph) | code mode 降级,仅做"独立 sanity"评审,标 degraded |
| 代码无法解析(语言不支持) | code mode 退到"文件级"漂移(目录 / 文件存在性检测) |
| 企业 KB 缺 | 跳过 org-conformance,标 degraded |
| PR 过大(>500 文件) | 提示用户切分;subagent 按目录拆分并行评审 |
| fitness_spec 不可执行(v1.1) | 标 `inconclusive`,提示 ADR 作者修 spec |

## References needed(Codex 创建)

- `references/review-rubric-doc.md` —— doc mode 评审 checklist
- `references/review-rubric-code.md` —— code mode 评审 checklist
- `references/drift-detection-rules.md` —— 漂移如何识别(基于 ADR + dep graph)
- `references/org-conformance-check.md` —— 对照企业 KB 的检查流程
- `references/severity-rubric.md` —— error/warning/info 判定标准

## Codex Implementation Notes

- **code mode subagent 是 v1.0 关键** —— 不允许 review 100K LOC 在主上下文做
- 评审找问题但**不修**,这是 review 的边界(修是开发的事)
- readiness 决策是**给用户拍板的依据**,不是 skill 自己决定 "go/no-go"
- v1.1 fitness mode 占位字段:`--mode=fitness`,等 ADR 累积 + fitness_spec 实现后激活
