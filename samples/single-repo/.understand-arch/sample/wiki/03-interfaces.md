# 03 接口与集成

> 生成时间:2026-05-29T08:29:46.939Z  ·  基于 commit:a90f505bfff99e4985db4de6f6a409cbada60dd3  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json

## 先分清依赖和边界

接口与集成章节先回答两个问题：系统依赖哪些外部运行时或库，以及哪些接口边界会限制未来扩展。

如果 endpoint/schema 节点为空，不代表系统没有接口，而是说明本次代码事实层没有识别出显式 HTTP/API/schema 边界。桌面应用和前端单体常见的关键接口会体现在 IPC、插件栈或运行时依赖上。

## 技术栈判断

- **TypeScript** (language)：用于 Implements the sample application and orders module.。选型理由：The graph identifies TypeScript source files as the implementation surface.。风险：The sample is too small to infer runtime or framework constraints.。

## 接口与集成判断

未识别到外部依赖或集成点。

## 接口节点事实

未识别到 endpoint/schema 节点。
