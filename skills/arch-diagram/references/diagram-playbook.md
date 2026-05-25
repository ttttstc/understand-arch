# arch-diagram Playbook

## 1. 图类型映射

- context: 系统边界与外部系统
- container: 主要运行单元与核心组件
- component: 某个关键服务或模块内部结构
- sequence: 关键链路时序
- data-flow: 数据流向与 ownership
- deployment: 部署单元与环境边界

## 2. 来源到图的规则

- `specs/baseline.yaml` 适合产 context/container/data-flow/deployment
- `critical_flows` 适合产 sequence
- 某个 CR 的 `impact.yaml` 适合产 change-focused sequence 或 component 图

## 3. style mapping

- onboarding wiki: 清晰优先，避免装饰
- management brief: 总览优先，节点更少
- engineering brief: 细节优先，可保留更多依赖关系

## 4. 禁止行为

- 图中新增 source 不存在的组件
- 只给图不给文字结论
- 一个图同时混入多种视角

## 5. 模板使用

- context / container / sequence / data-flow / deployment 先套 `mermaid-templates.md` 中对应骨架。
- 只替换节点名、连线名和必要分组；不要为了“好看”改变图的主视角。
