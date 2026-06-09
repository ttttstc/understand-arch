---
name: arch-onboard
description: Onboard a single-repo or multi-repo system with the v3.0 pipeline, producing per-repo code graphs, arch-layer.json, wiki, agent-context, and dashboard inputs.
argument-hint: "[project-name] [--repo <path>]... [--enable-hooks] [--no-agent-context]"
---

# /arch-onboard

Run the complete understand-arch v3.0 onboarding flow. Treat a single repo as a multi-repo system with one repo. This skill coordinates other skills; it must not compress LLM phases into a script.

## Contract

- Read `internal/playbooks/analyze/playbook.md` for every repo and execute Phase 0-6 in the current session. That playbook owns the inherited UA scanner orchestration.
- Keep each repo graph independent at `specs/repos/<repo_id>/knowledge-graph.json`.
- Use `engine/arch/cross-repo-linker.mjs` only for deterministic cross-repo edges.
- Read `internal/playbooks/enrich/playbook.md` for Phase 7-13 and execute its architecture-layer enrichment contract in the current session.
- Dispatch `arch-wiki` for `ARCHITECTURE.md` plus the 14-page human projection.
- Fail if any of `arch-layer.architecture_style`, `arch-layer.component_profiles`, `arch-layer.capabilities`, `arch-layer.quality_attributes`, or `arch-layer.risks` is empty after enrichment.
- Write `eval-report.json` and include its trust label in the final report.
- Hooks are disabled unless the user passes `--enable-hooks`.
- v3.4 default behavior is incremental after the first successful onboard. Do not expose or teach extra parameters in normal output.
- v3.6 emits `.understand-arch/<project>/agent-context/` by default. If `--no-agent-context` is present, skip only that optional output. Never write `AGENTS.md` or `CLAUDE.md` to the user repository root.

## Resolve Project

1. Parse `$ARGUMENTS`.
2. If the first non-flag argument is a name, use it as `ARCH_PROJECT_ID`.
3. Resolve `WORKSPACE_ROOT` before creating any output. If the command is invoked from inside an existing `.understand-arch` tree, strip back to the outer repository root. This prevents repeated runs from creating `.understand-arch/.understand-arch/...`.
4. If no name is provided, use the `WORKSPACE_ROOT` basename.
5. Create:

```bash
WORKSPACE_ROOT="$(pwd -P)"
case "$WORKSPACE_ROOT" in
  */.understand-arch) WORKSPACE_ROOT="${WORKSPACE_ROOT%/.understand-arch}" ;;
  */.understand-arch/*) WORKSPACE_ROOT="${WORKSPACE_ROOT%%/.understand-arch/*}" ;;
esac

ARCH_PROJECT_ID="${ARCH_PROJECT_ID:-$(basename "$WORKSPACE_ROOT")}"
ARCH_PROJECT_ROOT="$WORKSPACE_ROOT/.understand-arch/$ARCH_PROJECT_ID"
mkdir -p "$ARCH_PROJECT_ROOT/specs/repos" "$ARCH_PROJECT_ROOT/wiki" "$ARCH_PROJECT_ROOT/rules" "$ARCH_PROJECT_ROOT/decisions" "$ARCH_PROJECT_ROOT/change-requests" "$ARCH_PROJECT_ROOT/improvements"
```

6. Write `state.yaml`:

```yaml
version: 3.0.0-rc1
project: <ARCH_PROJECT_ID>
hooks_enabled: false
history: []
```

If `--enable-hooks` is present, set `hooks_enabled: true`.

## Resolve Repos

Support both forms:

- No `--repo`: `WORKSPACE_ROOT` is the only repo.
- One or more `--repo <path>`: each path is a registered repo.

For each repo:

- `repo_id`: sanitized directory basename unless the user supplied an alias in future syntax.
- `name`: directory basename.
- `path`: absolute path.
- `graph_path`: `specs/repos/<repo_id>/knowledge-graph.json`.

Write `specs/repos.json`:

```json
{
  "version": "3.0",
  "repos": [
    {
      "repo_id": "repo",
      "name": "repo",
      "path": "/absolute/path",
      "graph_path": "specs/repos/repo/knowledge-graph.json"
    }
  ]
}
```

## Phase A - Code Fact Graphs

Before dispatching graph analysis, check whether this is a first run or an incremental run:

1. If `specs/repos/*/.fingerprint.json` is absent, run the existing full flow.
2. If a baseline exists, run the deterministic planner:

```bash
ARCH_PROJECT_ROOT="$ARCH_PROJECT_ROOT" node <PLUGIN_ROOT>/engine/arch/incremental-planner.mjs --arch-dir="$ARCH_PROJECT_ROOT"
```

3. Save the JSON output to `intermediate/incremental-plan.json`.
4. Apply the planner action:
   - `SKIP`: do not execute the analyze or enrich playbooks; run cards derivation, cards summary if needed, cards-check, eval, and final report.
   - `PARTIAL_UPDATE`: execute the analyze playbook only for `files_to_reanalyze` when the analyzer supports file-scoped rerun; otherwise rerun the affected repo graph and preserve per-repo boundaries. Then execute the enrich playbook with subset mode using `affected_arch_nodes`.
   - `ARCHITECTURE_UPDATE`: rerun repo graph and the full enrich playbook.
   - `FULL_UPDATE`: run the existing full flow and tell the user the change set was large enough to justify a full rebuild.

The planner is the only place that calls UA staleness, changed-file, fingerprint, and classifier primitives. Do not reimplement those decisions in this skill.

For every repo entry, read `<PLUGIN_ROOT>/internal/playbooks/analyze/playbook.md` and execute Phase 0-6 with environment:

```bash
ARCH_PROJECT_ID="<project-id>"
ARCH_REPO_ID="<repo-id>"
ARCH_PROJECT_ROOT="<workspace>/.understand-arch/<project-id>"
```

Prompt:

```text
Run the analyze playbook for repo <repo_id> at <path>.
Preserve the inherited UA Phase 0-6 pipeline.
Write the graph to <ARCH_PROJECT_ROOT>/specs/repos/<repo_id>/knowledge-graph.json.
Prefix node ids with <repo_id>:: when writing the final graph.
Do not run architecture-layer inference in this phase.
```

After each dispatch, confirm:

- graph file exists
- graph has nodes
- graph has at least one module or service when the repo has architecture boundaries

## Phase B - Cross-Repo Deterministic Linking

Run:

```bash
ARCH_PROJECT_ROOT="$ARCH_PROJECT_ROOT" node <PLUGIN_ROOT>/engine/arch/cross-repo-linker.mjs "$WORKSPACE_ROOT"
```

This writes `intermediate/cross-edges.json`. Do not merge the per-repo graphs.

## Phase C - Architecture Layer

Read `<PLUGIN_ROOT>/internal/playbooks/enrich/playbook.md` and execute it:

```text
Run the enrich playbook for <ARCH_PROJECT_ROOT>.
Use specs/repos.json and every per-repo graph.
Consume intermediate/cross-edges.json.
Produce specs/arch-layer.json.
Reject empty narrative fields, capabilities, quality_attributes, or risks.
```

## Phase D - Wiki

Dispatch `/arch-wiki`:

```text
Render ARCHITECTURE.md plus the 14-page wiki for <ARCH_PROJECT_ROOT>.
Audience: newcomer unless the user requested another audience.
Run wiki-reviewer and arch-senior-reviewer for full review on first onboard.
```

## Phase E - Eval And Dashboard Readiness

Run:

```bash
ARCH_PROJECT_ROOT="$ARCH_PROJECT_ROOT" node <PLUGIN_ROOT>/engine/arch/eval-report.mjs "$ARCH_PROJECT_ROOT"
```

Fail if `eval-report.metrics.hallucination_rate` is greater than 0.

Validate that dashboard inputs exist:

- `specs/repos.json`
- at least one `specs/repos/<repo_id>/knowledge-graph.json`
- `specs/arch-layer.json`
- `rules/project-language.md`
- `eval-report.json`
- `wiki/ARCHITECTURE.md`
- `wiki/README.md`

Unless `--no-agent-context` is present, run:

```bash
ARCH_PROJECT_ROOT="$ARCH_PROJECT_ROOT" node <PLUGIN_ROOT>/engine/arch/agent-context-init.mjs --arch-dir="$ARCH_PROJECT_ROOT"
```

This writes only under `.understand-arch/<project>/agent-context/`. If `--no-agent-context` is present, do not create that directory.

Tell the user they can run `/arch-dashboard <ARCH_PROJECT_ROOT>`.

## Final Report

Report:

- project id
- repos scanned
- graph node/edge counts per repo
- architecture layer counts
- narrative field counts
- project language path
- wiki page count
- agent-context status
- eval trust label and hallucination rate
- hook status
- paths to outputs
- any validation findings

## Failure Rules

- Missing graph: fail onboard.
- Empty architecture layer: fail onboard.
- Empty narrative layer: fail onboard.
- Eval hallucination_rate greater than 0: fail onboard.
- Wiki placeholder found: fail onboard.
- Senior reviewer reject: fail onboard.
- Unknown repo path: fail before dispatching.

## Task Calling Convention

`arch-onboard` is only an orchestrator. When it loads the analyze and enrich playbooks, or invokes `arch-wiki`, it must preserve their own Task-based subagent dispatch contracts instead of compressing those phases into a script.

For internal phase playbooks (analyze, enrich), use the Read tool to load the playbook body, then execute its phase dispatch contract in the current session. Do not attempt Task dispatch against playbook names; they are not registered subagents.

Use the Claude Code Task tool for the semantic subagents named by the playbooks and by `arch-wiki` when the runtime exposes skill execution through Task. Do not inline this phase. The user must see subagent activity in Claude Code for Phase 0-6 file and graph analysis and Phase 7-13 architecture enrichment. If the Task tool is unavailable, stop and report that v3.5 requires visible Claude Code subagent activity.
