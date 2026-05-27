# v2.0 Regression Cases

回归用例用于验证 v2.0 不变量:

- 只创建 `.understand-arch/` 一个用户项目入口。
- 单仓与多仓都通过 `specs/repos.yaml` 表达。
- node id 全部使用 `{repo_id}::{local-id}`。
- 仓内 edge 与跨仓 edge 正确分流。
- wiki/CR/ADR 断言可追溯到 graph、rules 或路径证据。

用例模板见 `_template/case-template.yaml`。

