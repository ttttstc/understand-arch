# Trace Assertion Rubric — 如何写好 trace 断言

> 本文档定义如何为 Skill Regression Case 写**有用的** trace assertion。坏的 trace assertion 比没有更糟 —— 它会让 case 失败但不告诉你为什么,或者 case 通过但 skill 实际有问题。

## 核心原则

**Trace assertion 不是 "完整记录 trace",而是 "对关键行为做断言"**。

类比:test 不写 "程序运行了 N 条 CPU 指令",写 "调用了 service.foo() 一次"。trace 同。

## 4 类 Trace 断言

### 1. `files_read`(必读 / 必不读)

**好例**:
```yaml
files_read:
  must_include:
    - "~/.understand-arch/kb/banned-patterns.yaml"          # frame 必读企业 KB
    - "${ARCH_PROJECT_DIR}/evidence/manifest.yaml"  # judge 必读 baseline
  must_not_include:
    - "src/**/*.ts"                                  # frame 主上下文不应读 src
```

**坏例**:
```yaml
files_read:
  must_include:
    - "any file"                                     # 太宽,无意义
  count_gte: 10                                      # 数量断言通常无意义
```

### 2. `subagents_spawned`

**好例(frame 应不启 subagent)**:
```yaml
subagents_spawned:
  min: 0
  max: 0
```

**好例(3 仓 onboard 应 ≥3 subagent)**:
```yaml
subagents_spawned:
  min: 3
  max: 9                                             # 3 仓 × 3 depth 上限
```

**坏例**:
```yaml
subagents_spawned:
  count: 5                                           # 精确数字易脆(并行调度可能变)
```

### 3. `gates_passed` / `gates_failed`

每个 skill 应定义自己的 gate 命名(在 SKILL.md 里枚举),如:
- frame: `clarity_check`, `kb_load`, `profile_confirmation`
- workflow: `integrity_check`, `prereq_check`, `acceptance_structural`, `acceptance_semantic`
- adr: `numbering_continuity`, `seven_segments_complete`

**好例**:
```yaml
gates_passed:
  must_include: ["clarity_check", "kb_load"]
gates_failed:
  must_be_empty: true
```

**好例(故意触发 gate 失败的 case)**:
```yaml
# case-prd-3-blocking-questions.yaml — 故意 PRD 模糊触发 HARD GATE
gates_passed:
  must_include: ["kb_load"]
  must_not_include: ["clarity_check"]                # 这个应该失败
gates_failed:
  must_include: ["clarity_check"]
  must_be_empty: false
```

### 4. `tools_called`

记录 skill 调用了哪些工具(file_read / yaml_writer / mermaid_render / fireworks_call / git_log / ...).

**好例**:
```yaml
tools_called:
  must_include: ["yaml_writer", "schema_validator"]
  must_not_include: ["src_code_modifier"]            # 本 skill 不写代码
```

## Trace assertion 的层次

按严格度从低到高:

| 层 | 断言 | 适用场景 |
|---|---|---|
| 弱 | `must_include` | 必须做某事(不允许少) |
| 中 | `must_not_include` | 必须不做某事(R6 反合理化) |
| 强 | `count gte/lte` | 数量约束 |
| 最强 | `sequence` | 必须按顺序做(适用 pipeline skill) |

**建议**:从弱开始,case fail 多了再加强。

## 常见错误

### ❌ 错误 1:断言 trace 完全等于某个固定值

```yaml
trace:
  exact: |
    READ file1
    SPAWN subagent
    READ file2
    ...
```
**为什么坏**:任何无关变化(顺序、并行调度、新增日志)都让 case 失败。**只断言关键行为**。

### ❌ 错误 2:无 trace 断言,只断言 result

```yaml
result_assertion:
  files_produced: [...]
# 没有 trace_assertion
```
**为什么坏**:skill 可能误打误撞产出对的结果(信号偏移)。「Skill 文档债」文章原话:**"两个 Agent 最终都可能完成任务,但中间过程完全不同"**。没 trace 断言等于盲测。

### ❌ 错误 3:trace 太具体,跟模型走

```yaml
trace_assertion:
  files_read:
    must_include: ["specific_file_at_specific_revision.md"]
```
**为什么坏**:模型升级 / Skill 文本调整都可能让 trace 变。**断言行为模式,不是字面 trace**。

## 写好 trace assertion 的 3 个问题

写每个 trace 断言前问自己:

1. **这个断言失败时,我能从信息推断"哪里坏了"吗?**(若不能 → 太宽 / 太宽泛)
2. **如果模型变强(更高质量输出),这个断言还成立吗?**(若不成立 → 太脆)
3. **如果 skill 实现细节变(重构 prompt),但行为意图不变,这个断言还成立吗?**(若不成立 → 太具体)

**3 个问题都"是" → 好断言。**

## 与 `.metrics.jsonl` 的关系

`.metrics.jsonl` 是 trace 数据**来源**(v1.0 简单埋点,v1.1 扩展含 trace 字段):
```json
{"ts":"...","skill":"arch-frame","mode":"design",
 "trace":{
   "files_read":["..."],
   "subagents_spawned":0,
   "gates_passed":["clarity_check","kb_load"],
   "gates_failed":[],
   "tools_called":["yaml_writer"]
 },
 ...}
```

Regression case 跑 skill → 读 `.metrics.jsonl` → 按本文档规则断言。

## 维护

trace 断言**会随 skill 演化漂移**。每季度复审一次,该松松,该紧紧。

---

**最重要的一句**:Skill Regression 不是 "test that the skill works",而是 "test that the skill **behaves the way we want when conditions change**"。trace assertion 是这个"想要的行为"的具体落地。
