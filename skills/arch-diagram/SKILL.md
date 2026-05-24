---
name: arch-diagram
description: |
  架构图生成。fireworks-tech-graph 作主后端(若装) + Mermaid 作降级(永远可用)。支持图类型:C4(context/container/component)/ deployment / sequence / data flow。本质是 **translator + router**:把结构化输入(arch-analyze 的 model 产物 / arch-options 的目标设计 / 用户描述)翻译成对应后端的 prompt 或 Mermaid 语法,选 style,落盘,frontmatter 标 backend / source / generated_at / degraded 状态。

  触发词:画图 / 画架构 / 画一张 / 出图 / 画个 C4 / 拓扑图 / 部署图 / 时序图 / 数据流图 / 调用链 / 可视化 / 画出来看看 / 出架构图

  本 skill 不做架构分析(那是 arch-analyze),不做方案设计(那是 arch-options),不写代码,不替用户做样式选择(用户 override 优先)。
---

# arch-diagram — 架构图生成

> Translator + router。fireworks 出 SVG/PNG,Mermaid 永远兜底。

## 1. 角色定位

- 不创造架构(读上游),只渲染
- 后端:**fireworks-tech-graph(主)→ Mermaid(降级,永远可用)**
- `subagent: 否`(输入已被上游消化,纯模板转换)

## 2. 输入

- 图类型:`--type=c4-context|c4-container|c4-component|deployment|sequence|data-flow`
- 数据源:
  - `${ARCH_PROJECT_DIR}/evidence/仓库与组件清单.yaml` + `依赖与链路图谱.yaml`(现状图)
  - `${ARCH_PROJECT_DIR}/design-docs/{change}/options.md`(目标图)
  - 用户提供的 spec(`--spec=<text>` 或 `--spec-file=<path>`)
- (可选)`--backend=fireworks|mermaid|auto`(默认 auto)
- (可选)`--style=<name>`(覆盖默认 style 映射)

## 3. 输出

- `${ARCH_PROJECT_DIR}/diagrams/{name}.mmd`(Mermaid 源,**永远生成**)
- `${ARCH_PROJECT_DIR}/diagrams/{name}.svg` + `.png`(fireworks 渲染,可选)
- 每个文件含 frontmatter:`{backend, source, generated_at, degraded, degraded_reason, style, diagram_type}`

## 4. 行为

### 4.1 后端选择决策树

```
if --backend 显式指定:
  按指定执行(若 fireworks 不可用 → 报错 + 自动降级 Mermaid + 标 degraded)
else (auto):
  按使用场景:
    - audience=management/wiki/汇报 + fireworks 可用 → fireworks
    - audience=PR-review/dev-impl + 任何场景 → Mermaid(文本可 diff)
    - architecture_profile.recommended_diagram_style 优先于场景默认
  fireworks 可用性检测:
    - fireworks-tech-graph plugin 已装 → 可用
    - cairosvg / rsvg-convert / puppeteer 至少 1 个可用 → PNG 导出可能
    - 否则 → 仅 SVG 可生成
    - 完全不可用 → 走 Mermaid
```

### 4.2 Style 映射(用户未指定时的默认)

| 图类型 | 默认 style(fireworks) | Mermaid 对应 |
|---|---|---|
| C4 context / 系统全景 | style 1 (Flat Icon) 或 6 (Claude Official) | `C4Context` |
| C4 container / **微服务拓扑** | **style 3 (Blueprint)** | `C4Container` |
| Deployment | style 3 (Blueprint) | `flowchart` |
| Sequence | fireworks UML | `sequenceDiagram` |
| Data flow | style 1 (Flat Icon) | `flowchart` |
| **AI / agent 架构** | **style 5 (Glassmorphism)** | `flowchart with subgraph` |

### 4.3 Translate 输入 → backend prompt

- **fireworks**:输出自然语言 prompt(参考 `references/fireworks-prompt-templates.md`)
- **Mermaid**:按 `references/mermaid-templates.md` 生成 .mmd 文本

### 4.4 调用后端

- **fireworks**:通过 skill-chaining 调 `fireworks-tech-graph` skill
- **Mermaid**:直接写 .mmd 文件(用户可用任何 Mermaid 渲染器渲染:GitHub / GitLab / VSCode 都原生支持)

### 4.5 Frontmatter 强制

每个图文件首部:
```yaml
---
backend: fireworks|mermaid
source: <yaml/spec 路径或描述>
generated_at: ISO-8601
degraded: true|false
degraded_reason: <if true>
style: <style name>
diagram_type: c4-container|...
---
```

## 硬规则

- 每个图**必须有数据来源**(yaml 路径 或 用户 spec),违反 R3 反合理化("图凭描述画")→ reject
- `frontmatter.backend + degraded` **必填**(透明度)
- **Mermaid 永远生成**(即便 fireworks 成功,.mmd 也要落盘)—— 因为 .mmd 可 diff、可重复使用
- fireworks 失败**必须 auto-fallback 到 Mermaid + 显式标 degraded**(不允许静默失败)
- 不允许跨类型混合(一个 c4-container 文件里出现 sequence)

## 验收

- `.mmd` 文件 Mermaid 解析无报错
- `.svg` 文件(若生成)有效 XML
- frontmatter 完整且字段对应实际(`backend` 字段与实际后端一致)
- backend 选择决策可追溯(若 `degraded=true`,`degraded_reason` 非空)

## 降级

| 场景 | 行为 |
|---|---|
| fireworks-tech-graph skill 未装 | 自动 Mermaid;frontmatter `degraded: true, degraded_reason: fireworks_not_installed`;告知用户"建议安装 fireworks 升级视觉化" |
| 装了但 cairosvg/rsvg/puppeteer 全缺 | 仅产 SVG,不产 PNG;`degraded: true (png_export_unavailable)` |
| 自动 spec → fireworks prompt 翻译失败 | 降级 Mermaid + 提示 "spec 过复杂,自动翻译失败,可手动调 fireworks skill 直接出图" |
| 仓库无 Mermaid 渲染器 | 仅 .mmd 文本(GitHub / GitLab / VSCode 都原生支持渲染) |
| 输入 yaml 缺关键字段 | reject + 提示具体缺什么 |

## References needed(Codex 创建)

- `references/backend-selection-rules.md` —— 决策树细化
- `references/style-mapping.md` —— 类型 × 受众 × style 矩阵
- `references/fireworks-prompt-templates.md` —— 每种图的 fireworks prompt 模板
- `references/mermaid-templates.md` —— 每种图的 Mermaid 语法模板
- `references/frontmatter-spec.md` —— frontmatter 字段定义

## Codex Implementation Notes

- 这个 skill 是 translator,**不要塞图分析逻辑** —— 输入决定输出,不要"优化"图内容
- fireworks-tech-graph 是 7k⭐ 独立 skill,通过 skill-chaining 调用 —— **不在 prompt 里复述它的 API**,引用即可
- **Mermaid 永远生成** 是 v1.0 关键(无强制依赖 fireworks)
- 当 `--type=sequence` 且 fireworks 不可用时,Mermaid 的 `sequenceDiagram` 完全够用 —— **不要降级 readiness**
