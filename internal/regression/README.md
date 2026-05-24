# internal/regression/ — Skill Regression Suite(PLACEHOLDER)

> **Status: PLACEHOLDER。IMPLEMENTATION = v1.1。**
>
> 本目录为 Skill Regression Suite 占位。v1.0 仅有设计,实际测试 case v1.1 实现。

## 为什么这个目录存在

引用「[Skill 文档债](https://mp.weixin.qq.com/s/46sZ3jbOapz_CP17gEbhXA)」一文的核心论点(by 梯度不陡):**Skill 的质量不在文本里,在 Agent 的执行轨迹里**。没有 regression case,Skill 迭代只能靠体感("感觉变好了"),没有证据。

一次 Skill 改动可能:
- 文本变好,但 Agent 执行轨迹变差(信号偏移)
- 单 task 提升,但组合进多 skill 链路反而退化(组合冲突)
- 在 Claude 上有效,换模型失效(模型差异)

**只有 trace + result 双层断言的 regression case 能捕获这些**。

## 设计

每个 skill 一个文件夹存 cases:

```
internal/regression/
├── README.md                          (本文)
├── _template/
│   ├── case-template.yaml             canonical case structure
│   └── trace-assertion-rubric.md      如何写好 trace assertion
├── arch-frame/
│   ├── case-prd-clear.yaml
│   ├── case-prd-3-blocking-questions.yaml
│   └── case-no-org-kb-degrade.yaml
├── arch-analyze/
│   ├── case-multi-repo-priority-ranking.yaml
│   └── ...
└── ...(每 skill 一个文件夹)
```

## Case schema(草图)

```yaml
case_id: arch-frame-001-prd-clear
target_skill: arch-frame
input:
  mode: design
  prd: ./fixtures/prd-clear.md
  org_kb: ./fixtures/sample-kb/
expected_behavior:
  - loads org_kb successfully
  - parses PRD without HARD GATE
  - outputs architecture_profile with ≥3 references selected
trace_assertion:
  - reads ~/.understand-arch/kb/ files
  - does NOT spawn subagent (frame is main-context)
  - writes 项目总览.yaml with all required fields
result_assertion:
  - 项目总览.yaml schema passes
  - readiness == ready
  - design_intent.non_goals is non-empty
known_failure_modes:
  - hallucinates non_goals when PRD doesn't specify
  - mislabels NFR severity
```

## Trace 数据来源

Cases 对比 `.metrics.jsonl`(v1.0 中已埋点,v1.1 扩展含 trace 字段):

```json
{"ts":"...","skill":"arch-frame","mode":"design",
 "trace":{"files_read":[...],"subagents_spawned":0,"gates_passed":[...]},
 "outputs_paths":[...]}
```

## 跑 case 的方式

### v1.0(手动)

用户/贡献者手动:
1. 读 case yaml
2. 用 input fixture 跑 skill
3. 检查 `.metrics.jsonl` + 输出文件,对照 assertion
4. 结果记到 log

不够优雅,但提供 ground truth,为 v1.1 自动化打基础。

### v1.1(自动)

新加 `arch-test` skill:
1. 加载 case yaml
2. 准备 fixture
3. 调用目标 skill
4. 读 `.metrics.jsonl` 拿 trace
5. 断言 expected_behavior + trace_assertion + result_assertion
6. 输出 pass/fail + diff
7. 对比上次跑的结果(漂移检测)

## v1.0 必须做的

- ✅ 本 README(占位声明 + 设计)
- ⬜ `_template/case-template.yaml` —— canonical 模板(v1.0 写,Codex 接手)
- ⬜ `_template/trace-assertion-rubric.md` —— 如何写好 trace assertion(v1.0 写)

## v1.0 **不**必须做的

- ❌ 任何 skill 文件夹下的具体 case(v1.1 写)
- ❌ `arch-test` skill(v1.1 实现)

## 参考

- 原论点:[Skill 文档债 — 梯度不陡](https://mp.weixin.qq.com/s/46sZ3jbOapz_CP17gEbhXA)
- Premise 4:[docs/office-hours-2026-05-24.md](../../docs/office-hours-2026-05-24.md)(待加)
