---
name: arch-onboard
description: |
  建立或刷新 understand-arch v2.0 workspace。扫描单仓或多仓,生成 `.understand-arch/{project}/specs/repos.yaml`,
  分仓 graph、跨仓 graph 与 14 页 wiki。适用于首次接手业务系统、重建架构基线、刷新多仓架构视图。
---

# arch-onboard

## 定位

`arch-onboard` 是用户入口 skill,负责把当前业务系统初始化为 v2.0 工作区。它只协调事实层与视图层生成,不写业务代码、不写 IaC、不写 DDL、不写 CI。

## 输入

- 当前目录作为业务系统根目录。
- 可选 `--project <name>` 指定 `.understand-arch/{project}/` 名称。
- 可选 `--refresh` 强制重扫。
- 可选 `--repos <id=path,...>` 跳过交互式多仓发现。

## 工作流

1. 工作区准备:在用户项目根目录仅创建 `.understand-arch/` 一个入口目录,并确保 `.understand-arch/.gitignore` 包含 `*/intermediate/` 与 `*/.metrics.jsonl`。
2. 多仓注册:扫描当前目录及一层子目录的 `.git/`,引导用户确认仓库清单,写 `specs/repos.yaml`。
3. 规则初始化:从 `templates/rules/` 复制 6 份中文规则模板到 `rules/`,已存在则不覆盖。
4. 调度 `arch-analyze`:按 repos.yaml 对每仓运行 Phase 0-8,写 `specs/repos/{repo_id}/knowledge-graph.json`、`.fingerprint.json` 与 `specs/cross-repo.json`。
5. 调度 `arch-wiki`:基于 graph 与 rules 生成 `wiki/README.md` + 14 页。
6. 调度 `arch-review`:按 onboard acceptance 做结构、语义与 traceability 检查。
7. 写 `state.yaml` 和 `.metrics.jsonl`,所有用户可见提示使用中文。

## 验收

必须通过 `internal/acceptance/onboard.yaml`:

- `repos.yaml` 存在且至少 1 个 repo。
- 每个 repo 都有 `specs/repos/{repo_id}/knowledge-graph.json` 与 `.fingerprint.json`。
- `specs/cross-repo.json` 存在。
- wiki 14 页全部生成,且结论可回链 graph node id 或 rules path。
- 没有写出 `.understand-arch/` 以外的架构资产。

## 写权限

见 `internal/tool-contracts/write-scope.yaml#skills.arch-onboard`。本 skill 直接写 `state.yaml`、`specs/repos.yaml`、`.metrics.jsonl`,通过调度间接写 graph 与 wiki。禁止写 `decisions/**`、`change-requests/**`、`rules/**` 的用户已有内容。

