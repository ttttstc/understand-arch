# understand-arch

`understand-arch` 是面向高级架构师的 Claude Code plugin。v2.0 是 breaking change,核心工作区改为:

```text
.understand-arch/{project}/
├── specs/
│   ├── repos.yaml
│   ├── repos/{repo_id}/knowledge-graph.json
│   └── cross-repo.json
├── wiki/
├── rules/
├── decisions/
├── change-requests/
└── state.yaml
```

graph 是唯一事实源。wiki、CR、ADR 中的关键断言必须能回链 graph node id、rules 路径、CR 路径或 ADR 路径。

## v2.0 命令

| 命令 | 用途 |
|---|---|
| `/arch-onboard` | 初始化或刷新单仓/多仓 workspace。 |
| `/arch-design` | 生成单文件 `CR.md`:YAML frontmatter + 14 段 RFC 风格方案设计。 |
| `/arch-audit` | 检查 freshness、degraded 状态、traceability 与 graph/wiki 一致性。 |
| `/arch-wiki` | 生成 `wiki/README.md` + 14 页人类视图。 |
| `/arch-diagram` | v2.0 占位入口;真实图片生成留给 v2.1。 |

内部 skill:`arch-analyze`、`arch-frame`、`arch-adr`、`arch-review`。

## v1 到 v2 的关键变化

- 用户项目不再使用 `arch/{project}`;唯一入口是 `.understand-arch/`。
- 5 份 specs yaml 改为分仓 `knowledge-graph.json` + 跨仓 `cross-repo.json`。
- `generated/` 改为 `wiki/`。
- 全局 `~/.understand-arch/kb/` 改为项目内 `rules/*.md`。
- CR 多文件改为单文件 `CR.md`。
- skill 收敛为 5 个用户入口 + 4 个内部 skill。

## 开发校验

```text
npm run verify
```

完整实施合同见 [`docs/spec-v2.0.md`](./docs/spec-v2.0.md)。

