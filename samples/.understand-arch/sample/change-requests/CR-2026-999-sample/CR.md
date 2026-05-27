---
cr_id: "CR-2026-999"
title: "Sample v2 design"
status: "draft"
owner: ""
created: "2026-05-27"
prd_link: ""
affects_repos: ["sample"]
impact: {"added_nodes":[],"modified_nodes":["sample::file-src-app-ts","sample::func-src-app-ts-answer","sample::doc-README-md"],"removed_nodes":[],"estimated_files_changed":3}
---

# CR-2026-999 — Sample v2 design

## 1. 背景与目标

业务背景: sample::file-src-app-ts 需要示例设计验证。设计目标: 验证 CR.md 标准段落、影响面、风险、发布回滚与测试链路。非目标: 不修改业务代码。

## 2. 现状分析

当前架构子集: sample::file-src-app-ts 与 sample::func-src-app-ts-answer。现状痛点: 示例工程需要证明 graph 可支撑设计。已有约束: rules 暂无命中。

## 3. 方案概述

核心思路: 保持现有 sample 结构,通过 CR 全链路验证设计协议。关键决策点: 使用 graph node id 做 traceability。替代方案: 跳过 CR 验证会降低可信度。

## 4. 详细设计

### 4.1 数据模型变化
- 无数据模型变化。

### 4.2 接口变化(REST/gRPC/event)
- 无接口变化。

### 4.3 组件变化
- sample::file-src-app-ts 作为示例组件验证。

### 4.4 部署变化
- 无部署变化。

### 4.5 关键流程时序
- 使用 sample CR 验证关键链路。

## 5. 替代方案对比

替代方案: 只跑 scanner 不跑 CR。对比: 实现复杂度低,但无法验证 Review 与 CR 段级权限,风险更高。

## 6. NFR 影响

性能: 无运行时影响。可用性: 无服务变更。安全: 无权限面变化。合规: 无数据处理变化。可观测性: 通过验证输出确认链路。

## 7. 风险与缓解

主要风险: CR 段标题漂移。缓解措施: cr-md-editor validate 与 senior-review 双重检查。升级到 graph.risks[] 的候选: 暂无。

## 8. 改动清单

### 8.1 跨仓总览
| 仓 | 新增文件 | 修改文件 | 删除文件 | 新增接口 | 修改接口 |
|---|---:|---:|---:|---:|---:|
| sample | 0 | 3 | 0 | 0 | 0 |

### 8.2 仓级改动
#### 仓:sample

修改节点:
- `sample::file-src-app-ts` src/app.ts (file, score=4)
- `sample::func-src-app-ts-answer` answer (function, score=4)
- `sample::doc-README-md` README.md (document, score=2)

### 8.3 规则命中
- 未命中 rules/*.md 关键词。

### 8.4 依赖关系
- 暂无自动命中的跨仓关联。

### 8.5 已知未知
- 暂无。

## 9. 实施步骤 + 灰度策略

拆分子任务: 创建 CR、写影响面、补方案段、追加 Review、运行 senior-review。灰度策略: 仅 sample workspace。验证点: validate 与 senior-review 成功。

## 10. 回滚预案

触发条件: 验证失败或段标题不匹配。回滚步骤: 删除本次 sample CR 测试产物或重新创建。数据回滚: 无 schema 变更。

## 11. 测试策略

单元测试: cr-md-editor validate。集成测试: impact-analyzer 写第 8 段。性能测试: 不适用。验收标准: senior-review 返回 pass 或 needs_revision 且命令成功。

## 12. 待定问题(known_unknowns)

PRD 未澄清的设计点: 无。待 owner 决策的细节: 无。graph.known_unknowns[] 候选: 无。

## 13. 关联

关联 PRD 路径: sample inline requirement。关联上游 ADR: 无。关联下游影响 CR: 无。关联仓: sample。

## 14. Review(arch-review 写入,append-only)

- 尚未评审。

评审日期: 2026-05-27。评审人: arch-review。结论: sample CR 全链路验证已执行,风险、发布、回滚与测试策略均有内容。

