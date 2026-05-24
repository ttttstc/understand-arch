# `_template/` — Workspace Skeleton

`arch-workflow` 在首次为某个项目调用时,把本目录 copy 到 `arch/{项目名}/`。

**不要直接对 `_template/` 跑 skill** — 它是源,不是工作区。

## 顶层 2-bucket

- `agent/` 🤖 — 引擎契约;每个文件含 schema 注释。stubs 故意 schema-invalid,半 copy 不能蒙混过 acceptance。
- `user/` ★ — 给人看的;`user/README.md` 是入口,知识库 7 页 stubs 含填什么的提示。

## 编辑模板时

仅在以下情况改:
- `internal/schemas/` 增删 top-level required 字段
- 工作区契约增删强制目录/文件
- 某目录用途变

字段级改动(子字段、enum 拓展)不需改本模板 — 走 skill prompt。

修改完 bump `agent/状态.yaml` 里的 `template_version` + 在 `CHANGELOG.md` 留痕。
