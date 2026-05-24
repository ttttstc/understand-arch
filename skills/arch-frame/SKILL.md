---
name: arch-frame
description: |
  架构问题界定(forward-looking)。把变更诉求 / brief / PRD / user story 翻译成结构化的「项目总览」:业务目标、范围、非功能需求、约束、假设、验收标准。同时:① 加载企业知识库(`~/.understand-arch/kb/`)注入 `org_constraints`;② LLM 识别 `architecture_profile`(架构风格 / 主要关切 / 推荐 references / 推荐 phases);③ 在 design mode 下对 PRD 做 clarity 检测,命中 ≥3 个具体未答问题强制产 `PM问题清单.md` 暂停 workflow(HARD GATE)。

  触发词:界定一下 / 问题是什么 / 范围 / scope / 约束 / 质量属性 / NFR / 验收标准 / 框定 / 解析 PRD / 需求拆解

  本 skill 不读代码,纯对话型。可独立用(澄清问题),也作为 workflow 启动入口。
---

# arch-frame — 问题界定 + KB 加载 + Profile 识别

> 回答"我们想干什么",不回答"系统是什么样"。

## 1. 角色定位

- forward-looking:界定**意图**,不分析**现状**(那是 arch-analyze 的事)
- 对话型:与用户交互问清问题
- 加载企业 KB 是它的额外职责(workflow 启动入口位置最合理)
- 输出供后续所有 skill 当 prompt context 用

## 2. 输入

- 变更诉求 / brief / PRD / user story / issue link / 文件路径
- 用户对话回答
- 企业 KB 路径(默认 `~/.understand-arch/kb/`,可由 workflow 传 `--kb-path`)
- (可选)调用上下文(workflow mode:onboard/audit/design/brief —— 决定 frame 风格)

## 3. 输出

- `${ARCH_PROJECT_DIR}/evidence/项目总览.yaml`(含 design_intent / architecture_profile / org_constraints)
- (HARD GATE 触发时)`${ARCH_PROJECT_DIR}/design-docs/{change-name}/PM问题清单.md`
- 返回 `readiness: ready|blocked`(workflow 决定下一步)

## 4. 行为(关键流程)

### 4.1 加载企业 KB(启动第一步)

读 `~/.understand-arch/kb/` 下 5 个 yaml:
- `banned-patterns.yaml`
- `compliance-redlines.yaml`
- `network-boundaries.yaml`
- `naming-conventions.yaml`
- `tech-radar.yaml`

加载失败分级:
- 目录不存在 → degrade-with-warning,`org_constraints` 标 `not_configured`,继续
- 某 yaml schema 不过 → **fail-loud**,告知用户哪个文件哪行,workflow 暂停
- 部分缺失 → 加载存在的,缺的标 `not_loaded`,继续

### 4.2 PRD / 输入解析(design mode 时)

支持输入:
- `.md` 文件路径
- 用户对话粘贴文本
- 多份 PRD(主 + 附录)
- (v1.0 不支持 `.docx` / Confluence URL,看反馈再做)

抽取要素:
- 业务目标 / 用户价值 / 验收标准
- 功能范围 + **non-goals**(强制问,non-goals 模糊是 HARD GATE 触发项)
- NFR(性能 / 可靠 / 安全 / 成本 / 合规)
- 显性约束 + **隐性约束**(团队规模 / 技术债容忍度 / 上线窗口 —— 主动问用户)
- 假设清单(标 `requires_confirmation: true` 的项进 HARD GATE 候选)
- 关联模块/服务(给后续 judge 用作搜索范围)

### 4.3 Clarity 检测 + HARD GATE(design mode)

检测 6 项,**任一命中 +1**,累计 ≥3 → 触发 HARD GATE:

| 检测项 | 例子 |
|---|---|
| 必填字段缺失 | 业务目标 / 验收标准 / 范围 完全没说 |
| 验收标准不可量化 | "低延迟"无数字 |
| NFR 关键维度未表态 | 可靠性 / 成本 / 安全 / 合规 关键项缺 |
| Non-goals 模糊 | 没说"不做什么" |
| 检测到歧义句 | "支持历史查询"但没说回看范围 |
| 关键依赖未明 | 没说接哪个上游 |

触发时产 `PM问题清单.md`(模板见 `references/pm-question-template.md`),返回 `readiness=blocked`。

### 4.4 Architecture Profile 输出

LLM 读 `arch-library/MANIFEST.md` + 当前上下文,输出 `architecture_profile`:
- `identified_styles`(微服务 / 事件驱动 / LLM 应用 + RAG ...)
- `primary_concerns`
- `recommended_references`(从 MANIFEST 挑)
- `recommended_phases`(从 `internal/phases/MANIFEST.md` 挑)
- `recommended_diagram_style`(给 `arch-diagram` 用)

workflow 展示后等用户确认/调整。

### 4.5 写 `项目总览.yaml`

按 `internal/schemas/项目总览.schema.json` 写。所有字段必带 `evidence_refs`(对应 PRD 段落引用)。

## 硬规则

- PRD ambiguity 命中 ≥3 项**必须** block,不允许"先继续后补"(违反 R1 反合理化)
- `org_constraints` 字段**必须**存在(可为 `not_configured`,不能省略)
- `architecture_profile` 必须经用户确认才视为 final(`confirmed_by_user_at` 必填)
- non-goals 字段**必须**显式问用户,不能省略(防方案越界)
- 加载 KB 时遇到 schema 错**必须** fail-loud,不允许静默忽略

## 验收(自检)

- `项目总览.yaml` 通过 `internal/schemas/项目总览.schema.json` 校验
- 所有字段含 `evidence_refs`(或显式标 `not_applicable`)
- HARD GATE 触发后 `PM问题清单.md` 存在 + state.yaml 写 `awaiting-pm-confirmation`
- `architecture_profile.recommended_references` 路径都在 MANIFEST 里(不能引用不存在的)
- `org_constraints` 字段对应 KB 状态(loaded / not_loaded / not_configured)

## 降级

| 场景 | 降级路径 |
|---|---|
| KB 缺 | 标 `not_configured`,继续(首次用户体验) |
| PRD 是 docx / 私有格式无法解析 | 提示用户转 md 或粘贴文本 |
| 用户拒答 PM 清单 | 允许 `override`(必填理由),后续方案可能基于错误前提的风险显式标注 |
| 用户反复改 architecture_profile | 至多 3 轮交互,再不定则用最后一版 + degraded 标记 |
| KB schema 不过 | fail-loud,workflow 暂停,要求用户修 yaml |

## 参考资料(Codex 创建)

- `references/prd-parsing-rules.md` —— PRD 解析的具体规则(段落抽取 / 关键词 / 反例)
- `references/architecture-profile-spec.md` —— profile 字段定义 + LLM 识别启发式
- `references/pm-question-template.md` —— `PM问题清单.md` 的固定模板
- `references/kb-loading-rules.md` —— 企业 KB 加载策略 + 错误处理
- `references/clarity-detection-rubric.md` —— 6 项 clarity 检测的具体判定标准

## Codex Implementation Notes

- 这个 skill 是 workflow 的入口,**容错性要好**(KB 缺 / PRD 模糊 / 用户回答不全 都要优雅处理)
- HARD GATE 是工程化保障,**不允许弱化**(reviewer 已 push 过,clarity 阈值必须可量化而非主观)
- `architecture_profile` 字段是后续所有 skill 路由的依据,LLM 识别质量很关键 —— 展开 `architecture-profile-spec.md` 时给充足的识别启发式
- `org_constraints` 加载是 v1.0 Gap A 落地点,**展开时不要漏**
- 对话风格:**架构师 office hours 风格**(直接、push 用户给具体答案、不接受"差不多就行")
