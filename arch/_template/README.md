# `_template/` — Workspace Skeleton

`arch-workflow` copies this directory into `arch/{project-name}/` on the first invocation for a new project. **Do not run skills against `_template/` directly** — it is the source, not a workspace.

Each stub file inside contains a comment header explaining what schema it satisfies and what the canonical filler skill is. Stubs are intentionally invalid against their JSON Schemas (they lack required fields) so that a half-copied template never accidentally passes acceptance.

## Editing this template

Change the template only when:
- A schema in `internal/schemas/` adds or removes a required top-level field
- A new mandatory file is added to the workspace contract
- A directory's purpose changes

Schema-internal field changes (sub-fields, enum widening) do **not** require template changes — those flow through skill prompts, not through this skeleton.

After editing, bump the `template_version` field in `state.yaml` and document the change in `CHANGELOG.md`.
