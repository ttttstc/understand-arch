# `arch/` — Per-Project Architecture Workspaces

每个被 `understand-arch` 操作过的项目,在这里有一个 `arch/{项目名}/` 子目录,作为该项目的**唯一架构工作区**。

## 顶层结构(每个项目)

每个项目目录被切成 **2 个 bucket,边界清晰**:

```
arch/{项目名}/
├── agent/       🤖 引擎契约,人不需要看(LLM / 工作流自己读写)
└── user/        ★ 给人看的全部交付件,从 user/README.md 开始
```

### 🤖 agent/ — 引擎契约

| 文件 / 目录 | 用途 |
|---|---|
| `状态.yaml` | workflow 状态机 + baseline_commits + overrides 索引 + integrity history |
| `证据/项目总览.yaml` | `arch-frame` 产,所有其他 skill 都回链这份 |
| `证据/仓库与组件清单.yaml` | `arch-analyze` 产 |
| `证据/依赖与链路图谱.yaml` | `arch-analyze` 产 |
| `证据/风险与技术债台账.yaml` | `arch-analyze` 产 |
| `证据/决策与证据索引.yaml` | `arch-adr` / `arch-frame` 产 |
| `证据/影响面-{change}.yaml` | `arch-diff-judge` 产(design 模式时每次变更一份) |
| `覆盖记录/OVR-NNN-{topic}.yaml` | 人工 acceptance override 审计 |
| `PM问题清单.md` | HARD GATE 时产出(本质是引擎状态,等用户填) |
| `指标.jsonl` | 每个 skill 跑完 append 一行(token / 时长 / 输入输出) |

### ★ user/ — 给人看的

| 路径 | 类型 | 何时产 |
|---|---|---|
| `README.md` | 入口 hub | 每次 workflow 跑完更新 |
| `知识库/首页.md + 01-06` | 持续更新 | onboard / audit 后 |
| `架构图/*.mmd` | 持续更新 | onboard / audit / design 时按需 |
| `决策史/ADR-NNN-xxx.md` | append-only | design 时产 |
| `设计变更/{change}/设计文档.md + 实施方案.md + 评审报告.md` | append-only | design 一次一目录 |
| `审计/{date}-体检.md` | append-only | audit 产 |
| `审计/{date}-评审-{topic}.md` | append-only | `/arch-review` 独立调用产 |
| `汇报/{date}-{audience}.md` | append-only | brief 产 |

## 公共子目录

```
arch/
├── _template/        Skeleton arch-workflow 复制为新项目工作区
├── sample/           Minimal worked example (shortlink-svc) 供阅读
└── {你的项目}/       第一次 /arch:* 调用时自动建
```

## 工作区如何诞生

1. 用户运行 `/arch:onboard` 等任意 mode
2. `arch-workflow` resolve `${ARCH_PROJECT_DIR}` 为 `arch/{项目名}/`
3. 目录不存在 → 从 `_template/` copy
4. 各原子 skill 填充对应文件
5. 二次运行时 `arch-workflow` 跑 integrity check;append-only 路径缺失即停

## append-only 边界

`user/决策史/`、`user/设计变更/`、`user/审计/`、`user/汇报/` 是**架构史**,**永不悄悄改**。任何修改只能 git 显式操作。这是 governance 的根。

## 为什么 `_template/` 和 `sample/` 被 commit

- 让仓库读者无需运行就能看到 canonical 形态
- 给 `arch-workflow` 一个稳定的首次 copy 源
- 让 OSS 用户上手前能"看到成品长啥样"

`{你的项目}/` 默认 gitignored(那是你本地的工作区,不应该混入 plugin 仓库)。

## 文件数最小化原则

每个 change 收敛到 3 文件;每次审计 1 文件;每份汇报 1 文件。**禁止**为追求"完整性"加无信息文件 — 信息密度优先。
