---
name: arch-frame
description: Internal PRD hard gate for architecture design. Blocks under-specified requests before CR generation.
argument-hint: "<prd-or-request>"
---

# arch-frame

`arch-frame` prevents under-specified PRDs from becoming confident-looking CR.md files. It is an internal skill used by `/arch-design`.

## Goal

Turn the request into a small, explicit frame:

- problem statement
- goals
- non-goals
- affected users/systems
- constraints
- assumptions
- open questions
- blocking unknown count

## Inputs

- User PRD/request.
- Existing graph and arch-layer when available.
- Rules, ADRs, and active CRs.

## Process

1. Read the request.
2. Identify the actual user or system problem.
3. Separate goals from implementation guesses.
4. Identify non-goals.
5. Identify affected users and systems.
6. Read rules and ADRs for hard constraints.
7. Read active CRs for conflicts.
8. Produce open questions.
9. Count only questions that block architecture design as blocking unknowns.

## Blocking Unknowns

Examples that count:

- Unknown external API contract.
- Unknown data sensitivity or compliance class.
- Unknown owner for a cross-repo boundary.
- Unknown write path or source of truth.
- Unknown rollout or rollback constraint.
- Unknown NFR target when the change is NFR-sensitive.

Examples that do not count:

- Minor naming preferences.
- UI copy details.
- Implementation micro-style.
- Unknowns that can be safely documented as assumptions.

## Output

Return JSON only:

```json
{
  "problem_statement": "",
  "goals": [],
  "non_goals": [],
  "affected_users": [],
  "affected_systems": [],
  "constraints": [],
  "assumptions": [],
  "open_questions": [],
  "blocking_unknown_count": 0,
  "recommendation": "continue|ask_user"
}
```

## Gate

If `blocking_unknown_count >= 3`, return `recommendation: ask_user`. `/arch-design` must stop and ask the user for answers.

If fewer than 3 blocking unknowns remain, return `recommendation: continue` and make assumptions explicit.

## Prohibitions

- Do not draft a CR.
- Do not design the solution.
- Do not hide blocking unknowns by calling them assumptions.
- Do not ask more than necessary.
