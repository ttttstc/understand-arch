# Specs Freshness Rules

## 1. 判定优先级

1. Git commit diff
2. 架构敏感文件命中情况
3. specs 内容完整性

## 2. freshness_status 定义

- `fresh`: `last_scanned_commit == current_commit`
- `possibly_stale`: 有 commit 差异，但未命中架构敏感文件
- `stale`: 命中架构敏感文件，或 writeback 明显落后
- `unknown`: 无 Git 或证据不足

## 3. 架构敏感文件

命中以下路径变化时，优先判 `stale`：

- 依赖管理：`package.json`, `pyproject.toml`, `go.mod`, `pom.xml`
- 服务入口 / 路由：`main.*`, `app.*`, `routes/*`, `controllers/*`
- 数据模型 / migration：`models/*`, `schema/*`, `migrations/*`, `prisma/*`
- 接口契约：`openapi.*`, `proto/*`, `graphql/*`
- 事件消息：`events/*`, `consumers/*`, `producers/*`
- 部署运行：`Dockerfile`, `helm/*`, `k8s/*`, `compose*`
- 权限边界：`auth/*`, `permission/*`, `policy/*`
- 架构资产：`arch/{project}/specs/*`, `decisions/*`, `change-requests/*`

## 4. 可判 `possibly_stale` 的变化

- 纯测试改动
- 样式/文案改动
- 非边界性的局部实现调整
- 注释与 README 小修

## 5. 无 Git 时的检查项

- `evidence_refs` 是否还能打开
- 4+1 coverage 是否完整
- known unknowns 是否异常增多
- owner 缺口是否扩大
- `risks.yaml.last_reviewed` 是否过旧

## 6. 中文提示

- `fresh`: 当前 specs 与代码提交一致。
- `possibly_stale`: 代码有变化，但暂未发现明显影响架构基线的文件；建议下次 audit 时复核。
- `stale`: 代码变化命中架构敏感区域，建议刷新 specs。
- `unknown`: 无法判断 specs 是否过期，建议先 refresh 或做 drift audit。
