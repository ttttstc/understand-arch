# v2.0 Schema Manifest

v2.0 只保留 5 个核心 schema。旧版 specs yaml、CR 多文件 schema、组织 KB yaml schema 全部废弃。

| Schema | 校验对象 |
|---|---|
| `repos.schema.json` | `.understand-arch/{project}/specs/repos.yaml` |
| `repo-knowledge-graph.schema.json` | `.understand-arch/{project}/specs/repos/{repo_id}/knowledge-graph.json` |
| `cross-repo.schema.json` | `.understand-arch/{project}/specs/cross-repo.json` |
| `cr.schema.json` | `change-requests/CR-*/CR.md` 的 YAML frontmatter |
| `state.schema.json` | `.understand-arch/{project}/state.yaml` |

规则类内容改为项目内 `rules/*.md`,不再有 schema-locked KB。

