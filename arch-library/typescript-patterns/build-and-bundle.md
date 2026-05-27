# Build Pipeline & Bundling

> Scope: 工具链选择、tree-shaking、ESM/CJS、dev/build 分离、产物体积控制。

## 工具栈对照(2026 实务)

| 工具 | 定位 | 何时选 |
|---|---|---|
| **Vite** | dev server + build(底层 esbuild + rollup) | 默认前端应用 / lib;dev 体验最好 |
| **Webpack** | 老牌全能 | 有 Webpack 历史投资、要复杂自定义 loader 时 |
| **Turbopack** | Vercel 自研,Next.js 默认 | 跟 Next 走时;独立用未到成熟 |
| **esbuild** | 极快单文件 bundler | lib 构建、Node 脚本、tsx 即时执行 |
| **tsup** | 基于 esbuild,lib 友好 | Node 库出 ESM+CJS+.d.ts |
| **Rollup** | lib 专精,treeshake 强 | 纯 lib(Vite 内部也用它做 build) |
| **rspack** | Rust 版 Webpack | 想要 Webpack 配置但要速度 |
| **Bun** | runtime + bundler | greenfield 实验;CI / 多包生态尚未齐 |
| **swc** | Rust 编译器,作 loader 用 | Webpack/Next 用作快速 transform |
| **tsc** | 官方编译器 | 类型检查;lib 也可用作产物编译 |

### 通用决策

- 应用(前端 SPA / Electron renderer): **Vite**
- Next/Remix 项目: 用框架默认(Turbopack/webpack)
- 纯 Node lib: **tsup** (esbuild) 或 **unbuild**
- 纯 Node app: tsx dev + 看是否真需要 bundle(很多 Node 服务直接跑 ts 源/tsc 产物即可)
- 已有 Webpack 配置 + 不想动: 留着,不必硬迁

## Dev 与 Build 分离

Dev 关注:启动速度、HMR、错误 overlay。Build 关注:体积、tree-shake、source map。

- dev 用 esbuild transform(快但不严格)
- build 仍然让 `tsc --noEmit` 单独跑类型检查(CI 必做),不要靠 bundler 抓类型错

## ESM / CJS 的现状(2026)

- 新 lib: **默认 ESM**;按需提供 CJS 兼容
- Node 16+ 已成熟支持 ESM;但很多老用户/工具仍 CJS
- 别只发 CJS:Next/Vite/edge 环境只接受 ESM 越来越多
- 别只发 ESM:旧 Jest / 旧 Node 用户会炸

### Dual package hazard

同时发 ESM + CJS 的库,如果用户混用(eg. lib 内部不同入口),会出现 **两份实例** → singleton 失效。

避免方法:
- 库不维护可变全局状态;或
- 显式 peerDependency 强制宿主提供单实例;或
- 只发 ESM,接受老用户被排除

### `package.json` 关键字段

```jsonc
{
  "main": "./dist/index.cjs",        // CJS 入口
  "module": "./dist/index.mjs",      // 老的 ESM 字段
  "types": "./dist/index.d.ts",
  "exports": {                        // 推荐的现代入口
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  },
  "sideEffects": false,               // 帮助 tree-shake
  "type": "module"                    // 顶层 .js 当 ESM 解析
}
```

`sideEffects: false` 让消费方 bundler 大胆 tree-shake;有 side effect 的入口要在 array 里列出。

## Tree-shake 的前提

- ES Module 静态 import(不能动态 `require`/`await import` 在判断里)
- 模块本身无副作用(import 时不要修改全局 / 注册回调)
- bundler 知道是无副作用(`sideEffects` 字段)
- 内部没有阻挡(barrel files 经常意外阻挡;见下)

### Barrel files 的陷阱

`index.ts` 把整个目录 re-export → 用户 `import { foo } from 'lib'` 看似只用 `foo`,实际 bundler 把整个 barrel 全捞进来(取决于工具能力)。

实务:
- lib: 减少 barrel,或确保 `sideEffects: false` + bundler 智能
- app: 不要写 `src/components/index.ts` 把 100 个组件都 export,IDE auto-import 会鼓励到处用

## 代码分割

前端必备:
- 路由级分割: `lazy(() => import('./Page'))`
- 大依赖分割: `import()` 把 charts / editor / video 等大头分开
- 共享 chunk: bundler 自动 split common chunks(默认行为通常够用)

度量:**初始 JS < 200KB gzipped** 是健康线;到 500KB+ 需要刨。

## 资源处理

- 图: 优先 webp/avif;CDN 自动转;尺寸响应式
- 字体: 自托管 + `font-display: swap` + subset
- 静态资源: hash 文件名 + 长 cache;HTML 短 cache
- inline 阈值: < 4KB 的图/字体 inline 成 data URL 省请求,大于则独立文件

## 环境变量与配置

- 用 bundler 注入(`import.meta.env.VITE_X`)— 编译时常量
- **不要**把 secret 注入前端 bundle — 写进去就是公开
- 多环境:`.env.development` / `.env.production` / `.env.local`(gitignored)
- 类型化:`vite-env.d.ts` 或 `process.d.ts` 给环境变量加类型
- runtime config(无需重 build 切换): 通过 `/config.json` 运行时拉

## Source map 策略

- prod: 生成 source map,但不发到浏览器(用 sentry / 监控上传)
- dev: full source map
- prod 用户能下载 source map = 业务逻辑泄露

## CI build 速度

- 缓存 `node_modules`(按 lockfile hash)
- 缓存 bundler 中间产物(Turbo / Nx / Vite plugin)
- 大 monorepo: 只 build 受影响的包(`turbo run build --filter=...[changed]`)
- 多核并行:`pnpm -r --workspace-concurrency=auto`

## 反模式

- **dev 和 prod 用不同 bundler**: bundler 行为差异会让 "dev 好的 prod 炸"
- **prod build 跳过 type check**:类型错被偷偷部署
- **lib 同时发 ESM/CJS 但维护可变全局**: dual package hazard
- **barrel files 大量 re-export**: tree-shake 失效
- **secret 注入前端**: bundle 里能 grep 出来
- **prod source map 公开**: 泄露源码
- **package.json `main` / `exports` 不一致**: 不同打包器走不同入口,bug 玄学

## 决策辅助清单(给 arch-design)

- [ ] bundler 选择是否匹配项目类型(app vs lib)?
- [ ] dev 和 build 各自的速度数据?CI build 时间?
- [ ] ESM/CJS 策略对外?dual package hazard 评估?
- [ ] tree-shake 实际效果(看 bundle 分析报告)?
- [ ] 初始 JS 体积?路由 lazy load?
- [ ] env / secret 边界清楚?
- [ ] source map 不发用户?

## 参考

- Vite / Webpack / Rollup 官方文档
- "Web Performance in Action" — Jeremy Wagner
- bundlephobia / Bundle Analyzer 实战
- "Pure ESM Package" — sindresorhus
