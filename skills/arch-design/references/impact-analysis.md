# Impact Analysis

## Purpose

Impact analysis maps a requirement to graph nodes, affected repositories, rules, unknowns and CR.md section 8.
It should be conservative: precise evidence beats broad guessing.

## Inputs

- Requirement or PRD text.
- CR.md path and CR id.
- `specs/repos/*/knowledge-graph.json`.
- `specs/cross-repo.json`.
- Project rules.
- Current graph freshness report.

## Matching Strategy

1. Extract explicit technical terms, API names, route names, table names, components and repo names from the requirement.
2. Match exact node id, name, path, tag and summary terms.
3. Expand one hop through imports, contains, routes, defines_schema, reads_from and writes_to.
4. Add cross-repo edges only when `cross-repo.json` already contains the relation or the requirement explicitly names both repos.
5. Record unmatched terms as `known_unknowns`.

## CR.md Writes

Only write:

- YAML frontmatter `impact.added_nodes`.
- YAML frontmatter `impact.modified_nodes`.
- YAML frontmatter `impact.removed_nodes`.
- YAML frontmatter `impact.estimated_files_changed`.
- Section 8 `改动清单`.

All writes must go through `engine/bin/cr-md-editor.js`.

## Confidence Rules

- High confidence requires exact graph node match or explicit route/schema/repo evidence.
- Medium confidence can use summary/tag match plus one supporting edge.
- Low confidence remains in known unknowns unless the user confirms.

## Traceability

Append traceability only through the engine tool:

- Requirement phrase.
- Matched graph node ids.
- Rules findings.
- CR path.
- Confidence.

## Forbidden Behavior

- Do not edit sections 1-7 or 9-14.
- Do not fabricate new graph nodes.
- Do not write wiki or ADR.
- Do not mark a node modified solely because it is in the same directory.
- Do not hide unknowns to make the design look complete.
