# Orchestration Playbook(4 user skill 共享)

> 所有 user-facing skill(`arch-onboard` / `arch-design` / `arch-audit` / `arch-brief`)的**公共编排逻辑**集中在本文。各 user skill 在 SKILL.md 引用对应章节,不重复实现。
>
> 这份 playbook 对应原 `arch-workflow` skill 抽出的共享部分。v1.0 取消 `arch-workflow` 中间层,4 个 user skill 各自完整 + 共享本 playbook。

---

## 1. State.yaml 状态机

### Phase 枚举

```yaml
# state.yaml#current_phase
not-started     # 工作区初次创建
scaffold        # 模板 copy 完成
baseline_refresh    # arch-analyze 跑中
specs_review        # arch-review --mode=specs 跑中
cr_frame            # arch-frame 跑中
impact_analysis     # arch-diff-judge 跑中
cr_review           # arch-review --mode=cr 跑中
adr_recorded        # arch-adr 写完
brief_generation    # arch-pack 跑中
drift_audit         # arch-analyze --mode=drift-audit 跑中
awaiting-pm-confirmation  # HARD GATE 阻塞
blocked             # 等待用户输入或外部修复
completed           # 当前 user-facing skill 全部完成
```

### Status 枚举

```yaml
# state.yaml#status
idle | running | blocked | completed
```

### 单 writer 规约

`state.yaml` 的 writer 是**当前活跃的 user-facing skill**(`arch-onboard` / `arch-design` / `arch-audit` / `arch-brief` 之一)。同一时间只有一个 user skill 活跃。

- 内部 skill(arch-analyze / arch-frame / ... / arch-radar)**不直接写** `state.yaml`
- 内部 skill 在返回时附 `state_delta`,由当前 user skill 合并写盘

## 2. State_delta merge 协议

内部 skill 返回示例:

```yaml
# arch-frame 在 design 流程中返
state_delta:
  active_cr: "CR-2026-003-rate-limit"
  kb_loaded: {banned_patterns: loaded, ...}
  current_phase: cr_frame
  status: running
  history_append:                  # → state.yaml.history[](append-only)
    ts: "2026-05-26T..."
    skill: arch-frame
    action: cr_created
    status: ok
    ref: {cr_id: "CR-2026-003-rate-limit"}
  overrides_append:                # 可选 → state.yaml.overrides[](append-only)
    ts: "2026-05-26T..."
    scope: "HARD_GATE"
    reason: "用户授权跳过缺失 NFR 校验"
    by: "user"
```

字段规约(详见 `internal/schemas/state.schema.json`):

- `history[]` 必填字段: `ts / skill / action`;可选: `phase / status / summary / ref`
- `overrides[]` 必填: `ts / scope / reason`;可选: `by`

### 合并规则(user skill 执行)

1. 验证 state_delta 字段是否在 `state.schema.json` 允许范围(failed → 拒绝 + 报错给子 skill 重试)
2. `history` / `overrides` 仅 **append**,不覆盖既有
3. 标量字段(`active_cr` / `current_phase` / `status` / `kb_loaded`)直接 overwrite
4. 合并冲突(多个字段同时改 + 互相矛盾)→ 拒绝写盘 + 列冲突项 + 要求子 skill 修正
5. 合并成功 → 写盘 `state.yaml` + `.metrics.jsonl` append 一条 merge 事件

## 3. Dispatch 子 skill 的契约

每次 user skill dispatch 内部 skill 前,在 `.metrics.jsonl` append:

```json
{
  "ts": "2026-05-26T...",
  "action": "dispatch",
  "dispatcher": "arch-design",
  "skill": "arch-analyze",
  "mode": "baseline-refresh",
  "allowed_writes": ["specs/baseline.yaml", "specs/quality.yaml", "..."],
  "active_cr": "CR-2026-003-rate-limit"
}
```

acceptance 的 `no_writes_outside_scope` check 用 git diff 与 `allowed_writes` 对比,任何越界 = 失败。

## 4. KB 加载规则

读取 `~/.understand-arch/kb/` 下 5 个组织 KB yaml:

| 文件 | 内容 |
|---|---|
| `banned-patterns.yaml` | 禁止 pattern 列表 |
| `compliance-redlines.yaml` | 合规红线 |
| `network-boundaries.yaml` | 网络边界 |
| `naming-conventions.yaml` | 命名约定 |
| `tech-radar.yaml` | 技术雷达 |

### 加载状态枚举

- `loaded` — 文件存在且 schema 通过
- `not_loaded` — 文件存在但 schema 不通过(中文告知用户哪个文件哪行错,**fail-loud**)
- `not_configured` — 文件不存在(降级继续)

state.yaml 的 `kb_loaded` 字段记录 5 项加载状态。

## 5. Freshness 状态机

`baseline.yaml#freshness_status` 4 档判定:

| 状态 | 含义 | 触发条件 | 默认行为 |
|---|---|---|---|
| `fresh` | 当前 specs 与代码 commit 一致 | `last_scanned_commit == HEAD` | 继续 |
| `possibly_stale` | 代码变化,但未命中架构敏感文件 | `HEAD != last_scanned_commit` + 命中文件数 ≤ 5 | 提示 audit 复核 |
| `stale` | 代码变化命中架构敏感文件 | 同上 + 命中数 > 5 | 中文建议 refresh;design 阻塞 |
| `unknown` | 无法判断 | Git 不可用 OR `last_scanned_commit` 缺失 | 降级为内容完整性审视 |

详细架构敏感文件清单见 `skills/arch-analyze/references/freshness-rules.md`。

### 中文提示模板(stale)

```text
当前架构基线可能已过期:
  上次扫描提交:{last_scanned_commit}
  当前提交:{HEAD}
  代码差异命中 {N} 个架构敏感文件
  
建议:
  - 刷新 specs:运行 `/arch-onboard --refresh`
  - 验证漂移:运行 `/arch-audit --drift`(成本更高,会重扫部分代码)
  - 显式继续(标 degraded):告知"我知道,继续设计"
```

## 6. Integrity Check(每次进入 user skill 时)

1. `state.yaml` 是否存在 + schema 通过
2. `specs/*.yaml` 五份是否都在(`audit` 入口需要)
3. `change-requests/CR-*` 目录若存在,是否完整(`design --continue` 需要)
4. baseline_commits 与当前 commit 对比(漂移提示)

失败行为:
- state.yaml 缺失 → 提示先 `/arch-onboard`
- specs/ 缺文件 → 同上
- append-only 路径(decisions / change-requests / generated/audit / generated/briefs)缺失 → **fail-loud**(append-only 不允许悄悄消失,要求 git restore)

## 7. Acceptance Loop

每个 user skill 跑完后:

1. 加载对应 `internal/acceptance/{mode}.yaml`
2. 跑 structural_checks(脚本级,秒级)
3. structural 全过 → 跑 semantic_checks(LLM 子任务 + rubric;**review subagent ≠ 原产 subagent** 避免自证)
4. semantic 算通过数 vs threshold
5. 不达标 → retry 失败的内部 skill(最多 2 次)
6. 第 3 次仍失败 → 中文告知用户,提供 4 选项:
   - retry with hints(LLM 把失败原因加进 prompt 重跑)
   - manual fix(用户手动改 yaml,然后跑 `/arch-audit` 重验)
   - override(OVR-NNN 记录 + 标 degraded 继续)
   - abort

## 8. 反合理化清单(6 条强约束)

每个 user skill 在结论前自检:

1. **没"应该 / 通常 / 大概 / 一般"等弱化词** — 一律走"已知/未知"二分
2. **没"我觉得 / 看起来"等主观词** — 必须有 evidence_refs
3. **没把 known_unknowns 当 known** — 不允许在 overview / brief 中"包装成已知"
4. **没回避 trade-off** — 任何方案都有代价,显式说出
5. **没追求"完整"而灌水** — 11 段 overview / 6 页 wiki / 10 段健康度都有行数硬上限,超出 = 失败
6. **没"为了用某技术而用"** — 选型必须回答"为什么不是更简单方案"

## 9. HARD GATE(arch-frame 用)

arch-frame 在 design 流程中解析 PRD 后,**命中 ≥3 specific 未答问题就 block**:

| 检测项 | 触发示例 |
|---|---|
| 必填字段缺失 | 业务目标 / 验收标准 / 范围未写 |
| 验收标准不可量化 | "低延迟" 无具体数字 |
| NFR 关键维度未表态 | reliability / latency / security 任一缺 |
| non-goals 模糊 | "现在不做 AI" 但没说哪些 AI 算 |
| 检测到歧义句 | "支持查询" "提升性能" 无边界 |
| 关键依赖未明 | 没说会调哪些上下游 |

产 `PM问题清单.md`(中文,分 🔴 BLOCKING / 🟡 WARNING 两级),`state.yaml#current_phase=awaiting-pm-confirmation`。

返回路径:
1. 用户编辑文件填答案 → 用户说"继续" → arch-frame 重读文件 → 重检
2. 用户对话直接答 → user skill 写答案到清单留底 → 同样重检

未全答完 → 重生成精简清单(只列剩余)→ 再等。

## 10. 中文提示模板(常用)

### specs 不完整

```text
当前架构基线缺少关键信息:{missing_sections}。
建议先运行 /arch-onboard 刷新 baseline,或补齐对应 specs 文件。
```

### KB 未配置

```text
组织级 KB(~/.understand-arch/kb/)未配置。
本次将跳过 org-conformance 检查;若需要校验组织约束(banned patterns / 命名规范 / tech radar 等),
请先创建 KB 目录并放入 5 个 yaml 文件。
```

### drift audit 确认

```text
我可以继续做 drift audit,对照代码变化验证 specs 是否偏离现实。
这一步会重新扫描部分代码仓,耗时比普通 audit 更高。
是否继续?(yes / no / 先 refresh)
```

### 验收第 3 次失败

```text
{check_id} 已失败 3 次。具体阻塞项:
{findings_list}

请选择下一步:
  1. retry with hints(我把失败原因加进重试 prompt)
  2. manual fix(你手动改 yaml,然后跑 /arch-audit 重验)
  3. override(留 OVR-NNN 记录,标 degraded 继续)
  4. abort(放弃本次,回到上个 stable phase)
```

## 11. 禁止行为(全 user skill 共享)

1. 不允许在 `audit` 默认扫全仓(成本 + UX)
2. 不允许 `brief` 引入 specs/CR/ADR 之外的新事实
3. 不允许在 specs 明显过期时直接进 design(必须先 freshness 提示)
4. 不允许暴露内部 skill 作为用户主入口(arch-pack / arch-review / arch-frame / ... 都内部)
5. 遇到禁止产物请求(IaC / DDL / CI / 服务骨架 / OpenAPI client / 业务代码)必须拒绝
6. 任何 `decisions/ADR-*.md` 一旦 commit,正文永不修改(supersede 走 `decisions.yaml#superseded[]`)
7. 任何 `change-requests/CR-*/` 一旦 `review.yaml.readiness=ready`,整目录禁重写

## 12. 断点续跑

- 若 `state.yaml` 存在,从 `current_phase` 恢复
- 若 `active_cr` 非空,`/arch-design --continue` 默认续跑该 CR
- 若上次停在 `blocked`,先向用户说明阻塞原因,再决定是否重试 / abort

---

## 与各 user skill 的引用关系

每个 user skill 的 SKILL.md 在合适位置引用本 playbook 章节,不重复细节:

| user skill | 引用本文章节 |
|---|---|
| `arch-onboard` | §1 §2 §3 §4 §5 §6 §7 §8 §10 §11 §12 |
| `arch-design` | §1 §2 §3 §5 §6 §7 §8 §9 §10 §11 §12 |
| `arch-audit` | §1 §2 §3 §5 §6 §7 §8 §10 §11 |
| `arch-brief` | §1 §2 §3 §6 §7 §8 §11 |

## 参考

- `internal/schemas/state.schema.json`
- `internal/tool-contracts/write-scope.yaml`
- `internal/acceptance/*.yaml`
- `internal/schemas/MANIFEST.md`
- `skills/arch-analyze/references/freshness-rules.md`(架构敏感文件清单)
- `skills/arch-frame/references/frame-playbook.md`(HARD GATE 细节)
