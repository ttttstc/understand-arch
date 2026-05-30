# understand-arch

> 面向高级架构师的 Claude Code 插件。把你的代码仓维护成一份可信、可追溯的架构知识库 —— 单仓和多仓都支持。

[English](./README.md)

---

## 是什么

`understand-arch` 把代码仓变成一份**活的、可信的、与代码同步**的架构知识库:

- **知识图谱** — 每个组件、接口、数据模型、部署、业务能力都是图谱节点,与代码同步(底层每条推断都有代码证据支撑)
- **架构文档** — 一份可通读的 `ARCHITECTURE.md` 白皮书(+ 14 个章节切片),读起来像一篇标准架构技术文档,不是工具报告
- **方案设计** — 每个变更产出一份 `CR.md`(14 段 RFC 风格),基于 PRD + 当前架构生成
- **决策留底** — Append-only ADR 台账
- **团队规范 + 项目约束** — 两层规则:
  - **规范层**:你的命名规范、合规红线、依赖白名单(你自己写,权威)
  - **约束层**:AI 从代码里考古挖出的领域不变量、依赖规则、契约、风险点,叠加资深成员脑子里的隐式知识(`/arch-interview` 访谈沉淀),每条都有 5 级证据等级(confirmed / observed / inferred / uncertain / conflicted),AI 挖出的只能是 proposed,**人确认后才进 wiki 与方案评审**
- **可视化看板** — 交互式查看代码图谱与架构层

所有产物都在项目根目录下的一个目录里:`.understand-arch/`。其他位置不会被污染。

## 能做什么

**接手项目(单仓 / 多仓都行)**
> "帮我看懂这个项目" → `/arch-onboard`

扫描所有注册的仓库,产出每仓知识图谱 + 跨仓视图。推断架构风格、组件职责、技术栈选型理由、业务能力、质量属性、风险与技术债。产出一份完整的 `ARCHITECTURE.md` 白皮书,新人能快速上手。

**把架构当一篇文档读**
> 打开 `.understand-arch/{project}/wiki/ARCHITECTURE.md`

一篇从头读到尾的架构技术文档:项目总览、组件、接口、数据模型、能力、质量、风险与技术债、部署、流程、决策、变更、规则。用平实语言写,不带工具术语,不教你"怎么读" —— 只讲这个项目的架构。

**基于当前架构设计一份方案**
> "根据这份 PRD 设计方案" → `/arch-design`

读 PRD + 当前架构 → 找出受影响的节点(跨仓追踪,分核心改动集和邻接复核集)→ 产出一份 `CR.md`(14 段:背景 / 影响面 / 方案 / 替代方案 / NFR / 风险 / 改动清单 / 灰度 / 回滚 / 测试 / 关联 / …)。高级架构师 agent 终审后才标 ready。

**审视基线是否还可信**
> "现在的架构基线还能信么" → `/arch-audit`

对比已存指纹和当前状态。识别模型与现实的漂移、可追溯性断裂、降级状态。必要时建议刷新。

**重新生成或刷新文档**
> "更新 wiki" / "给 CTO 一份高层汇报" → `/arch-wiki`

基于最新图谱 + 架构层重渲 `ARCHITECTURE.md` 和 14 个切片。支持受众化:`cto` / `newcomer` / `pm` / `architect`。高级架构师 agent 做质量评审(首次 / cto / architect 跑完整审,日常刷新跑轻量审)。

**可视化架构**
> "打开看板" → `/arch-dashboard`

启动交互式看板:代码图谱、能力地图、风险视图、多仓拓扑、分步架构导览。

**画 4+1 / C4 架构图**
> `/arch-diagram`

在 wiki 中提供 Mermaid 源码;渲染成图片的能力留给后续版本。

**挖资深成员脑子里的隐式知识**
> "聊聊这个项目里我没看明白的地方" → `/arch-interview`

很多关键约束写不进代码注释,只在老员工脑子里:为什么这个模块只能单线程跑、为什么这个字段不能改名、这条依赖链当年是为了绕过哪个坑。`/arch-interview` 会先把 onboard 阶段 AI 考古挖出的"可疑实现点"(怪味道、定制逻辑、无效引用、被吞异常等)摆出来,**一次一题**地按场景(领域 / 依赖 / 历史 / 定制 / 风险 / 运维 / 测试)向你提问,每题附 AI 推荐答案,你确认 / 修正 / 跳过即可。访谈结束沉淀为 proposed 约束,经你确认后并入约束层。

## 安装

在 Claude Code 中依次执行:

```text
/plugin marketplace add https://github.com/ttttstc/understand-arch
/plugin install understand-arch@understand-arch
/reload-plugins
```

插件 manifest 保持极简,Claude Code 直接从 `skills/*/SKILL.md` 自动发现 slash command。执行 `/reload-plugins` 后,在任意 prompt 输入 `/arch-`,应该能看到 7 个命令:

- `/arch-onboard`
- `/arch-design`
- `/arch-audit`
- `/arch-wiki`
- `/arch-diagram`
- `/arch-dashboard`
- `/arch-interview`

### 看不到命令?

1. **是否执行了 `/reload-plugins`?** 没执行 Claude Code 不会扫到新安装的 plugin skill。
2. **检查插件是否真装上**:`/plugin list` 应能看到 `understand-arch`。
3. **命令格式**:`/arch-onboard`(短横线),**不是** `/arch:onboard`(冒号语法不支持)。
4. **强制重载**:重启 Claude Code,再 `/reload-plugins`。

### 可选:开启 git commit 自动刷新

默认情况下,基线仅在你执行 `/arch-onboard` 或 `/arch-audit` 时刷新。如果希望每次 git commit 后自动刷新:

```text
/arch-onboard --enable-hooks
```

会把项目 state 文件里的 `hooks_enabled` 设为 `true`。任何时候改回 `false` 即可关闭。

## 怎么开始

```text
/arch-onboard
```

首次运行会:
1. 扫描你的代码仓(多仓项目会自动发现兄弟仓库并询问是否纳入)
2. 构建知识图谱
3. 推断架构层(风格、组件、能力、质量、风险、技术债)
4. 渲染 `ARCHITECTURE.md` + 14 个切片
5. 告诉你哪些信息它无法确定(known_unknowns),你来决定要不要进一步补全

后续命令都基于同一个 workspace 增量演进。自然语言触发也可以:

- "帮我看懂这个项目" → `/arch-onboard`
- "根据这份 PRD 设计方案" → `/arch-design`
- "基线还能信么" → `/arch-audit`
- "给 CTO 整一份汇报" → `/arch-wiki --audience=cto`

## 在你文件系统上看到什么

```
your-project/
├── src/
├── package.json
├── …
└── .understand-arch/                 ← 我们唯一新增的目录
    └── {project}/
        ├── specs/
        │   ├── repos.json            ← 注册的仓库
        │   ├── repos/{id}/knowledge-graph.json   ← 每仓代码图谱
        │   └── arch-layer.json       ← 架构层(风格/能力/风险/…)
        ├── wiki/
        │   ├── ARCHITECTURE.md       ← 完整可读白皮书
        │   └── 01..14-*.md           ← 章节切片
        ├── rules/                    ← 团队规范(根目录,你编辑)
        │   └── constraints/          ← 项目约束(AI 考古 + 访谈,人确认后生效)
        ├── decisions/                ← ADR 台账(append-only)
        ├── change-requests/          ← CR.md 文件
        ├── state.yaml                ← 工作流状态
        └── intermediate/             ← 扫描中间产物(gitignored)
```

自动生成的 `.gitignore` 会把 `intermediate/` 和埋点排除掉。其他目录默认随代码一起 commit。

## License

MIT — 见 [LICENSE](./LICENSE)。

架构扫描引擎 fork 自 [Understand-Anything](https://github.com/Lum1104/Understand-Anything)(MIT)。见 [engine/NOTICE](./engine/NOTICE)。
