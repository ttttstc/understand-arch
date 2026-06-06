import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lintSkillText, lintSubagentReferences } from "../dispatch-lint.mjs";

const repoRoot = process.cwd();

function validSkill(extra = "") {
  return `# /arch-demo

## Subagent Dispatch Is Mandatory

Use the Claude Code Task tool with \`subagent_type=arch-demo-agent\`.
Do not inline this phase. The user must see subagent activity in Claude Code.

**Runtime fallback**: If the current runtime does not expose \`Task\` or \`Agent\` tools, inline execution is permitted.

- Open the response with one line: \`[runtime-fallback: inline subagent <name>]\`
- Execute the phase logic in the main conversation
- Skip parallel-dispatch instructions; treat them as sequential

Use the Claude Code Task tool with \`subagent_type=arch-demo-agent\`. Do not inline this phase. The user must see subagent activity in Claude Code.
${extra}
`;
}

describe("dispatch-lint", () => {
  it("accepts arch-analyze as the benchmark fixture", () => {
    const text = readFileSync(path.join(repoRoot, "internal/playbooks/analyze/playbook.md"), "utf8");
    const result = lintSkillText("arch-analyze", text, { strict: true });
    expect(result.errors).toEqual([]);
  });

  it("rejects missing Task tool wording", () => {
    const text = `# /arch-demo

## Subagent Dispatch Is Mandatory

Dispatch \`arch-demo-agent\` with this template:

\`\`\`text
Mode: demo.
\`\`\`
`;
    const result = lintSkillText("arch-enrich", text, { strict: true });
    expect(result.errors.join("\n")).toContain("Use the Claude Code Task tool");
    expect(result.errors.join("\n")).toContain("legacy dispatch wording");
  });

  it("rejects missing runtime fallback section", () => {
    const text = `# /arch-demo

## Subagent Dispatch Is Mandatory

Use the Claude Code Task tool with \`subagent_type=arch-demo-agent\`.
Do not inline this phase. The user must see subagent activity in Claude Code.
Send these N dispatches in a single message to run concurrently.
`;
    const result = lintSkillText("arch-enrich", text, { strict: true });
    expect(result.errors.join("\n")).toContain("Runtime fallback");
    expect(result.errors.join("\n")).toContain("[runtime-fallback: inline subagent");
  });

  it("accepts a skill with the runtime fallback section", () => {
    const text = validSkill("Send these N dispatches in a single message to run concurrently.\n");
    const result = lintSkillText("arch-enrich", text, { strict: true });
    expect(result.errors).toEqual([]);
  });

  it("rejects missing subagent_type", () => {
    const text = `# /arch-demo

## Subagent Dispatch Is Mandatory

Use the Claude Code Task tool for the reviewer.
Do not inline this phase. The user must see subagent activity in Claude Code.
Send these N dispatches in a single message to run concurrently.
`;
    const result = lintSkillText("arch-audit", text, { strict: true });
    expect(result.errors.join("\n")).toContain("subagent_type=");
  });

  it("rejects forbidden inline simulation wording", () => {
    const text = validSkill("Send these N dispatches in a single message to run concurrently.\nDo an inline simulation if Task is unavailable.\n");
    const result = lintSkillText("arch-design", text, { strict: true });
    expect(result.errors.join("\n")).toContain("forbidden inline simulation");
  });

  it("rejects parallel wording without the single-message dispatch phrase", () => {
    const text = validSkill("Run the three reviews concurrently.\n");
    const result = lintSkillText("arch-wiki", text, { strict: true });
    expect(result.errors.join("\n")).toContain("single-message dispatch phrase");
  });

  it("rejects unresolved subagent_type references", () => {
    const root = mkdtempSync(path.join(tmpdir(), "dispatch-lint-"));
    const skillDir = path.join(root, "skills", "arch-demo");
    const agentsDir = path.join(root, "agents");
    mkdirSync(skillDir, { recursive: true });
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(path.join(skillDir, "SKILL.md"), "Use the Claude Code Task tool with `subagent_type=missing-agent`.\n");

    const result = lintSubagentReferences({ repoRoot: root });
    expect(result.flatMap((item) => item.errors).join("\n")).toContain("unresolved subagent_type=missing-agent");
  });

  it("accepts resolvable subagent_type references", () => {
    const root = mkdtempSync(path.join(tmpdir(), "dispatch-lint-"));
    const skillDir = path.join(root, "skills", "arch-demo");
    const playbookDir = path.join(root, "internal", "playbooks", "demo");
    const agentsDir = path.join(root, "agents");
    mkdirSync(skillDir, { recursive: true });
    mkdirSync(playbookDir, { recursive: true });
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(path.join(skillDir, "SKILL.md"), "Use the Claude Code Task tool with `subagent_type=demo-agent`.\n");
    writeFileSync(path.join(playbookDir, "playbook.md"), "Use `subagent_type: \"demo-agent\"` for review.\n");
    writeFileSync(path.join(agentsDir, "demo-agent.md"), "---\nname: demo-agent\n---\n");

    const result = lintSubagentReferences({ repoRoot: root });
    expect(result.flatMap((item) => item.errors)).toEqual([]);
  });
});
