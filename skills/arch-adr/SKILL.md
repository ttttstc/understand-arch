---
name: arch-adr
description: |
  架构决策记录(ADR)生成。**append-only**,7 段固定结构(Status / Date / Context / Decision / Consequences / Alternatives / Evidence)。一份决策一份 ADR,编号连续不跳号。可独立调用补记小决策,可被 arch-options 接力记录选定方案。Evidence 段必回链 `决策与证据索引.yaml` 对应条目。v1.1 加 optional `fitness_spec` 字段把决策转译成可执行检查。

  触发词:ADR / 决策记录 / 写个决策 / 记一下这个决定 / 为什么这么定 / decision log / architecture decision record / 写决策文档

  本 skill **永不修改**已有 ADR(append-only),不替用户做决策(只记录用户已做的),不写代码。
---

# arch-adr — 架构决策记录

> 每个 ADR 是不可变的决策快照。永不修改,只新建。

## 1. 角色定位

- **append-only**(永不改 / 永不删),只 append 新 ADR
- 7 段固定结构,缺一不可
- `subagent: 否`(纯模板填充,主上下文)
- 与 arch-options 关系:options 选定方案 → adr 记录;但 adr 也可独立用(补记历史小决策)

## 2. 输入

- 决策内容(用户文本 或 arch-options 接力)
- 上下文:`${ARCH_PROJECT_DIR}/evidence/项目总览.yaml` + (若 design mode) `影响面.yaml` + `options.md`
- 已有 ADR 编号(从 `${ARCH_PROJECT_DIR}/adr/ADR-NNN-*.md` 推断下一个编号)

## 3. 输出

- `${ARCH_PROJECT_DIR}/adr/ADR-NNN-{kebab-title}.md`(NNN 三位 zero-pad,从 001 起)
- 更新 `${ARCH_PROJECT_DIR}/evidence/决策与证据索引.yaml` 加新 ADR 引用

## 4. 行为

### 4.1 编号决定

- 扫 `${ARCH_PROJECT_DIR}/adr/` 找最大已有 NNN
- 新 ADR = NNN + 1,zero-pad 到 3 位
- **不允许跳号**(append-only history)
- 跳号 → 报错停止,要求人决断(可能 ADR-N 被误删,需 git restore)

### 4.2 标题生成

- 从决策内容抽 kebab-case 标题(≤60 字符)
- 例:`ADR-003-payment-channel-migration.md`

### 4.3 7 段填充

| 段 | 必填内容 |
|---|---|
| **Status** | `proposed` / `accepted` / `deprecated` / `superseded-by-NNN` |
| **Date** | ISO-8601 |
| **Context** | 为什么要做这个决定?业务驱动 + 约束 + 触发事件 |
| **Decision** | 决定了什么。**一句话能说清的版本**优先 |
| **Consequences** | **正反双面必填**:positive(收益)+ negative(代价)+ neutral(中性影响) |
| **Alternatives** | **≥1 个**,每个含 `[name, why_not_chosen]`。**不允许 "no alternatives considered"** |
| **Evidence** | 回链 `决策与证据索引.yaml` 的具体条目 ID,或显式说明 `[evidence: external, source: ...]` |

### 4.4 决策与证据索引同步

- 在 `决策与证据索引.yaml.decisions` 加新条目:
  ```yaml
  - adr_id: ADR-003
    title: ...
    date: ISO-8601
    status: accepted
    related_options: <options.md 路径>
    related_evidence_refs: [...]
  ```

### 4.5 Superseding 关系

- 若新 ADR 替代旧的:**旧 ADR 不删**,改 Status 为 `superseded-by-NNN`(允许这一处修改,因为这是 metadata 不是决策内容)
- 新 ADR Context 段说明被替代的理由

## 硬规则

- **append-only** —— 永不删 / 永不改决策内容(仅允许 status 改为 superseded)
- 编号**严格连续**,不允许跳号
- 7 段**全部必填**,空段 reject
- Consequences **正反双面必填**(不许只写好处)
- Alternatives **≥1**,"无备选" reject
- Evidence **必有**(回链 yaml 或显式 external source)
- 标题 **kebab-case ≤60 字符**

## 验收

- ADR 文件名编号正确(连续 + zero-pad)
- 7 段齐全(通过 `internal/schemas/adr.schema.json` 校验)
- Consequences 段含正反双面
- ≥1 Alternative + 每个 why_not_chosen 非空
- `决策与证据索引.yaml` 同步含新条目
- 若 superseding,旧 ADR status 已更新

## 降级

| 场景 | 行为 |
|---|---|
| 编号冲突(ADR-N 已存在) | 报错,告知是否要 superseding(走 4.5)还是错误推断了编号 |
| 用户没给 Alternatives | **强制询问** "考虑过哪些其他方案?为什么没选?";不答**不允许写** |
| Evidence 缺(独立用时) | 允许 `evidence: external, source: <user_provided>`,但显式标 |
| 已有 ADR 文件丢失(跳号) | **拒绝继续**,要求 git restore 或显式 override(写明跳号原因 + 责任人) |
| Decision 太长(>3 句) | 提示"决策应该一句话说清,展开放 Context";让用户精简 |

## References needed(Codex 创建)

- `references/adr-template.md` —— 7 段 ADR markdown 模板
- `references/numbering-convention.md` —— 编号规则 + 冲突处理
- `references/superseding-rules.md` —— supersede 关系如何处理
- `references/v1.1-fitness-spec.md` —— v1.1 fitness_spec 字段设计(占位)

## Codex Implementation Notes

- **append-only 是 v1.0 最硬的约束**,不许任何弱化(包括"小修改无伤大雅")
- LLM 易倾向只写 positive consequences,展开 prompt 时强调"必须写 negative"
- Alternatives 是 R4 反合理化("不能只写典型方案")的具体落地
- v1.1 `fitness_spec` 字段 schema 草案:
  ```yaml
  fitness_spec:
    rule: "API 调用必须经过 gateway"
    check_type: grep|ast|file_presence|custom_script
    check_pattern: "..."
    severity: error|warning
  ```
  v1.0 该字段不存在,即使用户传也 reject。
