import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { initAgentContext } from "../agent-context-init.mjs";
import { tempDir } from "./cards-fixture.mjs";

describe("agent-context-init", () => {
  it("只写 .understand-arch 下的 agent-context, 不触碰仓库根目录 CLAUDE.md", () => {
    const root = tempDir("agent-context");
    const repoRoot = join(root, "repo");
    const archDir = join(repoRoot, ".understand-arch", "sample");
    mkdirSync(join(archDir, "specs"), { recursive: true });
    const rootClaude = join(repoRoot, "CLAUDE.md");
    writeFileSync(rootClaude, "# user-owned\n", "utf-8");
    writeFileSync(join(archDir, "specs", "arch-layer.json"), JSON.stringify({
      project: { name: "sample", description: "demo" }
    }), "utf-8");

    const result = initAgentContext({ archDir });

    expect(existsSync(join(archDir, "agent-context", "AGENTS.md"))).toBe(true);
    expect(existsSync(join(archDir, "agent-context", "CLAUDE.md"))).toBe(true);
    expect(readFileSync(rootClaude, "utf-8")).toBe("# user-owned\n");
    expect(result.files.every((file) => file.startsWith(join(archDir, "agent-context")))).toBe(true);
  });

  it("支持关闭 agent context 产物", () => {
    const root = tempDir("agent-context-off");
    const archDir = join(root, ".understand-arch", "sample");
    mkdirSync(join(archDir, "specs"), { recursive: true });

    const result = initAgentContext({ archDir, noAgentContext: true });

    expect(result.skipped).toBe(true);
    expect(existsSync(join(archDir, "agent-context"))).toBe(false);
  });
});
