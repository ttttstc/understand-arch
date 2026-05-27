# Multi-repo Rules

- `repos.yaml` 是唯一仓库注册表。
- 单仓也必须通过 `repos.yaml` 表达。
- node id 必须使用 `{repo_id}::{local-id}`。
- source 和 target 同仓的 edge 写 repo graph。
- source 和 target 不同仓的 edge 写 cross-repo graph。

