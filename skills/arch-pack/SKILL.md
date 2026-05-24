---
name: arch-pack
description: |
  受众适配交付。**audience × format 矩阵**适配,汇编上游产物(**不重新发明**)产出最终交付包。design mode 强制 9 文件(4 强制 md + options + ADR + design-doc + **实施方案.md 17 章** + 图规格)。onboard mode 产 6 页 wiki。audit mode 产评审报告 + 改造路线图。brief mode 产受众适配汇报。

  audience:`onboarding | decision | dev-implementation | management`
  format:`wiki | md | html | pptx`
  触发词:汇编 / 出文档 / 整理交付件 / 打包 / 出 RFC / 出设计文档 / 出实施方案 / 出 wiki / 整理给 X 看 / 出汇报

  本 skill 只汇编不重新发明(读上游 yaml + md,组装产物),不写代码,不替用户决定 audience(用户 / workflow 指定)。
---

# arch-pack — 受众适配交付

> 上游产物汇编器。不发明内容,只组装格式。

## 1. 角色定位

- 读全部上游产物 → 按 audience + format 组装
- **4 audience × 4 format 矩阵**
- design mode **9 文件强制** + 实施方案 **17 章强制**
- `subagent: 否`(纯模板渲染,无需重型推理)

## 2. 输入

- 全部 `${ARCH_PROJECT_DIR}/evidence/*.yaml`
- 全部 `${ARCH_PROJECT_DIR}/adr/*.md`
- (design mode)`${ARCH_PROJECT_DIR}/design-docs/{change}/*`
- (audit mode)风险台账 + arch-review 输出
- `--audience=<onboarding|decision|dev-implementation|management>`
- `--format=<wiki|md|html|pptx>`

## 3. 输出

按 mode 不同:

- **onboard mode**:`${ARCH_PROJECT_DIR}/wiki/` 6 页(首页 / 01-系统全景 / 02-现状架构 / 03-关键业务链路 / 04-风险与技术债 / 05-决策与待办)
- **design mode**:`${ARCH_PROJECT_DIR}/design-docs/{change}/` 9 文件(见 §4.3)
- **audit mode**:`${ARCH_PROJECT_DIR}/audits/{date}/` 评审报告 + 路线图
- **brief mode**:`${ARCH_PROJECT_DIR}/briefs/{audience}-{date}/` 汇报包

## 4. 行为

### 4.1 加载上游

- 扫 `${ARCH_PROJECT_DIR}` 所有产物
- 按 mode 确定关键输入

### 4.2 Audience → 模板选择

| Audience | 模板特征 |
|---|---|
| `onboarding` | wiki 风,导航 + 索引;每页 ≤500 行;首页是导航不是内容 |
| `decision` | 决策导向;Top N 风险 + 推荐 + 影响估算;**摘要 ≤1 页** |
| `dev-implementation` | **实施方案 17 章**;研发可直接开工;每章可执行项明确 |
| `management` | 业务语言 + 量化影响;无技术术语堆砌;摘要 + 决策点 + 资源诉求 |

### 4.3 design mode 9 文件强制清单

```
design-docs/{change-name}/
├── frame.yaml                    (来自 arch-frame)
├── 影响面.yaml                    (来自 arch-diff-judge)
├── options.md                    (来自 arch-options)
├── 影响面清单.md                 (pack 派生)★ 强制
├── 模块依赖变化.md               (pack 派生)★ 强制
├── 数据模型变更.md               (pack 派生)★ 强制
├── 回滚方案.md                   (pack 派生)★ 强制
├── ADR-NNN-xxx.md                (来自 arch-adr,同步进 ../adr/)
├── design-doc.md                 (pack 汇编,RFC 级)
└── 实施方案.md                   (pack 汇编,SE 细化设计,17 章)
```

**缺任一文件 → `readiness=blocked`,不交付**。

### 4.4 实施方案 17 章固定结构

```markdown
1. 需求摘要 + 验收标准      (from frame)
2. 目标实现架构              (from options 选定 + diagram)
3. 受影响服务与模块          (from judge,链回 影响面.md)
4. 接口设计                  (from judge.apis,扩展)
5. 数据模型变更              (链回 数据模型变更.md)
6. 权限与安全设计
7. 关键流程与时序            (链回 diagram 时序图)
8. 错误处理与降级策略
9. 配置与发布策略
10. 数据迁移与回填方案        (链回 回滚方案.md)
11. 测试计划                  (单测/集成/回归/灰度)
12. 可观测性与告警            (日志/指标/链路/告警)
13. 实施任务拆解              (按角色 + 工作量 S/M/L)
14. 联调与发布顺序            (DAG + 里程碑)
15. 兼容性处理                (老客户端 / 历史数据)
16. 风险清单 + 缓解            (按严重度)
17. 研发注意事项
```

**每章必有内容**;无法填的标 `not_applicable: <reason>`,**不许直接空**。

### 4.5 Format 渲染

- `wiki/md` → 直接 markdown
- `html` → 用模板转(`internal/templates/html/` v1.0 占位 → Codex 实现)
- `pptx` → 用模板转(`internal/templates/pptx/` v1.0 占位 → Codex 实现)

### 4.6 Frontmatter 与 traceability

- 每个 pack 产物 frontmatter:
  ```yaml
  generated_at: ISO-8601
  generated_by: arch-pack
  audience: onboarding|...
  format: wiki|md|html|pptx
  source_artifacts: [list of paths]
  ```
- 任何数字 / 结论可回链 `source_artifacts`

## 硬规则

- **只汇编不重新发明** —— 任何 pack 产物的内容必须来自上游产物;无中生有违反 R1/R5
- **design mode 9 文件不可缺**,缺 → blocked
- **实施方案 17 章每章必有内容**(可标 `not_applicable + reason`)
- **readiness blocked 必回炉**,不允许 override 跳过
- **management/decision audience 必有 source 回链**(违反 R5)
- 不产代码、IaC、骨架(根本边界)

## 验收

- 所有强制文件存在
- 实施方案 17 章每章有内容或 `not_applicable`
- frontmatter `source_artifacts` 字段完整
- 引用上游产物的位置准确(不悬挂)
- 4 audience 各自模板特征体现(decision 摘要 ≤1 页;onboarding 首页是导航)

## 降级

| 场景 | 行为 |
|---|---|
| 上游产物缺(如 ADR 未生成) | `readiness=blocked`,提示先跑哪个 skill |
| 用户主动跳过某文件(如 brief mode 不要 pptx) | 允许,但记 overrides |
| 实施方案某章 not_applicable | 允许,但 `reason` 必填 |
| html/pptx 模板未实装(v1.0) | 降级 markdown,提示 "格式 X v1.1 支持" |
| audience 与产物不匹配(如 management 要 dev-implementation 详细级) | 提示用户确认 audience |

## References needed(Codex 创建)

- `references/audience-templates/` —— 4 audience 各自的模板(目录)
- `references/format-renderers/` —— md / html / pptx 渲染器规范
- `references/implementation-plan-17-chapters.md` —— 17 章详细 schema + 各章必填字段
- `references/wiki-pages-template/` —— 6 页 wiki 模板(目录)
- `references/source-traceability.md` —— frontmatter source_artifacts 规则

## Codex Implementation Notes

- **"只汇编不发明" 是 pack 的灵魂** —— 任何"为了好看"的额外创作都违规
- 17 章是从研究文档 §3.7 SE 细化设计承袭来的,**不要删章节**
- 4 强制 md 内容大量与 options/judge 重叠,pack 的工作是**按受众重组**,不是复述
- html/pptx 模板 v1.0 可降级 md;v1.1 用现成工具(pandoc / reveal-md / 等)实现
