# Onboarding Flow

## 目标

`arch-onboard` 负责把一个真实工程初始化成 understand-arch v2.0 workspace。它只创建架构资产,不修改业务代码。

## 多仓发现与确认

1. 从当前目录开始检查 `.git/`。
2. 扫描一层子目录里的 `.git/`,形成候选 repo 列表。
3. 给每个 repo 生成稳定 id:小写 kebab-case,避免空格和下划线。
4. 向用户展示候选清单:repo id、本地路径、remote、主语言猜测。
5. 让用户确认加入、排除、重命名或手工补充 repo。
6. 写入 `.understand-arch/{project}/specs/repos.yaml`。
7. 单仓也写成 `repos:` 数组,N=1 不能走特殊路径。

## repos.yaml 最小字段

每个 repo 至少包含:

- `id`
- `path`
- `git_remote`
- `primary_language`
- `description`

路径相对 `.understand-arch/{project}/specs/repos.yaml` 解析。

## rules 初始化策略

1. 创建 `.understand-arch/{project}/rules/`。
2. 从 `templates/rules/` 复制 6 个默认规则模板。
3. 如果目标文件已存在,绝不覆盖。
4. 如果用户项目已有架构规则文档,只提示可迁移,不自动改写。
5. rules 是人工事实源,后续 graph evidence 可标 `source: human`。

## 首次扫描

确认 repos.yaml 后调度 `arch-analyze`:

```text
Mode: full
Workspace: .understand-arch/{project}
Repos: specs/repos.yaml
Run Phase 0, 1, 1.5, 2, 3, 4, 5, 6, 7, 8.
```

扫描完成后必须生成:

- `specs/repos/{repo_id}/knowledge-graph.json`
- `specs/repos/{repo_id}/.fingerprint.json`
- `specs/cross-repo.json`

## 首次 wiki

扫描完成后调度 `arch-wiki`:

```text
Audience: architect
Render: README.md + 01-overview.md through 14-diagrams.md
Review: wiki-review.js --mode full
```

用户首次应该阅读:

1. `wiki/01-overview.md`:总体可信度、仓库、节点、边和阅读顺序。
2. `wiki/02-components.md`:组件和代码结构边界。
3. `wiki/03-interfaces.md`:接口、schema 与已知局限。
4. `wiki/06-quality.md` 和 `wiki/07-risks-and-debt.md`:推断层是否足够支撑设计。

## 中文交互模板

发现仓库:

```text
检测到以下仓库候选:
- {repo_id}: {path} ({remote})
请确认纳入、排除或重命名。确认后我会写入 repos.yaml 并启动 v2.0 扫描。
```

rules 初始化:

```text
已初始化 rules 模板。已有规则文件不会被覆盖。
后续如需把组织约束纳入架构判断,请在 rules/*.md 中维护。
```

完成 onboard:

```text
onboard 完成。
- graph: specs/repos/*/knowledge-graph.json
- cross-repo: specs/cross-repo.json
- wiki 入口: wiki/01-overview.md
下一步建议先检查 wiki/03-interfaces.md 的已知局限。
```
