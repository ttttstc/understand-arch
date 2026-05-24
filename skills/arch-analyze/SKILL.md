---
name: arch-analyze
description: |
  全面分析项目架构现状(backward-looking)。回答「这系统是什么样、哪儿不对」。4 档深度可独立或组合:`manifest`(仓库清单+依赖图)、`model`(C4 现状视图)、`risk`(风险与技术债)、`full`(三档全做)。**所有 depth 必须 subagent 隔离**(整个代码库是输入,主上下文吃不下)。多仓时并行 subagent。

  触发词:测绘 / 摸底 / 扫一下 / 梳理 / 服务清单 / inventory / 仓库地图 / 出 C4 / 画现状架构 / 服务依赖图 / 找风险 / 找耦合 / 找雷 / 哪里不能动 / 技术债 / 高耦合 / 测试薄弱区 / 全面分析 / 摸熟 / 体检 / 扫描架构

  本 skill 不做评估之外的假设性分析(那是 arch-diff-judge 的事),不写代码,不评估未来变更。
---

# arch-analyze — 全面分析架构现状

> 回答"这系统是什么样、哪儿不对",不回答"我们想干什么"或"改 X 会动什么"。

## 1. 角色定位

- backward-looking:描述 + 评估**现状**
- subagent-heavy:整个代码库是输入,**必须**隔离主上下文
- baseline 提供者:产出供后续 arch-diff-judge / arch-options / arch-review 用
- 缓存友好:二次跑同 project 检测 commit hash 漂移决定是否重做

## 2. 输入

- `${ARCH_PROJECT_DIR}` —— 工作目录(写产物用)
- 代码库路径(单仓 或 多仓清单,workflow 注入)
- `--depth` 参数:`manifest|model|risk|full`(默认 manifest)
- (可选)`--repos=<repo1,repo2>` 限定深挖范围(多仓场景)
- (可选)`--force-refresh` 跳过缓存

## 3. 输出

按 depth 不同:

| Depth | 产出 |
|---|---|
| `manifest` | `${ARCH_PROJECT_DIR}/evidence/仓库与组件清单.yaml` + `evidence/依赖与链路图谱.yaml` |
| `model` | + `${ARCH_PROJECT_DIR}/evidence/现状架构.md` + `diagrams/c4-context.mmd` + `c4-container.mmd` + `c4-component.mmd`(关键服务) |
| `risk` | + `evidence/风险与技术债台账.yaml` |
| `full` | 上面三档全做 |

每个产物 frontmatter 含:`baseline_commits`(每仓的 commit hash)+ `generated_at`。

## 4. 行为(关键流程)

### 4.1 Baseline source 选择(开始之前必检)

| `--baseline-source` 值 | 行为 |
|---|---|
| 未传(默认) | 全仓扫描(deterministic script + subagent),完整自给 |
| `<path>/wiki/` 或 markdown 目录 | 读 markdown 知识库(LLM wiki / Karpathy 模式 / 内部 Confluence 导出),adapter subagent 提结构,产**我们的** yaml 格式,字段 `source: external_kb` |
| `<path>/knowledge.json` | 读用户提供的 JSON,**必须符合** `internal/schemas/external-baseline.schema.json`(v1.1)。v1.0 简单 markdown 路径优先 |
| `<path>/project-overview.md` | 用户手写的项目总览 md(最低门槛),adapter 直接转 yaml |

**关键**:支持的格式我们定,**不绑任何外部工具的 schema**(Understand-Anything / DeepWiki 等都需用户手动适配)。

不完整字段标 `unknown_from_external_kb`,用户可后续 `--augment-with-scan` 跑增量补全(混合模式)。

### 4.2 Mode / Depth 检测

- workflow 内部调:显式传 `--depth`(80% 场景)
- 独立调:从触发词推断(详见 `references/depth-mode-decision-tree.md`)
- 触发词模糊:**默认起 manifest**(便宜,且是其它 depth 的 prereq)

### 4.3 缓存检测

- 检查 `${ARCH_PROJECT_DIR}/evidence/` 是否已有目标 depth 的 yaml
- 比对 `baseline_commits` vs 当前 git HEAD
- 全部一致 → 跳过该 depth,直接读已有 yaml
- 部分一致 → 增量重做(只跑 hash 漂移的仓)
- 全部漂移 → 重做(显式告知"baseline 过期")

### 4.4 预算预告(深 depth 启动前必跑)

显式输出:
```
计划：
  目标 mode：<depth>
  覆盖范围：N 仓 [name1, name2, ...]
  baseline source: deterministic_scan | external_kb (path)
  执行序列：manifest（已缓存,跳过）→ risk-scan → model
  预算估算：~X min / ~Y K tokens / Z 个并行 subagent

继续？（回车 / 排除某仓 / 'manifest-only' / '--baseline-source=...'）
```

### 4.5 多仓重要性排序(manifest 完成后)

按 `commit_count + 依赖入度 + LOC` 加权 score(详见 `references/repo-importance-scoring.md`)输出排序清单,**等用户选**(深 depth 不默认全做)。

### 4.6 Subagent 结构(Shallow Tree)

**v1.0 策略:每仓每 depth 一个 subagent,跨仓并行,subagent 内部 deterministic script first + LLM last**。

一次 3 仓 onboard --depth=full 的 subagent 数:
- 3 manifest subagent(并行,每仓一个)
- 3 risk subagent(并行,每仓一个)
- 3 model subagent(并行,每仓一个)
- (可选)1 跨仓 synthesizer,**主上下文**做轻量综合
- 合计 ~9-10 subagent

详见 `references/subagent-architecture.md` —— vs Understand-Anything 的 9 specialized deep tree 对比 + 选 shallow 的 3 个理由。

### 4.7 每 depth 的 subagent 内部职责

| Depth | Phase 1 (deterministic script) | Phase 2 (LLM 解释) | 输出 |
|---|---|---|---|
| `manifest` | 文件树 + 解析 `package.json` / `pyproject.toml` / `Dockerfile` / `*.k8s.yaml` / CI 配置 → 结构化 facts | 填 `summary` / `responsibility` / `owner-from-CODEOWNERS` | 仓库与组件清单.yaml + 依赖与链路图谱.yaml |
| `risk` | git churn 统计 + import 邻接矩阵 + 文件大小分布 | 判断耦合 / 热点 / 跨层 / 测试缺口严重度 | 风险与技术债台账.yaml(每条 4 字段齐:severity + scope + mitigation + evidence_refs) |
| `model` | **2-stage(借鉴 Understand-Anything,自己实现)**:Phase 1 script 算 directory grouping / node type grouping / import 邻接矩阵 / 跨类型依赖关系 | Phase 2 LLM 基于 Phase 1 数据做语义分层(3-10 层)+ 产 C4 mmd | 现状架构.md + diagrams/c4-{context\|container\|component-X}.mmd |

**工程关键点:`deterministic script first, LLM last`**(借自 Understand-Anything,独立实现)。

- ✅ LLM 做:层归类、摘要、责任判断、风险严重度(语义判断)
- ❌ LLM 不做:文件树遍历、import 解析、依赖图构建、git log 统计(确定性工作)

这条会写进每 depth 的 subagent prompt template,作为硬规则。

### 4.8 失败处理

### 4.6 失败处理

- subagent 跑挂(timeout / OOM / 工具错)→ retry 1 次
- 再挂 → 标该仓 `analysis_failed`,继续其它仓,workflow 显式告知
- 全部仓挂 → 该 depth 标 blocked,phase 留在 `analyze`

## 硬规则

- **必 subagent**:任何 depth 都不允许在主上下文跑(代码库太大)
- **深 depth(risk/model)启动前必显式预算预告 + 等用户确认**(降噪关键)
- **缓存检测必跑**:不允许无脑重做
- **多仓深挖必按重要性排序后让用户选**:不允许默认全做
- **产物必含 `baseline_commits`**(过期检测依赖)
- **每条 risk / 依赖判断必含 `evidence_refs`**(违反 R1/R4 反合理化)

## 验收(自检)

- 产出 yaml 通过对应 schema 校验(见 `internal/schemas/`)
- `baseline_commits` 字段完整
- 多仓场景:重要性排序输出 + 用户选择记录到 state.yaml
- 每个服务/模块条目有 owner / 入口 / 构建方式 / 部署方式(可标 `unknown` 但不能缺字段)
- 依赖图谱闭合(无悬挂引用)
- (risk 档)风险按严重度排序,每条四件齐(severity + scope + mitigation + evidence)
- (model 档)C4 mmd 文件可解析(Mermaid 渲染不报错)

## 降级

| 场景 | 降级路径 |
|---|---|
| subagent 跑挂 | retry 1 次;再挂标该仓 `analysis_failed`,继续其它仓 |
| 仓太大(>500K LOC)| 提示"超出 v1.0 默认阈值",问用户:① 限定子目录 ② 抽样关键路径 ③ abort |
| 多仓全挂 | 该 depth blocked,phase 留在 analyze;告知用户调小范围或 manual |
| 不是 TS/JS/Python/Java/Go 等主流栈 | 标 `language: unknown_to_skill`,manifest 走文件树扫描(不分析 import) |
| git 历史不可读 | baseline_commits 标 `git_unavailable`,过期检测降级为基于文件 mtime |
| 缓存损坏 | 删缓存重做,告知用户 |

## 参考资料(Codex 创建)

- `references/depth-mode-decision-tree.md` —— mode 选择决策树(workflow / 触发词 / 默认)
- `references/subagent-prompt-templates.md` —— 4 档 subagent 各自的 prompt + 返回 schema
- `references/repo-importance-scoring.md` —— 多仓重要性排序公式
- `references/cache-strategy.md` —— 缓存与过期检测策略
- `references/c4-extraction-rules.md` —— model 档从代码反推 C4 的具体规则
- `references/risk-detection-heuristics.md` —— risk 档的耦合 / 热点 / 缺口识别启发式

## Codex Implementation Notes

- 这个 skill 是 brownfield 主战场的核心,**展开时不能弱化** subagent 隔离要求
- 预算预告的具体计算(基于 LOC 估 token)需要 Codex 实现一个简单算法
- 多仓并行:用 Task 工具的多次调用并行 spawn subagents,不要串行
- `evidence_refs` 字段对所有产出条目都是硬要求,展开 prompt template 时强调
- C4 mmd 文件命名约定:`diagrams/c4-{context|container|component-{service}}.mmd`
- 缓存检测可以做得很简单:读 yaml frontmatter 的 commit hash,跟 `git rev-parse HEAD` 比
- v1.1 计划:增加 `--language=` 参数支持非主流栈深度分析
