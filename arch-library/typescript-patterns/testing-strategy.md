# Testing Strategy (TS/JS)

> Scope: 测试金字塔分层、工具选型、测什么不测什么、CI 集成。

## 反 "Testing Pyramid" 的现代倾向

经典金字塔(大量 unit → 较少 integration → 极少 e2e)在前端被部分推翻:

- "Testing Trophy"(Kent C. Dodds):**integration 才是甜区**(单组件 + 真 DOM + mock 网络),unit 当辅助,e2e 守关键路径
- 后端通常仍金字塔,但 "test the boundaries" 比 "test every function" 更值钱

实务结构:
1. **Static**: TS strict + eslint + 自动化(免费,catch 大量低级)
2. **Unit**: 复杂纯函数 / utils / 算法
3. **Integration / Component**: 真实组件渲染 + 假数据 + 真 DOM 交互
4. **E2E**: 关键用户旅程(签到、付款、核心 CRUD),不超过 20 条
5. **Visual / 截图**: 设计敏感 UI 防回归

## 工具栈对照

### 测试运行器

| 工具 | 适用 |
|---|---|
| **Vitest** | 现代默认。Vite-native、ESM-native、watch 体验最好 |
| **Jest** | 历史项目;新项目除非生态绑定,选 Vitest |
| **Node test runner** (`node --test`) | 简单 Node 项目;无外部依赖即可跑 |
| **Bun test** | Bun 项目自带,快;生态早期 |

### 浏览器 / DOM

| 工具 | 适用 |
|---|---|
| **jsdom** | 默认,纯 JS DOM 模拟,够 90% 场景 |
| **happy-dom** | 更快、更轻、覆盖略少 |
| **playwright-ct** / **vitest browser mode** | 真浏览器组件测试,接近真实 |

### Component / Integration

- **React Testing Library** / **Vue Test Utils** / **Svelte Testing Library**:都按 "test from user perspective" 设计
- **Storybook + interactions**:把组件文档化 + 用 play 函数测交互
- **MSW**(Mock Service Worker):拦截 fetch/XHR,前端测试**不要** mock fetch 本身,mock 网络

### E2E

| 工具 | 适用 |
|---|---|
| **Playwright** | 默认。多浏览器、强 selector、好调试、auto-wait |
| **Cypress** | 老牌,有用户基础;iframe / 多 tab 弱 |
| **Puppeteer** | 偏抓取;e2e 用 Playwright 更顺 |
| **WebdriverIO** | 强自定义、移动端;学习曲线 |

### 视觉回归

- **Chromatic** (Storybook 配套) / **Percy** / **Playwright snapshot**
- 慎用 — 不稳定截图比无测试还烦

## 测什么 / 不测什么

### 该测

- 业务规则 / 计算(扣款、积分、配额)— **重点**
- 跨边界的契约(API client 解析、状态变化、路由跳转)
- 修过的 bug — 加回归测试
- 真用户路径的关键节点(注册、付款、导出)

### 不该测

- 第三方库(测它们自己测过的事是浪费)
- 简单 getter/setter / pass-through
- 实现细节(测"组件用了 useState"就是错;改实现就破)
- 临时 UI 文案 / 间距 / 颜色(让设计走视觉回归或 Storybook 验)

### "100% 覆盖率" 是骗局

覆盖率指标:
- < 60%:可能漏关键路径
- 60-80%:健康区间
- > 90%:看看是不是在测无意义的事情

更重要的指标:
- **关键路径覆盖**(critical flow):付款流程必须覆盖到边
- **mutation testing**(stryker):测试是不是真在测?或者只是跑过?

## 数据 / Mock 策略

- **不要 mock 你拥有的代码**:mock 自己的函数 = 测试在测假对象
- **mock 跨边界**:API / 时间(`vi.useFakeTimers`) / 随机 / 文件系统
- **MSW** 拦网络,组件 + state + service 走真实路径
- **fixture** > **factory** > **inline**:复用、可读、易改

## E2E 的现实

- **稳定性 > 数量**。50 条不稳定 e2e = 团队 ignore CI
- 每条 e2e 必须能在本地复现
- 不要等 timeout — 用 Playwright auto-wait + locator 而非 sleep
- 数据隔离:每条测试自己造数据 + 测后清,**不要**依赖全局测试数据
- 跑得慢 → 并行(Playwright workers)+ 按 sharding 切到 CI
- 失败要有 trace / screenshot / video,排错才有钩子

## CI 集成

- PR 触发:lint + type-check + unit + component → 全过才能合
- nightly:e2e 全跑 + visual regression
- main 触发:全套 + deploy preview
- 测试时间预算:PR < 5 分钟,nightly < 30 分钟
- 跑得慢的最大原因是 e2e 写法 — 而不是测试运行器

## 性能 / 稳定性维护

- **flaky test 是头号杀手**。一条 flaky → 全员失去信任 → 该测的不补
- flaky 必须当 bug 修(不是 retry 兜)
- 测试失败信息要能读懂:assertion message + 上下文(state / DOM 当前样子)
- snapshot 不要滥用 — 大 snapshot 没人审

## Electron / Tauri 特殊

- main 进程逻辑:像测 Node 一样用 vitest
- renderer 进程组件:跟普通 React 测一样
- IPC 边界:契约测试(假定 IPC 通,关注两端)
- 全程 e2e:Playwright 启动 Electron app(spawn 模式)+ 测真实窗口

## 反模式

- **测试调内部实现细节**:改 hook 名就破,毫无价值
- **共享 state 跨测试**:一个测试影响下一个 → flaky
- **大 mock 对象**:setup 50 行,看不出在测啥
- **e2e 当 unit 用**:测每个按钮 → 慢、不稳、bug 不定位
- **覆盖率门槛 90%**:逼着写无价值的测试
- **CI 慢就拆 retry**:retry = 把 flaky 藏起来,永远修不掉
- **本地能过 CI 挂**:环境差异(时区 / 文件系统 / 浏览器版本)— 把 CI 复现拉到本地

## 决策辅助清单(给 arch-design)

- [ ] 测试分层是否合理?是否过度 unit / 缺 integration?
- [ ] MSW(或等价)在用吗?fetch mock 还是网络 mock?
- [ ] 关键用户路径 e2e 列出来了吗?都健康吗?
- [ ] flaky 率有度量吗?>1% 就是危险信号
- [ ] CI 测试时间 PR < 5 分钟?nightly < 30 分钟?
- [ ] 覆盖率追求的是关键路径还是数字?

## 参考

- "Testing Trophy" — Kent C. Dodds
- Playwright / Vitest / Testing Library 官方文档
- "The Practical Test Pyramid" — Ham Vocke (Martin Fowler blog)
