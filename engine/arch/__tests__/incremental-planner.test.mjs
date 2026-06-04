import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveCards } from "../cards-deriver.mjs";
import { buildCurrentFingerprintStore, mergeIncrementalGraph, planIncremental } from "../incremental-planner.mjs";
import { writeFixture, tempDir } from "./cards-fixture.mjs";

const fakeRegistry = {
  analyzeFile(filePath, content) {
    const functions = [...content.matchAll(/function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g)].map((match) => ({
      name: match[1],
      params: match[2].split(",").map((part) => part.trim()).filter(Boolean),
      returnType: undefined,
      lineRange: [1, 1],
    }));
    return { filePath, language: "typescript", functions, classes: [], imports: [], exports: functions.map((fn) => ({ name: fn.name })) };
  },
};

function writeFingerprint(archDir, repoRoot, files) {
  const store = buildCurrentFingerprintStore(repoRoot, files, fakeRegistry, "base");
  writeFileSync(join(archDir, "specs", "repos", "sample", ".fingerprint.json"), `${JSON.stringify(store, null, 2)}\n`, "utf-8");
}

describe("incremental-planner", () => {
  it("cosmetic-only 改动映射为 SKIP,并保留受影响 cards", async () => {
    const { archDir, repoRoot } = writeFixture();
    writeFileSync(join(repoRoot, "src", "auth.ts"), "export function login(user) { return true; }\n", "utf-8");
    writeFingerprint(archDir, repoRoot, ["src/auth.ts", "src/api.ts", "src/user.ts"]);
    deriveCards({ archDir });
    writeFileSync(join(repoRoot, "src", "auth.ts"), "export function login(user) { return false; }\n", "utf-8");

    const plan = await planIncremental({ archDir, registry: fakeRegistry, changedFiles: ["src/auth.ts"] });

    expect(plan.action).toBe("SKIP");
    expect(plan.files_to_reanalyze).toEqual([]);
    expect(plan.affected_card_ids).toContain("card:component:auth");
  });

  it("单文件函数签名改动映射为 PARTIAL_UPDATE,受影响节点不超过 3 个", async () => {
    const { archDir, repoRoot } = writeFixture();
    writeFileSync(join(repoRoot, "src", "auth.ts"), "export function login(user) { return true; }\n", "utf-8");
    writeFingerprint(archDir, repoRoot, ["src/auth.ts", "src/api.ts", "src/user.ts"]);
    deriveCards({ archDir });
    writeFileSync(join(repoRoot, "src", "auth.ts"), "export function login(user, token) { return true; }\n", "utf-8");

    const plan = await planIncremental({ archDir, registry: fakeRegistry, changedFiles: ["src/auth.ts"] });

    expect(plan.action).toBe("PARTIAL_UPDATE");
    expect(plan.files_to_reanalyze).toEqual(["src/auth.ts"]);
    expect(plan.affected_arch_nodes.length).toBeLessThanOrEqual(3);
    expect(plan.affected_arch_nodes).toContain("sample::module:auth");
  });

  it("11 个结构改动映射为 ARCHITECTURE_UPDATE", async () => {
    const { archDir, repoRoot } = writeManyFilesFixture(40);
    const files = Array.from({ length: 11 }, (_, index) => `src/f${index}.ts`);
    const allFiles = Array.from({ length: 40 }, (_, index) => `src/f${index}.ts`);
    writeFingerprint(archDir, repoRoot, allFiles);
    for (let index = 0; index < 11; index += 1) {
      writeFileSync(join(repoRoot, "src", `f${index}.ts`), `export function f${index}(value, extra) { return value; }\n`, "utf-8");
    }

    const plan = await planIncremental({ archDir, registry: fakeRegistry, changedFiles: files });

    expect(plan.action).toBe("ARCHITECTURE_UPDATE");
    expect(plan.rerun_architecture).toBe(true);
  });

  it("31 个结构改动映射为 FULL_UPDATE", async () => {
    const { archDir, repoRoot } = writeManyFilesFixture(31);
    const files = Array.from({ length: 31 }, (_, index) => `src/f${index}.ts`);
    writeFingerprint(archDir, repoRoot, files);
    for (let index = 0; index < 31; index += 1) {
      writeFileSync(join(repoRoot, "src", `f${index}.ts`), `export function f${index}(value, extra) { return value; }\n`, "utf-8");
    }

    const plan = await planIncremental({ archDir, registry: fakeRegistry, changedFiles: files });

    expect(plan.action).toBe("FULL_UPDATE");
    expect(plan.rerun_tour).toBe(true);
  });

  it("旧版非 structural fingerprint 基线会要求 FULL_UPDATE 而不是崩溃", async () => {
    const { archDir } = writeFixture();
    writeFileSync(join(archDir, "specs", "repos", "sample", ".fingerprint.json"), `${JSON.stringify({
      repo_id: "sample",
      generated_at: "2026-06-04T00:00:00.000Z",
      file_count: 3,
    }, null, 2)}\n`, "utf-8");

    const plan = await planIncremental({ archDir, registry: fakeRegistry });

    expect(plan.action).toBe("FULL_UPDATE");
    expect(plan.reason).toContain("missing or incompatible fingerprint baseline");
  });

  it("增量 graph 合并复用 UA mergeGraphUpdate", () => {
    const merged = mergeIncrementalGraph({
      existingGraph: {
        project: { name: "sample", gitCommitHash: "old", analyzedAt: "old" },
        nodes: [
          { id: "sample::file:src/a.ts", type: "file", name: "a", filePath: "src/a.ts" },
          { id: "sample::file:src/b.ts", type: "file", name: "b", filePath: "src/b.ts" },
        ],
        edges: [{ source: "sample::file:src/a.ts", target: "sample::file:src/b.ts", type: "imports" }],
      },
      changedFiles: ["src/a.ts"],
      newNodes: [{ id: "sample::file:src/a.ts:new", type: "file", name: "a", filePath: "src/a.ts" }],
      newEdges: [],
      newCommitHash: "new",
    });

    expect(merged.nodes.map((node) => node.id)).toEqual(["sample::file:src/b.ts", "sample::file:src/a.ts:new"]);
    expect(merged.edges).toEqual([]);
    expect(merged.project.gitCommitHash).toBe("new");
  });
});

function writeManyFilesFixture(count) {
  const root = tempDir("incremental-many");
  const repoRoot = join(root, "repo");
  const archDir = join(root, ".understand-arch", "sample");
  mkdirSync(join(repoRoot, "src"), { recursive: true });
  mkdirSync(join(archDir, "specs", "repos", "sample"), { recursive: true });
  const nodes = [];
  for (let index = 0; index < count; index += 1) {
    const filePath = `src/f${index}.ts`;
    writeFileSync(join(repoRoot, filePath), `export function f${index}(value) { return value; }\n`, "utf-8");
    nodes.push({ id: `sample::file:${filePath}`, type: "file", name: `f${index}.ts`, filePath });
  }
  writeFileSync(join(archDir, "specs", "repos.json"), JSON.stringify({
    repos: [{
      repo_id: "sample",
      name: "sample",
      path: repoRoot,
      graph_path: join(archDir, "specs", "repos", "sample", "knowledge-graph.json")
    }]
  }, null, 2), "utf-8");
  writeFileSync(join(archDir, "specs", "repos", "sample", "knowledge-graph.json"), JSON.stringify({ version: "3.0", nodes, edges: [] }, null, 2), "utf-8");
  writeFileSync(join(archDir, "specs", "arch-layer.json"), JSON.stringify({ version: "3.0", project: { repos: [] } }, null, 2), "utf-8");
  return { archDir, repoRoot };
}
