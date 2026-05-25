# 多 agent 编排手册(arch-analyze 主用)

> 解决"主上下文塞不下整个代码仓"的问题。把 `file analyzer` 阶段切片成多个并行子任务(subagent),每个子任务独立上下文窗口,返回结构化摘要给主上下文聚合。
>
> **核心原则**:子任务和主任务之间**只走 schema-locked yaml**(契约: `internal/schemas/scan-shard.schema.json`),不传自然语言摘要,杜绝"几个 LLM 一起编故事"。

---

## 1. 何时启用 / 何时不启用(判定门槛)

进入 `Project Scanner` 阶段后,先估算仓库规模,**强制按下表分流**:

| 估算条件 | 策略 |
|---|---|
| `src 文件数 ≥ 60` **或** `估算 token ≥ 50k` | **必须**多 agent |
| `src 文件数 30-60` 且 `估算 token < 50k` | 主上下文单跑;若中途撞 token 上限再切 |
| `src 文件数 < 30` | 主上下文单跑;多 agent 反而开销大于收益 |
| `targeted-refresh` 只重扫少量文件 | 主上下文单跑 |
| `drift-audit` 只看 git diff 文件 | 主上下文单跑 |

估算公式(Project Scanner 阶段输出):

```text
estimated_tokens ≈ Σ(file_size_bytes) / 3.5    # 粗略字节→token
src_files = file_count where role in {entry,route,controller,service,model,schema,config}
```

阈值理由:60 文件 / 50k token 大致对应主上下文还有 ≥30% 余量做后续 architecture analyzer + graph reviewer + specs writer。

---

## 2. 切片策略(由项目类型决定)

`Project Scanner` 完成后,主上下文据项目类型决定切片维度:

| 项目类型 | 切片维度 |
|---|---|
| Monorepo(workspace / packages) | 按 package / workspace,**一片 = 一个 package** |
| 多服务 microservices | 按 service,**一片 = 一个 service** |
| 单仓单应用 | 按顶层 src 子目录(api / data / jobs / ui 等) |
| Electron / 双形态 | 按进程边界:`electron/main/` · `electron/preload/` · `electron/shared/` · `src/`(再按子目录细分) |
| 前端 SPA 含 pages/components | `pages/` 一片 · `components/` 一片 · `services/` 一片 · `stores/` 一片 · `utils+hooks` 一片 |

### 切片粒度上限

单片必须满足:
- **文件数 ≤ 50**
- **预估输入 token ≤ 30k**(留出空间给子任务自身的 reasoning + 返回 yaml)

超出 → 二级切片(eg. 一个 monorepo package 内部还有 src/api/、src/data/,再分)。

### 切片粒度下限

文件数 ≥ 5 的切片才值得起子任务;< 5 文件的"小尾巴"合并到相邻片。

---

## 3. 子任务 prompt 模板

主上下文 spawn 每个子任务时用下面的模板(变量按片填):

```text
你是 arch-analyze 的 file-analyzer 子任务。

## 你的任务
扫描下列文件,产出一份符合 internal/schemas/scan-shard.schema.json 的 yaml。

shard_id: {{shard_id}}
你负责的路径:
{{paths_list}}

## 行为约束
1. 只读这些路径下的文件;不读其他路径(节省 token)
2. 按 `scanner-playbook.md` §4 "优先识别的事实" 抽取
3. 按 `architecture-composition-rubric.md` 的判据决定哪些算 component / interface / data_model
4. 按 `risk-and-debt-rubric.md` 闻到的风险写进 risk_signals(只填线索,不做最终结论 — 主上下文聚合后再判)
5. owner 线索看 CODEOWNERS / package.json author / git blame 头部即可,不深挖
6. 不写盘 — 只返 yaml 给主上下文

## 返回格式
完整 yaml,顶层字段必填:
- shard_id, shard_scope (paths/file_count/token_estimate)
- scanned_files, components, interfaces, data_models_seen
- external_calls, owner_signals, risk_signals
- evidence_refs (每条断言带 source + line + commit)
- completion_status (ok/partial/failed + 跳过文件清单)

## 失败模式
- token 不够读完所有文件 → completion_status=partial + 列 unread_files
- 文件解析失败 → 跳过该文件 + 记入 unread_files
- 你产的 yaml 必须通过 scan-shard.schema.json 验证;失败主上下文会让你重做

## 不要做的事
- 不要尝试聚合多个 shard 的事实(那是主上下文的事)
- 不要给最终风险评级(那是 graph reviewer 的事)
- 不要写任何文件;只返 yaml
```

---

## 4. 主上下文聚合规则

主上下文收到所有子任务 yaml 后:

### 4.1 验证

- 每片 yaml 跑 `scan-shard.schema.json` 验证
- failed/partial 片:
  - completion_status=partial:把 unread_files 加入下一轮重切候选
  - completion_status=failed:重跑 1 次该片;仍失败 → 标 degraded + 加入 `baseline.yaml#known_unknowns`

### 4.2 去重 / 合并

- **同名 component 出现在多片**:按 entrypoints 合并;若多片同名但 entrypoints 不交集 → 是两个东西,加片号后缀(`api-shard001` / `api-shard003`)交 graph reviewer 决定是否真重名
- **interface(api / event / message)**:按 path/topic 唯一键去重
- **data_model**:按 (name, source_file) 二元组去重;多片共写同一 model → 进入 `risk_signals` "共享写边界" 候选
- **external_calls**:按 (from, target, kind) 三元组去重;统计调用频次
- **owner_signals**:按 scope 聚合,取最频繁的 owner_hint;同 scope 多 owner 冲突 → 加入 known_unknowns

### 4.3 聚合后产出

聚合结果**不直接写盘**,作为 `Architecture Analyzer` 阶段的输入,继续走 5 段式后两段(`Graph Reviewer` + `Specs Writer`)。

主上下文聚合时**永远不读原始代码**;只读子任务返回的 yaml。这是上下文洁净度的硬约束。

---

## 5. 并发控制

- **同时活跃子任务数上限**:5(经验值,避免 Claude Code 并发瓶颈)
- **总子任务数 > 5**:分批 spawn,每批等齐再起下一批
- 主上下文 token 余量低于 30% 时:**暂停 spawn**,先消化已收的 yaml,聚合压缩后再继续

---

## 6. 失败降级

| 失败模式 | 行为 |
|---|---|
| 单片 partial(token 超额跳了部分文件) | 把 unread_files 合并到一个新片重跑 |
| 单片 failed(返 yaml 不过 schema) | 重跑 1 次;仍失败 → 标 degraded + 加 known_unknowns |
| ≥ 50% 片 failed | 整体扫描 degraded,主上下文写 `baseline.yaml.freshness_status=unknown` 并提示用户 |
| 主上下文聚合阶段 token 不够 | 把已收 yaml 写盘到 `agent/shard-cache/{shard_id}.yaml` 作为中间产物,再分批读入聚合(v1.1) |

---

## 7. 其他 skill 的并行机会(参考)

`arch-analyze` 是主战场,但下列 skill 也能受益于多 agent,**按需** 应用本手册的"切片 + 契约 yaml + 主上下文聚合"模式:

| skill | 并行单元 | 契约 yaml |
|---|---|---|
| `arch-pack`(audience=onboarding) | 5 页 wiki 各起一片子任务 | 待 v1.1 加 page-shard schema |
| `arch-review --mode=drift` | 每个 changed file 一片子任务判 drift 信号 | 复用本 scan-shard schema(简化版) |
| `arch-radar`(多候选调研) | 每个候选技术一片子任务 | 待 v1.1 加 research-shard schema |

`arch-diff-judge` 不适合多 agent(8 维 impact 必须主上下文统一判,避免维度遗漏)。

---

## 8. 与 write-scope 契约的关系

子任务 **不写盘**(returns yaml only),所以子任务本身 write-scope 是空。主上下文聚合后落盘走原 `arch-analyze` 的 write-scope(`specs/baseline.yaml` 等),不需要额外契约。

子任务可读路径:**仅限本片 paths 列表内的文件 + `arch-library/` 引用**,不可读其他切片范围。

---

## 9. 验收

主上下文聚合完成后,在 `.metrics.jsonl` 写一条:

```json
{
  "skill": "arch-analyze",
  "mode": "baseline-refresh",
  "subagent_orchestration": {
    "shards_total": 8,
    "shards_ok": 7,
    "shards_partial": 1,
    "shards_failed": 0,
    "total_files_scanned": 312,
    "total_input_tokens_estimate": 180000,
    "main_context_tokens_used": 45000
  }
}
```

这份埋点是 Premise 2(governance 价值 90 天验证)的输入之一。

---

## 10. 与单 agent 模式的回退路径

如果用户/管理员显式设置 `--no-subagent`(用于调试 / 小仓追问场景):

- 跳过本手册全部步骤
- 退化为主上下文顺序扫描 + 5 段式直跑
- 在 `.metrics.jsonl` 标 `subagent_orchestration: null + reason: "--no-subagent override"`
