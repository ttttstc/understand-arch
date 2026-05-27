---
name: arch-adr
description: |
  内部 ADR 写入器。仅当方案包含长期架构决策时创建 append-only ADR,并追加 cross-repo architecture_decisions 索引。
---

# arch-adr

## 定位

`arch-adr` 只处理 durable decision。局部实现取舍留在 CR.md,不升级为 ADR。

## 输出

- `decisions/ADR-NNN-{slug}.md`
- `specs/cross-repo.json#architecture_decisions[]` 追加索引

## Engine 调用

创建 ADR 必须使用:

```text
node engine/bin/adr-editor.js create --workspace .understand-arch/{project} --title "..." --status proposed --affected-node-ids repo::node
```

该工具会创建 append-only ADR markdown,并同步追加 `specs/cross-repo.json#architecture_decisions[]`。

## Append-only

ADR 文件一旦提交后不得修改。废弃、替代、supersede 关系写入 cross-repo graph 索引。

## 写权限

允许写 `decisions/ADR-*.md` 与 `cross-repo.json#architecture_decisions[]`;禁止写 wiki、change-requests、specs/repos/**。
