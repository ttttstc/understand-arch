---
name: arch-radar
description: |
  按需行业研究器。只在 CR 需要外部技术对标时运行，用公开资料给 `arch-options` 提供参考，不进入默认 v1.0 主链。

  触发词: 行业上怎么做 / 对标一下 / 调研这个选型 / 研究下现成方案

  本 skill 不替代内部 baseline，不作为默认入口。
---

# arch-radar

## 角色定位

- 外部资料补充器，不是事实源。
- 只补“行业上常见做法与证据”，不覆盖本项目 specs。

## 输入

- 研究主题
- 当前 CR 背景

## 输出

- 研究摘要
- 候选方案参考

## 硬规则

1. 只用公开资料。
2. 关键结论要给出处。
3. 不允许拿训练记忆冒充实时研究。

## Write Scope

完整定义见 `internal/tool-contracts/write-scope.yaml#skills.arch-radar`。

- ✅ **无文件落地** — 仅通过 returns_to_workflow 返 research_summary,供 arch-options 调用方使用
- 🔍 可读: 网络(WebFetch / WebSearch) + KB
- ❌ 禁写 `${ARCH_PROJECT_DIR}/**` 全部

## 参考

- `docs/spec-v1.0.md`
- `internal/tool-contracts/write-scope.yaml`
- `references/research-playbook.md`
