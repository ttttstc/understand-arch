# TypeScript / JavaScript Project Structure

> Scope: 单仓 vs monorepo、package 边界、模块分层、目录组织。`arch-frame` 在识别到 TS/JS 工程时加载。

## 起点:这是一个怎样的 TS/JS 项目?

先把项目归类,后面选型才有依据:

| 类型 | 例子 | 主要关切 |
|---|---|---|
| 纯 lib | 工具库 / SDK | API 稳定 / 体积 / dual ESM-CJS |
| 应用 (CSR) | React SPA / Vue SPA | bundle / 路由 / 状态 / 数据获取 |
| 应用 (SSR/SSG) | Next.js / Nuxt / Astro | 渲染策略 / hydration / SEO / 边缘 |
| 桌面 | Electron / Tauri | 主进程/渲染进程边界 / IPC / 打包 |
| 移动 | React Native / Expo | 原生模块 / OTA / 多平台差异 |
| 服务端 | Node / Bun / Deno API | 单线程/异步 / 守护进程 / 部署形态 |
| CLI | tsx 脚本 / oclif | 启动速度 / 单文件分发 |
| 全栈框架 | Next.js / Remix / Nuxt | server 与 client 边界 / RSC |

不同类型对应不同的"该看什么"。后面所有判断都基于类型上下文。

## 单仓 vs Monorepo

### 默认:单仓

单一 package, 一个 `package.json`。绝大多数项目终生不需要 monorepo。

### 何时上 monorepo

仅当**同时**满足:
- ≥ 2 个独立产物(lib + app / 多 app 共享 lib / 多端共享 core)
- 这些产物之间真的共享代码(不是凑数共享)
- 团队接受 monorepo 的运维成本(workspace / 缓存 / CI 分布式 build)

如果只是"把仓库都放一起方便",**不要** monorepo — 那是 multi-root workspace,不是 monorepo。

### Monorepo 工具对照

| 工具 | 何时选 |
|---|---|
| **pnpm workspaces** | 默认。轻、装得快、生命周期管理够用 |
| **Turborepo** | pnpm + 跨包 build/test 缓存与编排;典型前端 monorepo |
| **Nx** | 强 generator + 依赖图分析 + 企业插件;学习曲线陡 |
| **Lerna** | 维护模式,新项目不要选 |
| **Yarn workspaces** | 已有 Yarn 投资才用,否则不如 pnpm |
| **Bun workspaces** | 早期,适合 greenfield 实验 |

## 包内目录组织

不论单仓还是 monorepo 子包,内部分层默认这套(应用类):

```
src/
  app/ or pages/   入口 / 路由
  components/      纯 UI 组件
  features/        业务功能(按业务能力分,不按技术分)
  hooks/           可复用 hook
  services/        外部依赖(API client / SDK 包装)
  stores/          全局状态
  lib/ or utils/   工具函数
  types/           跨模块共享类型
  styles/          全局样式
```

**反模式**:按技术维度分顶层(`controllers/ services/ models/`)— 加新功能要跨 3 个目录;按 feature 切才能让"新加一个能力"是改一个 folder。

## 模块边界

TS/JS 没有 Java/Go 那种强模块系统;边界要靠**纪律 + 工具**维持。

### 工具

- `eslint-plugin-import` + `no-restricted-imports`:禁止跨层依赖
- `dependency-cruiser`:画依赖图、检测循环
- `madge`:看模块依赖、检测循环
- TS path aliases:让 `import { foo } from '@/features/billing/...'` 显式跨层
- monorepo 下:每个 package 的 `package.json` 显式列依赖,禁止 hoist 隐式引用

### 约束典型例子

- `components/` 不能 import `features/`(UI 不知业务)
- `features/billing/` 不能 import `features/users/`(feature 之间走 props / event / store)
- `lib/` 不能 import 任何业务模块(纯工具)
- 任何东西不能 import `app/` / `pages/`(入口不被引用)

## 类型组织

- **本地类型**就近放:`features/billing/types.ts`
- **跨模块类型**抽到 `types/` 或对应 feature 的 `index.ts` 导出
- **API 响应类型** 不要手抄:用 OpenAPI/GraphQL/zod 生成
- **共享 DTO 跨服务**:走 schema(OpenAPI/Proto)+ 生成,不靠手写 `.d.ts` 同步

## TS 项目的特殊考虑

### tsconfig 分层

monorepo / 复杂项目:
- `tsconfig.base.json` — 共享 compiler options
- 各 package `tsconfig.json extends base`
- 用 `references` 做项目引用,启用增量编译

### "TS only" vs "TS + bundler"

- 纯 Node lib → tsc 编译就够,可能加 tsup/unbuild 出 dual ESM-CJS
- 前端应用 → bundler(Vite/Webpack/Turbopack) + TS 只做类型检查(`transpileOnly` / esbuild loader)
- 不要双 transform(tsc 编一遍再 bundler 编一遍)

## Electron / Tauri / 跨端的目录约定

桌面应用的额外结构:

```
electron/        或 src-tauri/
  main/          主进程(Node 环境)
  preload/       桥接(沙箱 IPC)
  shared/        主进程与渲染进程共享的常量/类型
src/             渲染进程(浏览器环境)
```

边界纪律:
- `src/` 永远不 import `electron/`(渲染进程无 Node)
- IPC 通道集中定义(`shared/ipc.ts`),不在调用点散写字符串
- preload 暴露 API 必须用 `contextBridge`,**不要** `nodeIntegration: true`

## 反模式

- **顶层按技术分层 + 业务功能东一榔头西一棒**:加功能改 5 个目录
- **隐式 import 全局变量 / 自动注入**:看代码看不出依赖来源
- **monorepo 没编排**:`pnpm -r build` 串行,几分钟 ↑;该上 Turbo/Nx
- **路径 alias 一堆 `@/` 但层级不清**:别名解决不了边界问题,只是搬位置
- **复用 = 抽 utils 巨型文件**:`utils/index.ts` 800 行 → 拆按主题
- **circular import**:绕得过就不绕,绕不过就重构 — 不要 lazy import 兜
- **没有 ESM/CJS 策略**:lib 同时被 ESM 和 CJS 用户引用 → dual package hazard

## 决策辅助清单(给 arch-options)

- [ ] 项目类型分类清楚了吗?(应用形态决定后续 90% 的选型)
- [ ] 真的需要 monorepo 吗?有≥2 个独立产物且真共享?
- [ ] 模块边界靠什么维持?eslint / dep-cruiser 上了吗?
- [ ] tsconfig 是否合理(strict, references, paths)?
- [ ] 类型来源是手写还是生成(API / schema)?
- [ ] (Electron) 主/渲染/preload 边界是否清晰?contextIsolation 开了吗?

## 参考

- monorepo.tools — 工具对比
- tsconfig/bases — 各场景预设
- "Frontend Architecture for Design Systems" — Micah Godbolt
- Electron 官方 security checklist
