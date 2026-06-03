# Agent-cards pin 机制

> 面向维护者。cards 是内部检索层，通常不需要人工编辑。

## 用途

当某张卡片的摘要或锚点被人工修正后，可以把卡片 id 写入:

```text
.understand-arch/<project>/cards/pinned.json
```

示例:

```json
[
  "card:component:auth"
]
```

## 行为

- 被 pin 的卡片不会被自动派生覆盖。
- 保护范围包括 `focused_summary`、`anchors`、`semantic_tags`、`related_card_ids`、`source_hash`。
- 删除 `pinned.json` 或移除对应 id 后，下次刷新会恢复自动派生。

## 建议

- 只 pin 少量确实需要人工维护的卡片。
- 优先修正上游 graph、arch-layer、constraints 或 ADR，让卡片自然派生正确。
- pin 后仍应定期运行 audit，确认锚点没有断裂。
