# Human View Playbook

## 1. 分层

- `specs/overview.md`: 稳定入口
- `generated/wiki/01-05`: onboarding 展开页
- `generated/briefs/*.md`: 受众定制摘要

## 2. onboarding wiki 固定 5 页

1. `01-系统全景.md`
2. `02-组件与依赖.md`
3. `03-数据与关键链路.md`
4. `04-质量属性与运行约束.md`
5. `05-风险、决策与近期变更.md`

## 3. 页面写作规则

- 先结论，后展开
- 不直接转储 YAML 字段
- 每页只回答一类问题
- 关键结论回链 source artifacts
- source 不足时显式写 `known unknowns`

## 4. 受众模板

### onboarding

- 目标：60-90 分钟内建立稳定心智模型
- 强调：系统边界、组件、数据、约束、风险

### management

- 目标：快速理解风险、决策、影响
- 强调：Top 风险、关键决策、近期变更、资源诉求

### engineering

- 目标：理解当前架构与本次变化点
- 强调：依赖、接口、数据边界、运行约束、CR writeback

## 5. `overview.md` 必含项

- 系统目标与边界
- 主要仓库与组件
- 关键接口与依赖
- 数据与所有权
- 部署与运行约束
- 风险与技术债
- 关键决策与活跃 CR
- freshness 与 known unknowns

## 6. 模板使用

- `specs/overview.md` 先套 `overview-template.md`，再填真实内容。
- onboarding wiki 五页分别套 `wiki-pages-template/01-05`，不要跳页或自创页面名。
- 可以删掉不适用的小节，但不能跳过“结论 / 关键事实 / known unknowns”三类信息。
