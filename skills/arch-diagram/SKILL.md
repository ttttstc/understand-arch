---
name: arch-diagram
description: |
  架构图渲染器。优先输出 Mermaid 图源；当可用时可额外渲染 SVG/PNG。来源可以是 `specs/` 或某个 CR。稳定图落到 `specs/diagrams/`，派生展示图落到 `generated/diagrams/`。

  触发词: 画个架构图 / 更新 C4 / 出图 / 生成系统图 / 生成时序图

  本 skill 不自己发明架构，只渲染现有事实。
---

# arch-diagram

## 角色定位

- 结构化事实到图的翻译层。
- 默认 Mermaid，fireworks 只作为增强后端。

## 输入

- `source=specs|cr`
- `type=context|container|component|sequence|data-flow|deployment`
- 上游 YAML 或 markdown 事实

## 输出

- `specs/diagrams/*.mmd` 或 `generated/diagrams/*.mmd`
- 可选 `.svg` / `.png`

## 硬规则

1. 每张图必须能回链 source artifact。
2. Mermaid 图源永远生成。
3. fireworks 不可用时自动降级 Mermaid。
4. 不允许“凭感觉补图”。

## 验收

- `.mmd` 可解析
- 图中命名与 specs/CR 一致

## Write Scope

完整定义见 `internal/tool-contracts/write-scope.yaml#skills.arch-diagram`。

| mode (source) | ✅ 可写 | ❌ 禁写 |
|---|---|---|
| `source=specs` | `specs/diagrams/*.mmd` | `generated/**` |
| `source=cr` | `generated/diagrams/*.{mmd,svg,png}` | `specs/diagrams/**` |
| `source=generated-view`(为 wiki/brief 嵌图) | `generated/diagrams/*.mmd` | `specs/**` |

任何 mode 都 ❌ 禁写: `state.yaml` / `specs/*.yaml` / `decisions/**` / `change-requests/**`

## 参考

- `docs/spec-v1.0.md`
- `internal/tool-contracts/write-scope.yaml`
- `references/diagram-playbook.md`
- `references/mermaid-templates.md`
