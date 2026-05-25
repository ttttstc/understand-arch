# Architecture Composition Rubric

## 1. 目标

本文件约束 `arch-analyze` 如何把代码仓事实抽象成“足够可信的架构组成描述”，避免：

- 把目录当组件
- 把函数当服务
- 把 README 文案当事实
- 把运行时边界、数据边界、部署边界混在一起

## 2. 基本抽象层级

### repository

满足以下任意 2 条，可作为 `repositories[]` 条目：

- 有独立依赖声明
- 有独立构建/运行入口
- 有清晰业务或技术职责
- 在 monorepo 中具有稳定子目录边界

不要把纯工具目录、脚本目录、测试夹具目录记成 repository。

### component

满足以下任意 3 条，可作为 `components[]` 条目：

- 有稳定职责
- 有独立 owner 或自然 owner
- 有明确输入输出边界
- 能被其他部分以接口、事件、消息或调用关系引用
- 在运行时、开发时或部署时构成相对独立单元

常见 component：

- service
- job / worker
- gateway / bff
- scheduler
- shared library
- database access layer
- event consumer / producer

不要把纯目录分组、临时脚本、一次性 migration runner 直接记成 component，除非它们实际承载架构责任。

### interface

只有真正形成边界的接口才进入 `interfaces`：

- 对外 API
- 跨组件事件
- 跨组件消息
- 稳定内部契约

函数调用、类内部方法调用、局部 helper 不算 interface。

### deployment unit

满足以下任意 2 条，可作为 `deployment_units[]`：

- 独立容器/进程
- 独立发布节奏
- 独立伸缩或运行配置
- 独立故障域

### runtime config

只记录会影响架构行为的配置：

- 开关会改变调用路径
- 开关会切换依赖或模型供应商
- 配置会改变隔离边界、发布顺序、容量、回滚方式

普通业务文案配置不进 `runtime_configs`。

## 3. 关键组成必须回答的问题

### repositories

每个仓至少回答：

- 它负责什么
- 它是否可独立构建/运行
- 它与哪些组件强相关

### components

每个组件至少回答：

- 组件职责
- 所在仓
- owner
- component_type
- 主要输入输出

### interfaces

每个接口至少回答：

- 谁暴露
- 给谁用
- 兼容策略
- 改动后谁最可能受影响

### data models

每个关键数据模型至少回答：

- owner
- 谁写、谁读
- 是否跨组件共享
- compatibility / migration / rollback 约束

### external dependencies

每个外部依赖至少回答：

- 用来做什么
- 由谁负责
- 失效时影响什么
- 有无 fallback path

### critical flows

每条关键链路至少回答：

- 从哪里开始
- 穿过哪些关键组件
- 数据在哪里落地
- 哪一步最脆弱

## 4. 4+1 视图映射规则

### Logical View

优先来自：

- components
- interfaces
- data_models

如果 logical view 缺少这些中的两类以上，不应标 `complete`。

### Development View

优先来自：

- repositories
- components 与 repository_id 关系
- ownership

若无法把关键组件映射回仓库/模块，不应标 `complete`。

### Process View

优先来自：

- critical_flows
- events/messages
- runtime_configs

若只有静态组件图，没有链路或交互，不应标 `complete`。

### Physical View

优先来自：

- deployment_units
- external_dependencies
- network / release / rollback constraints

如果无法回答“怎么部署、怎么发布、怎么回退”，physical 至少应是 `partial`。

### Scenarios

优先来自：

- critical_flows
- overview.md 场景摘要

若只列组件、不列关键场景，不应标 `complete`。

## 5. evidence 规则

- 同一结论至少优先从代码、配置、契约文件中取证。
- README 或注释可做辅助证据，但不应作为唯一证据。
- “看起来像”不构成 evidence。
- 若只有弱证据，保留到 `known_unknowns`。

## 6. 常见误判

- 把 `shared/` 目录自动当成一个架构组件。
- 看到 `worker/` 目录就默认有独立部署单元。
- 因为名字像 `service` 就认定是业务服务。
- 只靠 import 图推断关键链路，不看运行入口和数据落点。
