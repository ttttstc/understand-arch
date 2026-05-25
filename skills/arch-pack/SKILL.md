---
name: arch-pack
description: |
  人类视图导出器。把 `specs / CR / ADR` 组装成 `specs/overview.md`、onboarding wiki、brief、review packet 等可读材料。不创造新事实，只重组现有事实并保留来源回链。

  触发词: 生成 wiki / 出汇报 / 给领导看 / 整理一份给新人 / 导出说明

  本 skill 不生成结构化基线，不替代 ADR，不写代码。
---

# arch-pack

## 角色定位

- 只负责“给人看”。
- 输入是可信事实，输出是可读视图。
- 稳定的人类入口是 `specs/overview.md`。
- `generated/wiki/` 是展开视图，不是事实源。

## 输入

- `specs/`
- 可选 `change-requests/CR-*`
- 可选 `decisions/ADR-*`
- `audience=onboarding|management|engineering`

## 输出

- `specs/overview.md`
- `generated/wiki/*.md`
- `generated/briefs/*.md`

## 约束

1. 不发明新事实。
2. 关键结论要能回链来源文件。
3. 给管理层的摘要要尽量短，强调风险、决策、影响。
4. 给 onboarding 的 wiki 要解释系统现状，而不是直接转储 YAML。
5. `specs/overview.md` 与 `generated/wiki/` 不能各自维护不同版本的事实。

## 人类视图分层

### 稳定入口：`specs/overview.md`

这是任何人第一次进入项目时应该先读的一页。它必须长期存在，结构固定，负责回答：

- 这是什么系统
- 主要由哪些仓库与组件构成
- 关键接口、依赖、数据、部署约束是什么
- 现在最大的风险、技术债、关键决策、活跃 CR 是什么
- 这份基线是否过期

### 展开视图：`generated/wiki/`

当 `audience=onboarding` 时，默认生成固定 5 页：

1. `01-系统全景.md`
2. `02-组件与依赖.md`
3. `03-数据与关键链路.md`
4. `04-质量属性与运行约束.md`
5. `05-风险、决策与近期变更.md`

每页规则：

1. 每页只回答一类问题。
2. 每页先给结论，再给细节。
3. 页内允许引用图，但图不是唯一表达。
4. 如果 source 不足，显式写 `known unknowns`，不要脑补。

## 内容完备要求

onboarding wiki 至少要能让读者回答：

- 系统边界和目标是什么
- 主要组件、接口、依赖怎么连
- 关键数据模型和数据所有权在哪里
- 哪些 NFR / 运行时约束最重要
- 当前最大的风险、技术债、ADR、活跃变更是什么
- 这份架构基线的新鲜度如何

## 验收

- `specs/overview.md` 已更新
- brief/wiki 文件已生成
- audience 风格正确
- 关键结论可回链

## 降级

- 缺少足够 source artifacts：提示先跑 onboard 或 design
- 某些图缺失：允许仅输出文字版
- 某页 source 不足：保留页面结构，但显式标注 `known unknowns`

## 参考

- `docs/spec-v1.0.md`
- `internal/acceptance/brief.yaml`
- `references/wiki-playbook.md`
- `references/overview-template.md`
- `references/wiki-pages-template/01-系统全景.md`
- `references/wiki-pages-template/02-组件与依赖.md`
- `references/wiki-pages-template/03-数据与关键链路.md`
- `references/wiki-pages-template/04-质量属性与运行约束.md`
- `references/wiki-pages-template/05-风险、决策与近期变更.md`
