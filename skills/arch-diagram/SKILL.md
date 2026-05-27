---
name: arch-diagram
description: |
  v2.0 图表入口占位。读取 graph 并说明可生成的 4+1 / C4 视图,但不写任何图像文件。
---

# arch-diagram

## 定位

`arch-diagram` 在 v2.0 是占位入口。它可以读取 graph、列出 Logical / Development / Process / Physical / Scenarios 视图的可用事实与缺口,但不落盘图片或 Mermaid 文件。

## 输出

- 中文说明当前 4+1 视图覆盖情况。
- 指向 `wiki/14-diagrams.md` 的占位内容。
- 明确说明真正图片生成属于 v2.1 候选。

## 写权限

除 `state.yaml` 与 `.metrics.jsonl` 外不写任何文件。若被要求生成图片,必须说明 v2.0 不支持,不能伪造产物。

