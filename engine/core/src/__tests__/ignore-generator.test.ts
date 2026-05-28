import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { generateStarterIgnoreFile } from "../ignore-generator";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("generateStarterIgnoreFile", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `ignore-gen-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("includes a header comment explaining the file", () => {
    const content = generateStarterIgnoreFile(testDir);
    expect(content).toContain(".understandignore");
    expect(content).toContain("same as .gitignore");
    expect(content).toContain("Built-in defaults");
  });

  it("all suggestions are commented out", () => {
    mkdirSync(join(testDir, "__tests__"), { recursive: true });
    mkdirSync(join(testDir, "docs"), { recursive: true });
    const content = generateStarterIgnoreFile(testDir);
    const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
    expect(lines).toHaveLength(0);
  });

  it("does not suggest __tests__ because tests are default ignored", () => {
    mkdirSync(join(testDir, "__tests__"), { recursive: true });
    const content = generateStarterIgnoreFile(testDir);
    expect(content).not.toContain("# __tests__/");
  });

  it("suggests docs when directory exists", () => {
    mkdirSync(join(testDir, "docs"), { recursive: true });
    const content = generateStarterIgnoreFile(testDir);
    expect(content).toContain("# docs/");
  });

  it("does not suggest test and tests because tests are default ignored", () => {
    mkdirSync(join(testDir, "test"), { recursive: true });
    mkdirSync(join(testDir, "tests"), { recursive: true });
    const content = generateStarterIgnoreFile(testDir);
    expect(content).not.toContain("# test/");
    expect(content).not.toContain("# tests/");
  });

  it("does not suggest fixtures because fixtures are default ignored", () => {
    mkdirSync(join(testDir, "fixtures"), { recursive: true });
    const content = generateStarterIgnoreFile(testDir);
    expect(content).not.toContain("# fixtures/");
  });

  it("suggests examples when directory exists", () => {
    mkdirSync(join(testDir, "examples"), { recursive: true });
    const content = generateStarterIgnoreFile(testDir);
    expect(content).toContain("# examples/");
  });

  it("suggests .storybook when directory exists", () => {
    mkdirSync(join(testDir, ".storybook"), { recursive: true });
    const content = generateStarterIgnoreFile(testDir);
    expect(content).toContain("# .storybook/");
  });

  it("suggests migrations when directory exists", () => {
    mkdirSync(join(testDir, "migrations"), { recursive: true });
    const content = generateStarterIgnoreFile(testDir);
    expect(content).toContain("# migrations/");
  });

  it("suggests scripts when directory exists", () => {
    mkdirSync(join(testDir, "scripts"), { recursive: true });
    const content = generateStarterIgnoreFile(testDir);
    expect(content).toContain("# scripts/");
  });

  it("documents the default structural-noise skip categories", () => {
    const content = generateStarterIgnoreFile(testDir);
    expect(content).toContain("tests, mocks, fixtures, generated code");
    expect(content).toContain("binary assets");
  });

  it("does not suggest directories that don't exist", () => {
    const content = generateStarterIgnoreFile(testDir);
    expect(content).not.toContain("# __tests__/");
    expect(content).not.toContain("# .storybook/");
    expect(content).not.toContain("# fixtures/");
  });

  describe(".gitignore integration", () => {
    it("includes .gitignore patterns not covered by defaults", () => {
      writeFileSync(join(testDir, ".gitignore"), "secrets/\n*.pyc\ncustom-cache/\n");
      const content = generateStarterIgnoreFile(testDir);
      expect(content).toContain("From .gitignore");
      expect(content).toContain("# secrets/");
      expect(content).toContain("# *.pyc");
      expect(content).toContain("# custom-cache/");
    });

    it("excludes .gitignore patterns already in defaults", () => {
      writeFileSync(join(testDir, ".gitignore"), "node_modules/\ndist/\n.env\nsecrets/\n");
      const content = generateStarterIgnoreFile(testDir);
      expect(content).toContain("# secrets/");
      // node_modules/, dist/, and .env are in defaults, should not appear in .gitignore section
      const gitignoreSection = content.split("From .gitignore")[1]?.split("---")[0] ?? "";
      expect(gitignoreSection).not.toContain("node_modules");
      expect(gitignoreSection).not.toContain("dist");
      expect(gitignoreSection).not.toContain(".env");
    });

    it("skips .gitignore comments and blank lines", () => {
      writeFileSync(join(testDir, ".gitignore"), "# a comment\n\nsecrets/\n  \n");
      const content = generateStarterIgnoreFile(testDir);
      expect(content).toContain("# secrets/");
      // Should not include the original comment as a pattern
      const gitignoreSection = content.split("From .gitignore")[1]?.split("---")[0] ?? "";
      expect(gitignoreSection).not.toContain("a comment");
    });

    it("handles .gitignore with trailing-slash normalization for defaults", () => {
      // "dist" without trailing slash should still match "dist/" default
      writeFileSync(join(testDir, ".gitignore"), "dist\ncoverage\nsecrets/\n");
      const content = generateStarterIgnoreFile(testDir);
      expect(content).toContain("From .gitignore");
      // Extract lines between the .gitignore header and the next section header
      const lines = content.split("\n");
      const headerIdx = lines.findIndex((l) => l.includes("From .gitignore"));
      const nextSectionIdx = lines.findIndex((l, i) => i > headerIdx && l.startsWith("# ---"));
      const sectionLines = lines.slice(headerIdx + 1, nextSectionIdx === -1 ? undefined : nextSectionIdx);
      const patterns = sectionLines.filter((l) => l.startsWith("# ") && !l.startsWith("# ---")).map((l) => l.slice(2));
      expect(patterns).toContain("secrets/");
      expect(patterns).not.toContain("dist");
      expect(patterns).not.toContain("coverage");
    });

    it("omits .gitignore section when no .gitignore exists", () => {
      const content = generateStarterIgnoreFile(testDir);
      expect(content).not.toContain("From .gitignore");
    });

    it("omits .gitignore section when all patterns are covered by defaults", () => {
      writeFileSync(join(testDir, ".gitignore"), "node_modules/\ndist/\n*.lock\n");
      const content = generateStarterIgnoreFile(testDir);
      expect(content).not.toContain("From .gitignore");
    });

    it("all .gitignore suggestions are commented out", () => {
      writeFileSync(join(testDir, ".gitignore"), "secrets/\n*.pyc\n");
      const content = generateStarterIgnoreFile(testDir);
      const lines = content.split("\n").filter((l) => l.trim() && !l.startsWith("#"));
      expect(lines).toHaveLength(0);
    });
  });
});
