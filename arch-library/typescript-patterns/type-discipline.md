# TypeScript Type Discipline

> Scope: strict 配置、类型安全边界、品牌类型、类型即文档。`arch-frame` 在识别到 TS 项目时加载。

## strict 是底线,不是讨论项

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,                       // 总开关
    "noUncheckedIndexedAccess": true,     // arr[i] 类型带 undefined
    "exactOptionalPropertyTypes": true,   // ?: 不允许显式赋 undefined
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "noPropertyAccessFromIndexSignature": true
  }
}
```

新项目默认全开;老项目分阶段开,优先 `strict` + `noUncheckedIndexedAccess`(这两个抓最多真 bug)。

任何 `// @ts-ignore` / `// @ts-expect-error` / `as any` 都该加注释解释为什么,且数量是个 KPI(每周看一次趋势)。

## any / unknown / never 的语义

| 类型 | 何时用 |
|---|---|
| `any` | **几乎从不**。第三方库无类型时短期妥协 |
| `unknown` | 不信任的输入(JSON.parse 结果 / 跨边界数据)— 用 type guard 收窄 |
| `never` | exhaustive check / 不可达分支 |
| `void` | 函数无返回值 |
| `undefined` | 显式表达"没有值" |

`any` 像传染病。某处的 `any` 会通过返回值/参数把类型擦掉,远处的代码以为有类型,实际没有。

## 类型即文档:命名 + 收窄

### Branded / Nominal types

```ts
type UserId = string & { readonly __brand: 'UserId' };
type OrderId = string & { readonly __brand: 'OrderId' };

function getOrder(id: OrderId) {...}

const uid: UserId = 'u_123' as UserId;
getOrder(uid); // ❌ 编译错;靠类型系统挡住"传错 ID"
```

代价:需要 helper 构造 branded 值。收益:消灭一整类"参数顺序传错"的 bug。

### Discriminated unions

```ts
type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: Error };

function handle(r: Result<number>) {
  if (r.ok) {
    r.value;  // ✅ T
  } else {
    r.error;  // ✅ Error
  }
}
```

比抛异常 / 返 null 都强:类型系统强制每个调用点处理两个分支。

### Const assertions + as const

```ts
const STATUSES = ['pending', 'active', 'closed'] as const;
type Status = typeof STATUSES[number]; // 'pending' | 'active' | 'closed'
```

避免枚举失同步:数据源是数组,类型从数组推。

## 类型边界(trust boundary)

代码外的数据(API 响应 / localStorage / postMessage / IPC / form input)**必须**在边界处验证,不能 `as` 强转。

工具:
- **zod** / **valibot** / **arktype**:runtime schema → infer TS type
- **io-ts**(老牌,函数式)
- **superstruct**

模式:
```ts
const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
});
type User = z.infer<typeof UserSchema>;

const data = UserSchema.parse(await res.json()); // 失败抛
// data 此后是 User,内部完全可信
```

这条边界画清楚 = 内部代码可以 `noUncheckedIndexedAccess` + 全 strict 都成立。

## API client 的类型来源

| 来源 | 工具 |
|---|---|
| OpenAPI | openapi-typescript / orval / kubb |
| GraphQL | graphql-codegen / gql.tada |
| tRPC | 内置(server → client 端到端) |
| Protobuf | ts-proto / @bufbuild/protoc-gen-es |
| 内部 REST 无 schema | zod + 手抄 → 推动后端补 schema |

**严禁**:手抄 `interface ApiResponse { ... }`。会漂移、会过期、PR 时看不出来。

## 错误处理的两种范式

### Throw-based(默认)

- 简单,熟悉
- 调用方易忘记捕,异步层级深时容易吞
- 类型系统不强制(throw 不在签名里)

### Result-based

```ts
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };
```

- 类型强制处理失败
- 啰嗦,大量 `if (!r.ok) return r;`
- 适合关键路径(支付 / 鉴权 / 数据迁移)

混用:外层框架用 throw,关键内部模块用 Result,**项目内统一**。不要随机切换。

## 泛型 / 高阶类型

工程项目里**少用**重度泛型 / 高阶类型 / 字面量推导奇技。原因:

- 编译变慢(尤其大 monorepo)
- IDE 报错信息一坨,新人理解成本高
- 维护时改一处,远端类型推导报错十处

抢救式手段保留给:lib 作者、框架边界、真的复用 ≥ 5 处的地方。业务代码 `interface` + `union` 够用。

## 重要的 lint / 工具

- `@typescript-eslint/no-floating-promises`:抓未 await 的 Promise(常见 bug)
- `@typescript-eslint/strict-boolean-expressions`:防止 `if (str)` 误判空串/0
- `@typescript-eslint/consistent-type-imports`:`import type` 一致
- `eslint-plugin-deprecation`:用了 @deprecated 警告
- `ts-prune` / `knip`:找死代码 / 未导出 export

## 反模式

- **`any` 满天飞**:抢救:加 `@typescript-eslint/no-explicit-any` rule + 改 warn,看趋势
- **type-only 文件大杂烩**:`types.ts` 1000 行 → 拆按主题或就近放
- **`object` / `Object` 当类型**:几乎一定是错的
- **运行时数据未验证**:`as User`,运行时炸
- **enum 滥用**:大多数场景 `as const` 字面量数组 + union 更好(enum 编译产物不可摇树、值类型混淆)
- **跨端不区分**:Node 类型(Buffer / process)漏到浏览器代码 → tsconfig lib 区分

## 决策辅助清单(给 arch-options)

- [ ] strict 全开了吗?noUncheckedIndexedAccess 开了吗?
- [ ] any 数量是不是 KPI?有趋势监控?
- [ ] 类型边界(API / IPC / storage)用什么验证?
- [ ] API 类型是生成的还是手抄的?
- [ ] 关键模块的错误处理是 throw 还是 Result?项目内一致?
- [ ] branded type 用了吗?有"参数传错 ID"的历史 bug 吗?

## 参考

- "Total TypeScript" — Matt Pocock
- "Type-Driven Development with TypeScript" — Vladimir Klepov
- zod / valibot / arktype 官方文档
