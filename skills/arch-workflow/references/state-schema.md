# state.yaml Schema

> `state.yaml` 是 arch-workflow 的状态机持久化文件,**所有 skill 依赖此契约**。每个 `arch/{project-name}/` 目录下一份。

## 完整 Schema(骨架)

```yaml
# ===== 基本元数据 =====
project_name: string                       # kebab-case, ≤40 chars
created_at: ISO-8601
updated_at: ISO-8601
output_path: path                          # 默认 ./arch/{project-name}/,可自定义

# ===== 当前状态 =====
phase: init|frame|analyze|judge|options|adr|diagram|pack|review|done|awaiting-pm-confirmation|blocked|degraded
current_mode: onboard|audit|design|brief|null

# ===== 已完成 phases(防重做) =====
completed_phases:
  - phase: string
    completed_at: ISO-8601
    by_skill: string
    outputs_paths: [path]
    duration_s: int

# ===== Baseline commits(过期检测用) =====
baseline_commits:
  <repo-name>: <commit-hash>
baseline_captured_at: ISO-8601

# ===== Mode 历史(audit/design/brief 可多次跑) =====
mode_history:
  - mode: string
    started_at: ISO-8601
    finished_at: ISO-8601|null
    deliverables_dir: path                  # design-docs/X / audits/X / briefs/X
    readiness: ready|degraded|blocked

# ===== 企业 KB 加载状态(Gap A) =====
kb_loaded:
  source: path                              # ~/.understand-arch/kb/ 或 <org>/.arch-kb/
  banned_patterns: loaded|not_loaded|not_configured
  compliance_redlines: loaded|not_loaded|not_configured
  network_boundaries: loaded|not_loaded|not_configured
  naming_conventions: loaded|not_loaded|not_configured
  tech_radar: loaded|not_loaded|not_configured
  loaded_at: ISO-8601|null
  load_errors: [{file, line, error}] | []

# ===== Integrity check 历史 =====
integrity_history:
  - timestamp: ISO-8601
    issue: missing_state|missing_evidence|missing_wiki|missing_adr|missing_design_doc|commit_hash_drift|...
    file: path|null
    action: auto_regenerated|user_override_skip|user_restore|aborted
    by: skill_name|user
    reason: string|null

# ===== HARD GATE 状态(PRD 不清晰时) =====
blocking_questions:                         # phase=awaiting-pm-confirmation 时填
  - id: Q1
    severity: blocking|warning
    text: string
    context: string
    impact: string
    options: [string]|null
    pm_answer: string|null
    answered_at: ISO-8601|null
blocking_file: path                         # PM问题清单.md 路径
blocked_at: ISO-8601|null
blocked_by: skill_name|null

# ===== 验收 loop 状态 =====
acceptance_state:
  current_phase: phase_name|null
  structural_pass: bool|null
  semantic_pass: bool|null
  retry_count: int                          # 该 phase 已 retry 次数
  last_failure_reasons: [string]
  awaiting_user_judgment: bool

# ===== 人工 Overrides(审计) =====
overrides:
  - phase: string
    type: skip_acceptance|skip_kb_check|skip_prereq|...
    reason: string                          # 必填
    by: user
    at: ISO-8601
    consequences: string|null

# ===== Degradations(显式记录) =====
degradations:
  - phase: string
    cause: string
    impact: string
    at: ISO-8601

# ===== Architecture Profile(LLM 识别) =====
architecture_profile:
  identified_styles: [string]
  primary_concerns: [string]
  recommended_references: [path]            # 来自 arch-library/MANIFEST.md
  recommended_phases: [name]                # 来自 internal/phases/MANIFEST.md
  recommended_diagram_style: string
  user_override: object|null
  confirmed_by_user_at: ISO-8601|null
```

## 字段规则(硬约束)

1. **`phase`** 是 enum,workflow 任何时刻必须在其中一个值上
2. **`completed_phases`** append-only,**永不删**(防重做依赖)
3. **`baseline_commits`** 每个 repo 一个 entry,git force-push 后 hash 失效 → integrity check 标 `commit_hash_drift`
4. **`integrity_history`** append-only,留审计
5. **`overrides`** 每条**必填 `reason`**,空 reason 直接 reject
6. **`degradations`** 是显式记录,workflow 在 done 时如有 degradation 必须告知用户
7. **`architecture_profile`** 字段在 frame 输出后立即写,在用户确认后写 `confirmed_by_user_at`

## 用法示例

### onboard 启动时
```yaml
phase: frame
current_mode: onboard
completed_phases: []
baseline_commits: {}
kb_loaded: {source: ~/.understand-arch/kb/, ...}
```

### design HARD GATE 触发时
```yaml
phase: awaiting-pm-confirmation
current_mode: design
blocking_questions: [{id: Q1, severity: blocking, text: ...}]
blocking_file: design-docs/design-xxx/PM问题清单.md
blocked_at: 2026-05-25T...
blocked_by: arch-frame
```

### 完成后
```yaml
phase: done
completed_phases: [frame, analyze, judge, options, adr, diagram, pack, review]
mode_history:
  - mode: design
    started_at: ...
    finished_at: ...
    deliverables_dir: design-docs/design-payment-channel/
    readiness: ready
```

## JSON Schema 文件

完整可执行 JSON Schema 由 Codex 实现:`internal/schemas/state.schema.json`(注:state.yaml 本身不在 5+1 yaml 资产里,它是 workflow 自管的元数据)。
