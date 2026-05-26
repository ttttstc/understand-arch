# internal/acceptance/ — Per-Entry Acceptance Checklists

> 当前活跃 user-facing skill(arch-onboard/design/audit/brief) 在 `onboard / design / audit / brief` 结束时读取这些 YAML，先跑结构检查，再跑语义检查。

## 文件

| 文件 | 用户入口 | 关注点 |
|---|---|---|
| `onboard.yaml` | `/arch:onboard` | specs 是否完整、4+1 是否覆盖、freshness 字段是否齐 |
| `audit.yaml` | `/arch:audit` | 当前 specs 是否可信，是否需要 refresh 或 drift audit |
| `design.yaml` | `/arch:design` | CR 是否足够支撑实现与 writeback |
| `brief.yaml` | `/arch:brief` | 导出视图是否忠实于 specs / CR / ADR，且适合目标受众 |

## 检查理念

- `structural_checks` 检查文件存在、schema、字段、frontmatter、路径。
- `semantic_checks` 检查内容是否回答了架构问题，而不是只看文件数量。
- `threshold` 默认要求 structural 100% 通过。
- `design` 不允许 silent degrade；其余入口可在 warning 下继续，但必须给中文建议。

## Acceptance loop

1. workflow 结束一个用户入口
2. 加载对应 `internal/acceptance/{mode}.yaml`
3. 先跑 structural checks
4. structural 全过后再跑 semantic checks
5. semantic 不过时:
   - 优先给当前 skill 一次带失败提示的 retry
   - 再失败则升级为用户决策
6. 所有失败都必须回写 `state.yaml.history`
