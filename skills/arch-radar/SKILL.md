---
name: arch-radar
description: |
  行业对标 / 技术选型外部研究。**按需** skill(MVP 不必装),触发场景:新平台选型、大重构前调研、现代化改造、行业 benchmark 驱动的方案评估。**必 subagent**(联网递归会拉一堆原始素材)。借 GPT Researcher 的 reviewer/reviser/writer 闭环,形成 evidence-backed 判断,不是泛建议。产 `radar-summary.yaml` + 对标矩阵.md。

  触发词:业界怎么做 / 业内 / 同行 / 行业 / best practice / benchmark / 对标 / 调研 / research / X 和 Y 怎么选 / 选型 / 该用哪个 / 有没有现成方案 / state of the art / 行业实践

  本 skill 不替决策(只给 evidence + 推荐),不写代码,不抓取私有/付费源(只公开资料)。
---

# arch-radar — 行业对标 / 选型研究

> 联网递归研究 → evidence-backed 判断。**按需启用**,非 MVP 必装。

## 1. 角色定位

- 联网研究:GitHub / 论文 / 博客 / 文档 / 开源项目
- **递归 breadth + depth 探索**(借 GPT Researcher 模式)
- 闭环:**Research → Review → Revise → Publish**
- `subagent: 必须`(拉原始素材会污染主上下文)
- v1.0 是"按需"skill,**不进 MVP 必装清单**

## 2. 输入

- 研究主题 + 范围:`--topic="..." --scope="microservices|llm-app|devops|..."`
- (可选)对标候选清单:`--candidates=["A","B","C"]` —— 不给则 radar 自己发现候选
- (可选)`architecture_profile`(从 frame 接力,缩范围)

## 3. 输出

- `${ARCH_PROJECT_DIR}/research/{topic-slug}/radar-summary.yaml`
- `${ARCH_PROJECT_DIR}/research/{topic-slug}/对标矩阵.md`
- (可选)`raw-sources/` 子目录存抓到的原始素材摘要

## 4. 行为

### 4.1 触发场景检查

- 用户明确说"调研" / "选型" → 直接跑
- workflow 自动:design mode 中 options 阶段提示 "需要外部对标吗",用户同意 → 触发
- 模糊场景:询问用户 "这次需要联网调研吗,还是基于内部经验?"

### 4.2 Subagent 启动

prompt template 见 `references/research-methodology.md`。subagent 任务:

1. **Discover**:列出领域内主要 player(GitHub stars / paper 引用 / 社区热度)
2. **Deep dive**:针对每个 player,抓 README / 文档 / 设计博客 / 关键 issue
3. **Source-eval**:对每个 source 打可信分(见 `references/source-evaluation.md`)
4. **Synthesize**:对比维度 + 优劣 + 适用场景
5. **Recommend**:基于本项目 `architecture_profile` 给推荐 + 理由
6. **Self-review**:对推荐做 reviewer pass(GPT Researcher 模式)

### 4.3 对标维度(默认,可扩)

- 成熟度(stars / forks / 最近 commit / 版本节奏)
- 文档完整度
- 社区活跃度(issue 响应 / PR 节奏)
- 商业支持(有公司背书?)
- 关键能力对比(按 topic 定制)
- 已知失败案例

### 4.4 Evidence-backed 输出

每条断言**必带 source**:
```yaml
- claim: "...."
  source_url: "https://..."
  accessed_at: ISO-8601
  credibility_score: 0-10
```

**不允许"业界通常..."这种无源断言**(违反 R1/R4)。

## 硬规则

- **必 subagent**
- 每条断言**必带 evidence_refs 到外部源**(违反 R1 → reject)
- **不 hallucinate 数据**(github star 数、paper 引用数必从真实查询来)
- 推荐**必有理由**(说明为什么选 X 不选 Y)
- 不抓付费墙 / 私有源(只公开资料)
- 联网受限时**必显式标 degraded**,不假装完成

## 验收

- `radar-summary.yaml` 通过 schema(v1.0 待 Codex 实现 `internal/schemas/radar.schema.json`)
- 对标矩阵.md 每条目有 source + accessed_at
- 推荐有理由 + 适用前提
- 候选数 ≥3(单候选要说明"为什么无对标")

## 降级

| 场景 | 行为 |
|---|---|
| 网络受限 / 抓取超时 | 标 degraded,告知用户哪些 source 未访问 |
| 信息源可信度低(blog post / 单方观点) | 标低 credibility,不作主要依据 |
| 主题过广(如"AI 架构") | 提示用户缩范围,提供子主题建议 |
| 完全无公开资料 | 显式说明 "the public web has no significant information on X",给反馈 "考虑商业咨询 / 内部专家" |
| 候选数 <3 | 显式标 "narrow field",给推荐 + 但提示样本不足 |

## References needed(Codex 创建)

- `references/research-methodology.md` —— subagent 递归 + 闭环规则(借 GPT Researcher)
- `references/source-evaluation.md` —— credibility scoring rubric
- `references/radar-template.md` —— 对标矩阵.md 固定结构
- `references/topic-scoping-rules.md` —— 主题太宽时怎么提示用户缩范围

## Codex Implementation Notes

- arch-radar 是**按需 skill**,不进 MVP 必装清单(但骨架已在 marketplace.json 注册;Codex 实装时可选触发)
- 联网工具:Codex 实装时考虑用 `agent-reach` skill(已在 ni 生态)或独立 `WebFetch` / Exa
- **subagent 不要"自我陶醉"在某一个 source**(GPT Researcher 经验)—— 必须 breadth-first 后再 depth
- **Evidence-backed 是 radar 的灵魂**,LLM 易倾向 "summarize from training data",必须 push 它实际抓 source
- 输出语言:跟随项目主语言(如 `项目总览.lang=zh-CN`,输出中文摘要 + 保留英文源链接)
