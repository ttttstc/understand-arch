# understand-arch

> 面向高级架构师的 Claude Code 插件。把你的代码仓维护成一份可信、可追溯的架构知识库 —— 单仓和多仓都支持。

[English](./README.md)

---

## 是什么

`understand-arch` 把代码仓变成一份**活的、可信的、与代码同步**的架构知识库:

- **知识图谱** — 每个组件、接口、数据模型、部署、业务能力都是带证据的节点
- **Wiki** — 14 页可读架构文档,所有断言都能回链到图谱节点(不编造事实)
- **方案设计** — 每个变更产出一份 `CR.md`(YAML frontmatter + 14 段 RFC 风格正文),基于 PRD + 当前架构生成
- **决策留底** — Append-only ADR 台账
- **团队约束** — 你的命名规范、合规红线、依赖白名单等,在方案评审时自然落地

所有产物都在项目根目录下的一个目录里:`.understand-arch/`。其他位置不会被污染。

## 能做什么

**接手项目(单仓 / 多仓都行)**
> "帮我看懂这个项目" → `/arch-onboard`

扫描所有注册的仓库,产出每仓 `knowledge-graph.json` + 跨仓 graph。识别组件、接口、数据模型、部署、业务能力,每条都带证据。同时产出 14 页 wiki,新人按 wiki 路径走能快速上手。

**基于当前架构设计一份方案**
> "根据这份 PRD 设计方案" → `/arch-design`

读 PRD + 当前 graph → 找出受影响的节点(跨仓追踪)→ 产出一份 `CR.md`(14 段:背景 / 影响面 / 方案 / 替代方案 / NFR / 风险 / 改动清单 / 灰度 / 回滚 / 测试 / 关联 / …)。高级架构师 agent 终审后才标 ready。

**审视基线是否还可信**
> "现在的架构基线还能信么" → `/arch-audit`

对比已存指纹和当前 commit。识别 graph 和现实的漂移、可追溯性断裂、降级状态。必要时建议刷新。

**重新生成或刷新 Wiki**
> "更新 wiki" / "给 CTO 一份高层汇报" → `/arch-wiki`

基于最新 graph 重渲 14 页。支持受众化:`cto` / `newcomer` / `pm` / `architect`。高级架构师 agent 会做质量评审(首次和 cto/architect 模式跑完整审,日常刷新跑轻量审)。

**画 4+1 / C4 架构图**
> `/arch-diagram`

v2.0 暂为占位实现,图片生成留给 v2.1。当前 wiki 中已包含 Mermaid 源码,可以先用。

## 安装

在 Claude Code 中依次执行:

```text
/plugin marketplace add https://github.com/ttttstc/understand-arch
/plugin install understand-arch@understand-arch
/reload-plugins
```

完成。插件 manifest 保持极简,Claude Code 会直接从 `skills/*/SKILL.md` 自动发现 slash command。执行 `/reload-plugins` 后,在任意 prompt 输入 `/arch-`,应该能看到 6 个一级 plugin skill:

- `/arch-onboard`
- `/arch-design`
- `/arch-audit`
- `/arch-wiki`
- `/arch-diagram`
- `/arch-dashboard`

### 看不到命令?

1. **是否执行了 `/reload-plugins`?** 没执行 Claude Code 不会扫到新安装的 plugin skill。
2. **检查插件是否真装上**:`/plugin list` 应能看到 `understand-arch`。
3. **Slash 名称格式**:`/arch-onboard`(短横线连接),**不是** `/arch:onboard`(冒号语法不支持)。
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
3. 渲染 14 页 wiki
4. 告诉你哪些信息它无法确定(known_unknowns),你来决定要不要进一步补全

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
└── .understand-arch/           ← 我们唯一新增的目录
    └── {project}/
        ├── specs/              ← 知识图谱(进 git)
        ├── wiki/               ← 14 页可读文档(进 git)
        ├── rules/              ← 你的团队约束(你编辑)
        ├── decisions/          ← ADR 台账(append-only,进 git)
        ├── change-requests/    ← CR.md 文件(进 git)
        ├── state.yaml          ← 工作流状态(进 git)
        └── intermediate/       ← 扫描中间产物(gitignored)
```

自动生成的 `.gitignore` 会把 `intermediate/` 和埋点排除掉。其他目录默认随代码一起 commit。

## License

MIT — 见 [LICENSE](./LICENSE)。

架构扫描引擎 fork 自 [Understand-Anything](https://github.com/Lum1104/Understand-Anything)(MIT)。见 [engine/NOTICE](./engine/NOTICE)。
