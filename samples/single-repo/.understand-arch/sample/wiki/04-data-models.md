# 04 数据模型与边界

> 生成时间:2026-05-29T07:52:01.589Z  ·  基于 commit:508a0c26f5f805556bac513a5caeb51bf851491a  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 数据边界

- **Sample Repository Boundary** (repo)：All identified code facts live inside the single sample repository. 内部节点：sample::file:src/app.ts, sample::module:orders；外部：No external repos identified。

## 数据节点证据

未识别到 table/schema 节点。

## 证据来源

| 判断 | 代码位置 |
| --- | --- |
| 边界: Sample Repository Boundary | sample::file:src/app.ts<br>sample::module:orders |
