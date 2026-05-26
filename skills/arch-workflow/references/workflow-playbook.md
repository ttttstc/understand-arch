# arch-workflow Playbook

## 1. 入口到内部链路

### onboard

1. 检查工作区是否存在。
2. 不存在则从 `arch/_template/` 初始化。
3. 调 `arch-analyze --mode=baseline-refresh`。
4. 调 `arch-diagram --source=specs --type=context|container`。
5. 调内部 `arch-review --mode=specs`。
6. 若用户要 onboarding 资料，再调 `arch-pack --audience=onboarding`。

### design

1. 调 `arch-frame` 创建或恢复 CR。
2. 读取 `specs/baseline.yaml.freshness_status`。
3. 若为 `stale|unknown`，先给中文 refresh 建议。
4. 调 `arch-diff-judge` 生成 `impact.yaml`。
5. 有真实分歧时调 `arch-options`。
6. 有 durable decision 时调 `arch-adr`。
7. 调 `arch-review --mode=cr`。
8. 产出 writeback 建议。

### audit

1. 默认只读 `specs/`。
2. 调 `arch-review --mode=specs`。
3. 若结论为 `stale|unknown`，提示用户 refresh。
4. 只有用户确认时才跑 `arch-analyze --mode=drift-audit`。

### brief

1. 确认来源是 `specs`、某个 CR、或 ADR 集合。
2. 调 `arch-pack`。
3. 需要图时调 `arch-diagram`。
4. 调内部 review，检查没有发明新事实。

## 2. 阶段状态

- `scaffold`: 仅完成模板初始化。
- `baseline_refresh`: 正在刷新或重建 specs。
- `specs_review`: 正在审视 baseline。
- `cr_frame`: 正在建立 CR。
- `impact_analysis`: 正在生成 impact。
- `cr_review`: 正在做 CR gate。
- `brief_generation`: 正在生成给人看的视图。
- `blocked`: 等待用户输入或外部修复。
- `completed`: 当前入口完成。

## 3. retry 与升级

- structural 失败：优先 retry 同一 skill 1 次。
- semantic 失败：把 verifier 失败项回灌给原 skill，再 retry 1 次。
- 第 3 次仍失败：升级给用户，不允许死循环。

## 4. 中文提示模板

### specs 过期

```text
当前架构基线可能已过期：上次扫描提交为 {last_scanned_commit}，当前提交为 {current_commit}。
本次差异命中了架构敏感文件，建议先刷新 specs，再继续后续步骤。
```

### specs 不完整

```text
当前架构基线缺少关键信息：{missing_sections}。
建议先运行 /arch-onboard 刷新 baseline，或补齐对应 specs 文件。
```

### drift audit 确认

```text
我可以继续做 drift audit，对照代码变化验证 specs 是否偏离现实。
这一步会重新扫描部分代码仓，耗时比普通 audit 更高。
```

## 5. 禁止行为

- 不暴露 `arch-pack`、`arch-review` 作为 v1.0 用户主入口(它们是内部 skill,由 4 个用户入口按需调度)。
- 不在 `audit` 默认扫全仓。
- 不允许 brief 生成新事实。
- 不允许在 `design` 忽略 `stale|unknown` 直接装作基线可信。
