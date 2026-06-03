import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collectHistorySignals, mergeHistoryMining } from "../history-miner-runner.mjs";
import { tempDir } from "./cards-fixture.mjs";

function writeHistoryFixture() {
  const root = tempDir("history-miner");
  const repoRoot = join(root, "repo");
  const archDir = join(root, ".understand-arch", "sample");
  mkdirSync(repoRoot, { recursive: true });
  mkdirSync(join(archDir, "specs"), { recursive: true });
  writeFileSync(join(archDir, "specs", "repos.json"), JSON.stringify({
    repos: [{ repo_id: "sample", name: "sample", path: repoRoot, graph_path: "unused" }]
  }, null, 2), "utf-8");
  return { root, archDir };
}

describe("history-miner-runner", () => {
  it("fixture history 产出 temporal coupling 和 hotspot", () => {
    const { root, archDir } = writeHistoryFixture();
    const commits = [
      { hash: "a1", timestamp: "1", subject: "feat auth", files: ["src/auth.ts", "src/session.ts"] },
      { hash: "a2", timestamp: "2", subject: "fix auth", files: ["src/auth.ts", "src/session.ts"] },
      { hash: "a3", timestamp: "3", subject: "hotfix auth", files: ["src/auth.ts"] },
    ];

    const collected = collectHistorySignals({
      archDir,
      projectRoot: root,
      fixtureCommitsByRepo: { sample: commits },
    });
    const repo = collected.repos[0];
    expect(repo.temporal_couplings.length).toBeGreaterThanOrEqual(1);
    expect(repo.hotspots.length).toBeGreaterThanOrEqual(1);

    const merged = mergeHistoryMining({ archDir, projectRoot: root, writeConstraints: false });
    expect(merged.temporal_coupling_count).toBeGreaterThanOrEqual(1);
    expect(merged.hotspot_count).toBeGreaterThanOrEqual(1);
    const mine = JSON.parse(readFileSync(join(archDir, "intermediate", "constraint-mine.json"), "utf-8"));
    expect(mine.constraints.some((item) => item.source === "ai-mined" && item.status === "proposed")).toBe(true);
    expect(mine.suspicious_findings.some((item) => item.anomaly_type === "hotspot")).toBe(true);
  });
});
