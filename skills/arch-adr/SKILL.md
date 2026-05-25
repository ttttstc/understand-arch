---
name: arch-adr
description: |
  append-only ADR 记录器。只在某个决策值得长期保留时创建 `decisions/ADR-*.md`，并同步 `specs/decisions.yaml`。不记录每一次实现细节，只记录 durable decision。

  触发词: 记个 ADR / 这个决定值得留下来 / 架构决策记录

  本 skill 不替用户做决策，不修改既有 ADR 内容。
---

# arch-adr

## 角色定位

- 记录跨 CR、会长期影响未来设计的决策。
- append-only。

## 输入

- 当前 CR
- 选定方案
- 相关证据

## 输出

- `decisions/ADR-NNN-*.md`
- `specs/decisions.yaml` 更新索引

## 硬规则

1. 编号连续。
2. 既有 ADR 不重写，只允许 supersede。
3. 决策必须有 evidence 支撑。
4. 不是 durable decision 的内容不要硬写 ADR。

## 验收

- 文件名连续
- `specs/decisions.yaml` 索引同步
- 结论与证据一致

## 参考

- `docs/spec-v1.0.md`
- `internal/schemas/specs-decisions.schema.json`
- `references/adr-playbook.md`
- `references/adr-template.md`
