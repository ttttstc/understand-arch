# onboard 高阶参数

> 面向自动化脚本和维护者。日常使用直接运行 `/arch-onboard` 即可。

## 参数

| 参数 | 用途 | 适用场景 |
|---|---|---|
| `--incremental` | 显式要求走增量路径 | CI 脚本需要表达意图时使用；默认行为已是自动增量 |
| `--since=<git-ref>` | 指定增量起点 | 需要从某个 commit 之后重新评估变化 |
| `--full` | 强制全量重建 | 大规模目录重组、基线损坏、迁移后首次重扫 |

## 行为

- 首次没有 fingerprint 基线时会自动全量。
- 后续运行会读取每仓 `specs/repos/<repo_id>/.fingerprint.json`。
- 分类结果分为 `SKIP`、`PARTIAL_UPDATE`、`ARCHITECTURE_UPDATE`、`FULL_UPDATE`。
- `PARTIAL_UPDATE` 只重推受影响的架构节点。
- `FULL_UPDATE` 表示变化过大，建议全量重建。

## 边界

- 这些参数不面向普通用户。
- 不要在 README 主体中引用这些参数。
- 不要绕过 UA 的 fingerprint、staleness、change-classifier 原语。
