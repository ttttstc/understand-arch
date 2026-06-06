import { mkdirSync, mkdtempSync } from "node:fs";
import { join, basename } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { inferArchDir, isInsideArchWorkspace, resolveWorkspaceRoot } from "../project-paths.mjs";

function tempRoot(name) {
  return mkdtempSync(join(tmpdir(), `understand-arch-${name}-`));
}

describe("project-paths", () => {
  it("resolves nested .understand-arch cwd back to the outer workspace root", () => {
    const root = tempRoot("paths");
    const nested = join(root, ".understand-arch", basename(root), "wiki");
    mkdirSync(nested, { recursive: true });

    expect(isInsideArchWorkspace(nested)).toBe(true);
    expect(resolveWorkspaceRoot(nested)).toBe(root);
    expect(inferArchDir({ projectRoot: nested })).toBe(join(root, ".understand-arch", basename(root)));
  });

  it("keeps a normal workspace root unchanged", () => {
    const root = tempRoot("paths-normal");
    expect(isInsideArchWorkspace(root)).toBe(false);
    expect(resolveWorkspaceRoot(root)).toBe(root);
    expect(inferArchDir({ projectRoot: root, projectId: "sample" })).toBe(join(root, ".understand-arch", "sample"));
  });
});
