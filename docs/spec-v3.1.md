# understand-arch v3.1 Spec(规格约束层 + 知识访谈)

> Version: 3.1 · Status: Draft · 基于:`docs/spec-v3.0.md`(增量 delta,不重写 v3.0)
> 主题:把"重建规格"补全 —— 机器考古 + 人脑访谈 + 团队规范三源汇聚成**可执行约束层**,并被 arch-design 消费。

---

## 0. 摘要

v3.0 让 understand-arch 能"看懂系统 + 设计变更"。v3.1 补上文章《浅谈 AI 编程》指出的核心缺口:**"老代码库行为存在,但规格不存在;先重建规格,再允许生成。"**

v3.1 三个增量:

1. **规格约束层**:把"系统里没人写下来、但全系统依赖、AI 最容易改坏"的隐性契约,抢救成"显性、带证据等级、可执行检测、可演进"的护栏。三个来源:
   - **机器考古**(`arch-constraint-miner`):从代码行为反推隐性约束
   - **人脑访谈**(`/arch-interview` ★ 新一级命令):像严谨新员工,基于图谱反常点深挖老员工脑里的"为什么"
   - **团队规范**(`rules/`,人工权威):团队主动定的规矩
2. **5 级证据等级**(中文):替代粗粒度 confidence,新增"有冲突"等级(老代码库审计刚需)
3. **design 消费规则**:arch-design 全流程应用约束(影响面比对 / 设计护栏 / 符合性声明 / senior blocker),兑现"先有规格才允许生成"

v3.1 用户入口:6 → **7**(新增 `/arch-interview`)。

---

## 1. 全局文档语言规约(所有产物适用)★

> 这条是 v3.1 全局规约,所有 skill / subagent / reviewer 共享引用。

**所有面向人的产物默认中文**:wiki / ARCHITECTURE.md / CR.md / ADR / 约束层 / 访谈记录 / suspicious-findings / audit 报告 / eval 报告 / 用户提示。

**保留英文(标识符,非叙述)**:
- 代码标识符 / 文件路径 / 命令(`src/app.ts`、`pnpm test`、`/arch-design`)
- schema 字段名 / 枚举值 / node id(`evidence_level`、`confirmed`、`web::file:...`)
- 第三方库 / 框架 / 产品名(React、Electron、Kafka)
- 无标准中文译法的术语:首次"中文(English)",后续用中文

**禁止**:中英文夹在同一句叙述。
- ❌ "当前采用 monolithic 架构,components 运行在 renderer process 中"
- ✅ "当前采用单体架构,组件运行在渲染进程中"

**落地**:写进每个产文档 subagent 的 prompt + 各 reviewer 加"语言纯净度"验收维度(中英混杂叙述 = finding)。

---

## 2. 证据等级升级(5 级,中文)

替代 v3.0 的 `confidence: high/medium/low`。所有 LLM 推断字段、约束条目、wiki 判断统一用 `evidence_level`:

| evidence_level(英文字段值) | 中文展示 | 含义 |
|---|---|---|
| `confirmed` | 已确认 | 代码 + 测试 + 文档共同支持,或人证确认 |
| `observed` | 已观察 | 由代码行为或日志观察支持 |
| `inferred` | 已推断 | 根据命名 / 调用链 / 注释推断 |
| `uncertain` | 待定 | 无法确认,需人类判断 |
| `conflicted` | 有冲突 | 代码 / 测试 / 文档 / 多来源之间矛盾 ★ |

- 字段值用英文(机器稳定),展示用中文
- `conflicted` 是 v3.1 新增,老代码库审计的高价值信号(矛盾点 = 最该问人的地方)
- v3.0 → v3.1 迁移:`high→confirmed/observed`、`medium→inferred`、`low→uncertain`;旧 `confidence` 字段废弃

---

## 3. 规范层 vs 约束层(rules/ 的两层)

```
.understand-arch/{project}/rules/
├── (规范层:人工权威,AI 只读)── "团队主动定的规矩"
│   ├── banned-patterns.md
│   ├── compliance.md
│   ├── naming.md
│   ├── network-boundaries.md
│   ├── tech-radar.md
│   └── dependencies.md
└── constraints/  (约束层:AI 考古 + 人访谈,人确认)── "从系统反推的护栏"
    ├── system-charter.md         系统使命 + 非目标 + 价值优先级
    ├── domain-invariants.md      领域/数据不变量
    ├── dependency-rules.md       依赖方向规则
    ├── api-contracts.md          接口语义承诺
    ├── risk-register.md          高风险区 + 高风险变更规则
    ├── test-coverage-gaps.md     测试覆盖缺口
    ├── suspicious-findings.md    ★ AI 侦查的反常点清单(埋雷预警 + 访谈来源)
    └── interview/                访谈记录留底
        └── interview-{date}-{受访人}.md
```

**两层本质区别**:
- 规范层 = 人 → 系统(团队希望系统怎样),永久权威
- 约束层 = 系统 → 人(系统实际已经怎样,且不能乱动),AI 初稿 + 人确认

文章"十类文档"基本落在约束层。

### 3.1 约束条目结构(统一)

约束层每个文件里的每条约束,统一结构:

```markdown
### {约束标题}
- 约束:{不能做什么 / 必须保持什么}
- 依据:{来自代码的事实,带 node id / file:line} 或 {老员工口述}
- 证据等级:已确认 | 已观察 | 已推断 | 待定 | 有冲突
- 违反检测:{可执行命令,如 `depcruise --config dep.config.js services/billing-core`}
- 状态:proposed | confirmed | rejected | adjusted
- 来源:ai-mined | interview | human
- 备注:{受访人+日期(interview)/ 关联反常点 / 关联 ADR}
```

### 3.2 状态机

```
proposed(AI 考古/访谈初稿)
   ↓ 人 review
confirmed(升级为项目特殊规则,硬约束)
rejected(误判,保留记录不删,避免下次重复提)
adjusted(人改过措辞/范围后确认)
```

- 只有 `confirmed` 是硬约束
- `proposed` 是软提示(可能误判)
- `rejected` 保留(防 AI 下次重复考古同一误判)

### 3.3 谁产 / 谁权威

| 来源 | 谁产 | 初始状态 | 谁能升 confirmed |
|---|---|---|---|
| 规范层 | 人工编辑 | (天然权威) | — |
| 约束层 ai-mined | arch-constraint-miner | proposed | 人确认 |
| 约束层 interview | arch-interview | proposed | 人确认 |

---

## 4. arch-constraint-miner subagent(机器考古)

v3.1 新增 subagent(架构师层,arch-* 前缀)。subagent 总数 13 → **14**。

- **时机**:onboard 的 arch-enrich 阶段(Phase 7-13 之后加一个约束考古 phase)
- **职责**:从 graph + 代码反推隐性约束,写 `rules/constraints/` 的 proposed 条目
- **考古什么**:
  - 依赖方向(实际从不互调的模块对 → dependency-rules)
  - 数据不变量(某字段/状态实际从未被某种方式修改 → domain-invariants)
  - API 语义承诺(实际的幂等/错误处理模式 → api-contracts)
  - 系统边界(实际的内外部边界 → system-charter 候选)
- **强约束**:每条带 evidence_level + 依据(file:line)+ violation_check + 状态 proposed + source: ai-mined
- **诚实**:考古是"可疑候选",证据等级如实标(多为 observed/inferred),不得标 confirmed(只有人能确认)

---

## 5. /arch-interview(一级命令,知识访谈)★

### 5.1 定位

> 机器考古挖"系统行为里的隐性约束";`/arch-interview` 挖"老员工脑子里、连代码行为都体现不出来的'为什么'"。像一个**严谨、认真、善于问问题的新员工** —— 先当侦探从图谱找反常点,再拿具体疑点问老员工"这里为什么这样"。

补文章价值边界:"AI 能发现 legacy_response 没被删过,但发现不了'因为 2019 年删过导致大客户数据丢失'"。

### 5.2 触发与节奏

- 命令:`/arch-interview [--scenario=<域>]`
- **触发关系(设计1=c)**:有 graph 就基于反常点精准问;没 graph 走通用场景问卷兜底
- **节奏(设计2=b+c)**:按场景域切,一次一个域可单独约时间;每域问到信息收敛即收;支持中断续跑(state 记进度)

### 5.3 三阶段流程

```
Phase A 侦查(AI 自动,无人参与)── 像严谨新员工先做功课
  读 graph + arch-layer + 考古 constraints
  扫"反常点"(设计3=c):
    | 反常类型 | 信号 |
    | 奇怪实现 | 同步本可异步 / 深嵌套 / 绕路调用 |
    | 定制逻辑 | 针对特定值/客户/环境的 if / magic number |
    | 逻辑不通 | 恒真恒假条件 / 写了不用的返回 / 矛盾校验 |
    | 无效/可疑引用 | 孤立节点 / import 不用 / 高频依赖却无测试 |
    | 吞掉异常 | catch 空处理 / 错误静默 |
    | 反模式但稳定 | 上帝模块 / 循环依赖 / 跨层调用却一直没改 |
    | 有冲突 | 代码/测试/文档/考古结果互相矛盾 |
  每点打分(可疑度 × 影响面),排序
  → 写 rules/constraints/suspicious-findings.md(★ 详细留痕,见 5.4)

Phase B 访谈(grill 式,一次一问,带推荐答案)
  按场景域组织(领域/数据、依赖/边界、历史包袱、特殊适配、风险/事故、运维/部署、测试盲区)
  从高分反常点开始
  每问:给 AI 推荐答案(基于代码猜测 + 考古结果 + 行业常见模式)→ 老员工 确认/纠正/补充
  发现与已有 proposed/别人说法冲突 → 当场标 conflicted
  一个域问到信息收敛即收,支持中断续跑

Phase C 产出
  → rules/constraints/ 的 proposed 约束(source: interview,记受访人+日期+关联反常点)
  → rules/constraints/interview/interview-{date}-{受访人}.md(原始问答留底)
  人确认 → confirmed 升级为项目特殊规则
```

### 5.4 suspicious-findings.md(设计1=b,要详细)

AI 侦查的反常点**独立留痕,作为埋雷预警 + 访谈来源**:

- 每个反常点:位置(file:line / node id)+ 反常类型 + 可疑度评分 + 影响面 + AI 的怀疑理由 + 推测 + 状态(待访谈 / 已解答 / 已转约束)
- **要尽量详细** —— 这是"容易埋雷的关键证据",哪怕没人访谈解答,标出来也是高价值的风险地图(对应文章 RISK_REGISTER)
- 访谈覆盖的标"已解答"并链接到产出的约束;没覆盖的留"待访谈",下次接着问
- 支持多次访谈续挖

### 5.5 与 arch-audit 分工(设计2=独立)

- audit = "基线 vs 现实是否漂移"(时间维度)
- interview Phase A = "代码本身有哪些反常实现需要人解释"(静态可疑度)
- 两者都读 graph 但问题不同,interview Phase A 侦查逻辑独立,不依赖 audit

### 5.6 interview 约束 vs 考古约束

| | 考古(constraint-miner) | 访谈(arch-interview) |
|---|---|---|
| 来源 | 代码行为反推 | 老员工脑子 |
| 强项 | "是什么"(现状不变量) | **"为什么"(历史因果)** |
| 证据 | 代码 file:line | 人口述 + 关联代码 |
| 证据等级 | 多 observed/inferred | 多 confirmed(人证),标受访人 |
| 典型产出 | "invoice issued 后金额未被改" | "issued 后金额锁死,因 2019 审计事故,见 ADR" |

理想流程:onboard 考古 → interview 针对考古疑点深挖。

---

## 6. design 消费规则(约束层价值兑现)★

### 6.1 design 对待三类规则

| 来源 | 状态 | design 对待 |
|---|---|---|
| 规范层 | 永久权威 | **硬约束**,违反 = blocker |
| 约束层 confirmed | 已确认 | **硬约束**,违反 = blocker |
| 约束层 proposed | 待确认 | **软阻塞**(设计Y=b),触碰 = 提示先确认 + 可 override(留记录) |

核心:**confirmed 拦截,proposed 提醒**。

### 6.2 四个介入点

```
arch-impact-analyzer
  找受影响节点 + ★交叉比对约束层 → 标"踩约束的改动"
  触碰 proposed → 软提示"建议先 /arch-interview 或人工确认该约束再继续"(可 override)
    ↓
arch-solution-designer
  ★先读管辖相关节点的所有约束作为设计护栏 → 方案主动遵守(不是事后查)
  写 CR.md,含 §4.6 约束符合性(见 6.3)
    ↓
arch-senior-reviewer 终审
  违反 confirmed/规范层 → blocker(verdict 不能 pass)
  触碰 proposed 未 override → major finding
  约束带 violation_check → review 报告附检测命令
```

### 6.3 CR.md §4.6 约束符合性(设计X=c,并入详细设计)

不新增段(保持 14 段)。在「4. 详细设计」加子节 4.6:

```markdown
### 4.6 约束符合性
| 相关约束 | 来源 | 状态 | 本方案 | 违反检测 |
|---|---|---|---|---|
| invoice issued 后金额不可变 | 约束层 | 已确认 | ✅ 遵守:只改 status 不碰 amount | `pnpm test contract:invoice` |
| billing-core 不依赖 payment-adapter | 规范层 | 权威 | ✅ 遵守:走 event | `depcruise ... billing-core` |
| legacy_response 不可删 | 约束层 | 待定(proposed) | ⚠️ 触碰:方案需删 → 建议先确认 | — |
```

- 列出方案触及的所有约束(规范层 + confirmed + proposed)
- 每条:遵守 / 触碰说明 + violation_check 命令(研发实施后可手动验证)
- senior 必查此子节

### 6.4 违反检测在 design 的用法(B1)

- 约束的 violation_check 命令写进 CR.md §4.6
- 研发实施完手动跑验证没违反 —— 把架构约束接到研发可执行验证(文章"没有检测方式的约束只是口号")
- v3.1 只做"CR 给出命令";自动跑留 v3.2

---

## 7. CR.md 风格规约(业界标准设计交付文档)★

对标 wiki §10.1 的品味要求,落到 CR:CR.md 要像**一份正经的、研发能直接照做的设计交付文档**(业界 Tech Spec / RFC / 设计评审文档),不是工具味的字段拼接。

| 维度 | 要求 |
|---|---|
| 结构 | 14 段已对齐 RFC/Tech Spec |
| 语言 | 工程语言 + 中文(§1 语言规约);无"本工具识别了/扫描了/字段含义"等元叙述 |
| 详细设计 | 具体到可实施:数据模型给字段级变更思路、接口给契约、组件给职责调整、关键流程给 Mermaid 时序 |
| 改动清单 | 文件级/函数级,研发能对着改 |
| 实施 | 可执行步骤拆解 + 灰度 + 回滚,像真的发布计划 |
| 自包含 | 研发不用回翻工具/图谱,CR 本身信息完整 |

**判断标准**:把 CR.md 给一个不知道 understand-arch 的资深研发看,他应觉得"这是一份正经的方案设计文档,我能照着实施",而非"工具吐出来的报告"。

---

## 8. 约束层进 wiki 展示(设计5=b)

- wiki 加展示已 **confirmed** 的约束(架构师/新人需知道"哪些不能动")
- 放在 `07-risks-and-debt` 或新增约束小节;proposed 不进 wiki(未确认,避免误导)
- 遵守 §10.1 wiki 风格(无元叙述、无 evidence 内联)

---

## 9. arch-layer 约束类要素加 violation_check(B1)

v3.0 arch-layer 的约束相关要素(dependency 规则 / 数据不变量等,若在 arch-layer 体现)加 `violation_check` 字段(可执行命令)。与 rules/constraints/ 的约束条目对齐。

---

## 10. 验收增量

| 验收对象 | 规则 |
|---|---|
| 约束条目 schema | 结构完整(约束/依据/证据等级/违反检测/状态/来源);依据回链代码;状态合法 |
| suspicious-findings | 每反常点有位置 + 类型 + 评分 + 理由 + 状态;足够详细 |
| interview 产物 | proposed 约束 source=interview + 受访人;访谈记录留底 |
| design 约束消费 | CR.md §4.6 存在;违反 confirmed/规范层 → senior blocker;触碰 proposed → 提示/override 留记录 |
| 语言纯净度(§1) | 所有产物无中英混杂叙述(各 reviewer 加此维度) |
| CR.md 风格(§7) | 像业界设计交付文档,无工具元叙述,详细设计可实施 |

---

## 11. 套件规模变化(v3.0 → v3.1)

| | v3.0 | v3.1 |
|---|---|---|
| 用户入口 | 6 | **7**(+/arch-interview) |
| 内部 skill | 5 | 5(不变) |
| Subagent | 13 | **14**(+arch-constraint-miner;arch-interview 主体是 user skill,Phase A 侦查可内嵌或复用) |
| rules 结构 | 单层(人工) | **双层**(规范层 + 约束层) |
| 证据表达 | confidence 3 级 | **evidence_level 5 级中文** |

---

## 12. 实施顺序(Impl,接 v3.0 之后)

```
v3.1-Impl-1  证据等级 5 级中文(arch-layer.schema + 各 subagent + reviewer 迁移 confidence→evidence_level)
v3.1-Impl-2  rules/ 双层:constraints/ 目录 + 约束条目 schema + 状态机
v3.1-Impl-3  arch-constraint-miner subagent(考古)+ 接入 arch-enrich
v3.1-Impl-4  /arch-interview 一级命令:Phase A 侦查 + suspicious-findings + Phase B grill 访谈 + Phase C 产出
v3.1-Impl-5  design 消费规则:impact 比对 + solution 护栏 + CR.md §4.6 + senior blocker + proposed 软阻塞
v3.1-Impl-6  CR.md 风格规约落地(solution-designer prompt)+ wiki 展示 confirmed 约束
v3.1-Impl-7  全局语言规约落地(各 subagent prompt + reviewer 语言纯净度维度)
v3.1-Impl-8  验收 gate + e2e(Typola:考古产约束 + 模拟访谈 + design 消费约束全链路)
```

### checkpoint(Impl-8)

- 真实项目考古产出 proposed 约束(带证据等级 + violation_check)
- suspicious-findings.md 详细列出反常点
- /arch-interview 能基于反常点提问、产 proposed 约束 + 访谈记录
- CR.md §4.6 能列约束符合性;违反 confirmed 约束被 senior 拦截
- 所有产物中文无混杂

---

## 附录:与 v3.0 的关系

v3.1 是 v3.0 的增量,不推翻。v3.0 的 graph + arch-layer + wiki + dashboard + design + 三层验收全保留。v3.1 在其上加:规格约束层(三源)+ /arch-interview + 5 级证据 + design 消费规则 + 全局中文规约 + CR.md 品味线。

核心价值:兑现"先重建规格,再允许生成" —— 重建规格的三个来源(机器考古 + 人脑访谈 + 团队规范)全齐,且规格被 design 消费形成闭环。
