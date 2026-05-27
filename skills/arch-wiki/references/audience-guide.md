# Audience Guide

## 受众

### cto

- 关注系统边界、关键能力、风险、技术债、NFR 和投资优先级。
- 少写文件级细节,多写跨仓影响、质量属性和决策状态。
- 每个判断都要能回链 graph node id、ADR、CR 或 rules。

### newcomer

- 关注阅读路径、核心组件、接口入口、数据模型和常见改动点。
- 术语需要解释,但不能写新人教程式的泛泛内容。
- 优先展示 `01-overview.md`、`02-components.md`、`03-interfaces.md`。

### pm

- 关注业务能力、变更请求、风险、待定问题和发布影响。
- 少写实现细节,多写 capability、CR 状态、known_unknowns。
- 不能把未验证的能力包装成已交付事实。

### architect

- 关注边界、依赖方向、NFR、ADR、CR traceability、风险和技术债。
- 保留 node id、rules path、ADR/CR path。
- 对缺失事实明确写入已知局限或 known_unknowns。

## 页面强调点

- `01-overview.md`:cto 看风险摘要, newcomer 看阅读顺序, pm 看业务影响, architect 看 graph 可信度。
- `02-components.md`:newcomer 看组件入口, architect 看边界和依赖。
- `03-interfaces.md`:pm 看外部契约风险, architect 看 endpoint/schema 覆盖与已知局限。
- `04-data-models.md`:pm 看业务对象, architect 看 schema/table traceability。
- `05-capabilities.md`:cto/pm 看能力成熟度和 gap, architect 看 supporting_node_ids。
- `06-quality.md`:cto 看 NFR 状态, architect 看 measurement 和 evidence_refs。
- `07-risks-and-debt.md`:cto 看优先级, architect 看 mitigation 和 affected_node_ids。
- `08-deployments.md`:cto 看运行边界, architect 看 resource/service/pipeline。
- `09-flows-and-scenarios.md`:pm 看业务流程, architect 看 flow/step 证据。
- `10-decisions.md`:architect 看 ADR 状态和 supersede 关系。
- `11-changes.md`:pm/architect 看 CR 状态和影响节点。
- `12-rules.md`:architect 看组织约束, cto 看合规/成本边界。
- `13-pending-changes.md`:pm 看待办, architect 看未闭环 traceability。
- `14-diagrams.md`:所有受众只看 v2.0 Mermaid 占位,图片生成留给 v2.1。

## Mode 切换协议

参数:

```text
--audience cto|newcomer|pm|architect
```

状态记录:

```yaml
history:
  - skill: arch-wiki
    action: render --audience={audience}
    status: ok
```

首次生成、`cto` 和 `architect` 模式必须运行 full review。
`newcomer` 和 `pm` 日常刷新可运行 lite review,但发布前仍建议 full review。

## LLM 渲染 Prompt 模板

```text
你是 understand-arch v2.0 wiki renderer。
Audience: {audience}
Workspace: .understand-arch/{project}
Sources:
- specs/repos/*/knowledge-graph.json
- specs/cross-repo.json
- rules/*.md
- decisions/*.md
- change-requests/*/CR.md

要求:
1. 只基于 Sources 写 wiki,不得创造新事实。
2. 每个架构判断必须保留 graph node id、rules path、ADR path 或 CR path。
3. 如果事实缺失,写入“已知局限”或引用 known_unknowns。
4. 根据 audience 调整语言和重点,不改变事实。
5. 保留 14 页文件名和 `03-interfaces.md` 末尾“已知局限”段。
6. `14-diagrams.md` 只写 Mermaid 占位。
```
