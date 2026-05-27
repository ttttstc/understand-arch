# understand-anything Agent Delta

This note records the R2 P1 comparison between upstream understand-anything subagents and v2.0 understand-arch subagents.

## Compared Files

| Upstream | understand-arch v2.0 | Result |
| --- | --- | --- |
| `project-scanner.md` | `agents/arch-project-scanner.md` | Deterministic scan, ignore handling, import-map extraction, warning capture and stable output are retained; paths were adapted to `.understand-arch` and repo ids. |
| `file-analyzer.md` | `agents/arch-file-analyzer.md` | Structural extraction, import-map trust, non-code structures, cross-batch neighbor hints and strict batch output naming are retained; v2 graph ids and evidence fields were added. |
| `architecture-analyzer.md` | `agents/arch-architecture-analyzer.md` | Directory grouping, fan-in/fan-out, import density, dependency direction, deployment/data topology and non-code layer handling are retained; v2 omits tours by design. |
| `domain-analyzer.md` | `agents/arch-domain-analyzer.md` | Business domain / flow / step hierarchy, ordering weights, domain metadata and evidence limits are retained; v2 maps them to capability candidates and cross-repo support. |
| `graph-reviewer.md` | `agents/arch-graph-reviewer.md` | Deterministic validation, referential integrity, layer coverage, duplicate id checks, orphan warnings and severity classification are retained; v2 extends modes to Phase 1/3/4/5/6/7/8. |

## Intentionally Not Migrated

- `tour-builder.md`: v2.0 wiki rendering replaces UA tour generation.
- `knowledge-graph-guide.md`: v2.0 schemas and spec contracts replace guide-only output.
- `article-analyzer.md` and `assemble-reviewer.md`: not part of the architecture scanner contract.
- Language lessons, embeddings and dashboard-specific artifacts: explicitly forbidden by v2.0 implementation contract.

## Conclusion

No original deterministic scanning capability is intentionally missing.
The migrated capabilities now live either in forked engine tools under `engine/upstream-tools` / `engine/bin`, or in the v2 subagent prompts with repo-id, evidence, confidence and write-scope adaptations.
