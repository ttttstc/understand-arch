import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { tempDir } from "./cards-fixture.mjs";

describe("arch-analyze build-fingerprints", () => {
  it("写入每仓 fingerprint 基线供 incremental-planner 消费", () => {
    const root = tempDir("build-fingerprints");
    const repoRoot = join(root, "repo-a");
    const archDir = join(root, ".understand-arch", "sample");
    mkdirSync(join(repoRoot, "src"), { recursive: true });
    mkdirSync(join(archDir, "intermediate"), { recursive: true });
    writeFileSync(join(repoRoot, "src", "index.ts"), "export function main(value: string) { return value; }\n", "utf-8");
    const inputPath = join(archDir, "intermediate", "fingerprint-input.json");
    writeFileSync(inputPath, JSON.stringify({
      projectRoot: repoRoot,
      repoId: "repo-a",
      sourceFilePaths: ["src/index.ts"],
      gitCommitHash: "test-commit",
    }, null, 2), "utf-8");

    const stdout = execFileSync("node", ["skills/arch-analyze/build-fingerprints.mjs", inputPath], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ARCH_PROJECT_ROOT: archDir,
        ARCH_REPO_ID: "repo-a",
      },
      encoding: "utf-8",
    });

    expect(stdout).toContain("Fingerprints baseline: 1 files");
    expect(existsSync(join(archDir, "specs", "repos", "repo-a", ".fingerprint.json"))).toBe(true);
    expect(existsSync(join(repoRoot, ".understand-arch", "repo-a", "fingerprints.json"))).toBe(true);
  });
});
