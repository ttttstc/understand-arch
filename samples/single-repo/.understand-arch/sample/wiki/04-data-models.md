# 04 数据模型与边界

> 生成时间:2026-05-29T08:29:46.939Z  ·  基于 commit:a90f505bfff99e4985db4de6f6a409cbada60dd3  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 先看边界，再看数据

数据模型与边界章节不是只找数据库表。对桌面应用、前端单体或工具型项目，运行时边界、模块边界、文件系统边界同样重要。

新架构师读这一章时，应重点看“内部节点”和“外部对象”的分界：这决定了新增能力时应该改 UI、改领域库、改 IPC，还是补运行时实现。

## 数据边界

- **Sample Repository Boundary** (repo)：All identified code facts live inside the single sample repository. 内部节点：sample::file:src/app.ts, sample::module:orders；外部：No external repos identified。

## 数据节点事实

未识别到 table/schema 节点。
