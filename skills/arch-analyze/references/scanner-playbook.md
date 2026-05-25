# arch-analyze Scanner Playbook

## 1. 扫描五段式

1. `project scanner`
2. `file analyzer`
3. `architecture analyzer`
4. `graph reviewer`
5. `specs writer`

## 2. 优先识别的事实

- 仓库边界
- 组件边界
- 入口点
- 关键接口
- 数据模型
- 外部依赖
- 部署单元
- 关键业务链路

## 3. 4+1 视图映射

- Logical: 组件、接口、数据模型
- Development: 仓库、模块、ownership
- Process: 关键链路、时序、runtime config
- Physical: 部署单元、网络边界、外部依赖
- Scenarios: 关键业务链路与场景摘要

## 4. 必须优先读的文件类型

- 包管理与依赖：
  - `package.json`
  - `pnpm-workspace.yaml`
  - `pyproject.toml`
  - `requirements*.txt`
  - `go.mod`
  - `pom.xml`
- 服务入口与路由：
  - `main.*`
  - `app.*`
  - `server.*`
  - `routes/*`
  - `controllers/*`
  - `handlers/*`
- 数据模型：
  - `schema.*`
  - `models/*`
  - `entities/*`
  - `migrations/*`
  - `prisma/*`
- 接口契约：
  - `openapi.*`
  - `swagger.*`
  - `proto/*`
  - `graphql/*`
- 部署与运行：
  - `Dockerfile`
  - `docker-compose*`
  - `helm/*`
  - `k8s/*`
  - `values*.yaml`
  - `env*`

## 5. 风险初筛启发式

- 共享数据写入边界不清。
- 深同步调用链。
- 外部依赖无替代路径。
- owner 缺失。
- 高 churn 且低测试覆盖区域。
- 部署顺序复杂但无回滚说明。
