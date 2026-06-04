import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { lintSkillText } from "../dispatch-lint.mjs";

const repoRoot = process.cwd();

function validSkill(extra = "") {
  return `# /arch-demo

## Subagent Dispatch Is Mandatory

Use the Claude Code Task tool with \`subagent_type=arch-demo-agent\`.
Do not inline this phase. The user must see subagent activity in Claude Code.

Use the Claude Code Task tool with \`subagent_type=arch-demo-agent\`. Do not inline this phase. The user must see subagent activity in Claude Code.
${extra}
`;
}

describe("dispatch-lint", () => {
  it("accepts arch-analyze as the benchmark fixture", () => {
    const text = readFileSync(path.join(repoRoot, "skills/arch-analyze/SKILL.md"), "utf8");
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
});
