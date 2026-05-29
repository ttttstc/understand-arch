# 08 运行与部署

> 生成时间:2026-05-29T08:29:46.939Z  ·  基于 commit:a90f505bfff99e4985db4de6f6a409cbada60dd3  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 先确认系统在哪里运行

运行与部署章节关注系统实际在哪里运行、哪些配置或资源影响启动和发布。对桌面应用来说，渲染进程、主进程、preload、文件系统权限和构建打包链路，通常比传统服务部署更关键。

如果资源或 pipeline 节点为空，应把它视为一个需要补充的事实空缺，而不是默认系统没有发布约束。

## 运行与部署边界

- **Sample Repository Boundary** (repo)：All identified code facts live inside the single sample repository. 内部节点：sample::file:src/app.ts, sample::module:orders；外部：No external repos identified。

## 部署节点事实

未识别到 resource/pipeline/config 节点。
