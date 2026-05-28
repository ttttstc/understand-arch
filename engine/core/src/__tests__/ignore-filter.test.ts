import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createIgnoreFilter, DEFAULT_IGNORE_PATTERNS } from "../ignore-filter";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

describe("IgnoreFilter", () => {
  let testDir: string;

  beforeEach(() => {
    testDir = join(tmpdir(), `ignore-filter-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, ".understand-arch"), { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  describe("DEFAULT_IGNORE_PATTERNS", () => {
    it("contains node_modules", () => {
      expect(DEFAULT_IGNORE_PATTERNS).toContain("node_modules/");
    });

    it("contains .git", () => {
      expect(DEFAULT_IGNORE_PATTERNS).toContain(".git/");
    });

    it("contains obj for .NET", () => {
      expect(DEFAULT_IGNORE_PATTERNS).toContain("obj/");
    });

    it("does not contain bin (used by Node/Ruby CLI launchers)", () => {
      expect(DEFAULT_IGNORE_PATTERNS).not.toContain("bin/");
    });

    it("contains build output directories", () => {
      expect(DEFAULT_IGNORE_PATTERNS).toContain("dist/");
      expect(DEFAULT_IGNORE_PATTERNS).toContain("build/");
      expect(DEFAULT_IGNORE_PATTERNS).toContain("out/");
      expect(DEFAULT_IGNORE_PATTERNS).toContain("coverage/");
    });

    it("contains structure-irrelevant test, fixture, and generated patterns", () => {
      expect(DEFAULT_IGNORE_PATTERNS).toContain("**/*.test.*");
      expect(DEFAULT_IGNORE_PATTERNS).toContain("**/*.spec.*");
      expect(DEFAULT_IGNORE_PATTERNS).toContain("**/__tests__/**");
      expect(DEFAULT_IGNORE_PATTERNS).toContain("**/fixtures/**");
      expect(DEFAULT_IGNORE_PATTERNS).toContain("**/generated/**");
      expect(DEFAULT_IGNORE_PATTERNS).toContain("**/*.pb.go");
    });
  });

  describe("createIgnoreFilter with no user file", () => {
    it("ignores files matching default patterns", () => {
      const filter = createIgnoreFilter(testDir);
      expect(filter.isIgnored("node_modules/foo/bar.js")).toBe(true);
      expect(filter.isIgnored("dist/index.js")).toBe(true);
      expect(filter.isIgnored(".git/config")).toBe(true);
      expect(filter.isIgnored("obj/Release/net8.0/app.dll")).toBe(true);
    });

    it("does not ignore source files", () => {
      const filter = createIgnoreFilter(testDir);
      expect(filter.isIgnored("src/index.ts")).toBe(false);
      expect(filter.isIgnored("README.md")).toBe(false);
      expect(filter.isIgnored("package.json")).toBe(false);
    });

    it("ignores lock files", () => {
      const filter = createIgnoreFilter(testDir);
      expect(filter.isIgnored("pnpm-lock.yaml")).toBe(true);
      expect(filter.isIgnored("package-lock.json")).toBe(true);
      expect(filter.isIgnored("yarn.lock")).toBe(true);
    });

    it("ignores binary/asset files", () => {
      const filter = createIgnoreFilter(testDir);
      expect(filter.isIgnored("logo.png")).toBe(true);
      expect(filter.isIgnored("photo.tiff")).toBe(true);
      expect(filter.isIgnored("photo.heic")).toBe(true);
      expect(filter.isIgnored("photo.dng")).toBe(true);
      expect(filter.isIgnored("design.psd")).toBe(true);
      expect(filter.isIgnored("illustration.eps")).toBe(true);
      expect(filter.isIgnored("next-gen.jxl")).toBe(true);
      expect(filter.isIgnored("font.woff2")).toBe(true);
      expect(filter.isIgnored("doc.pdf")).toBe(true);
    });

    it("ignores generated files", () => {
      const filter = createIgnoreFilter(testDir);
      expect(filter.isIgnored("bundle.min.js")).toBe(true);
      expect(filter.isIgnored("style.min.css")).toBe(true);
      expect(filter.isIgnored("source.map")).toBe(true);
      expect(filter.isIgnored("src/api/generated/client.ts")).toBe(true);
      expect(filter.isIgnored("proto/user.pb.go")).toBe(true);
    });

    it("ignores tests, snapshots, mocks, and fixtures by default", () => {
      const filter = createIgnoreFilter(testDir);
      expect(filter.isIgnored("src/user.test.ts")).toBe(true);
      expect(filter.isIgnored("src/user.spec.ts")).toBe(true);
      expect(filter.isIgnored("src/__tests__/user.ts")).toBe(true);
      expect(filter.isIgnored("src/__snapshots__/user.snap")).toBe(true);
      expect(filter.isIgnored("src/__mocks__/api.ts")).toBe(true);
      expect(filter.isIgnored("fixtures/user.json")).toBe(true);
    });

    it("ignores IDE directories", () => {
      const filter = createIgnoreFilter(testDir);
      expect(filter.isIgnored(".idea/workspace.xml")).toBe(true);
      expect(filter.isIgnored(".vscode/settings.json")).toBe(true);
    });
  });

  describe("createIgnoreFilter with user .understandignore", () => {
    it("reads patterns from .understand-arch/.understandignore", () => {
      writeFileSync(
        join(testDir, ".understand-arch", ".understandignore"),
        "# Exclude tests\n__tests__/\n*.test.ts\n"
      );
      const filter = createIgnoreFilter(testDir);
      expect(filter.isIgnored("__tests__/foo.test.ts")).toBe(true);
      expect(filter.isIgnored("src/utils.test.ts")).toBe(true);
      expect(filter.isIgnored("src/utils.ts")).toBe(false);
    });

    it("reads patterns from project root .understandignore", () => {
      writeFileSync(
        join(testDir, ".understandignore"),
        "docs/\n"
      );
      const filter = createIgnoreFilter(testDir);
      expect(filter.isIgnored("docs/README.md")).toBe(true);
      expect(filter.isIgnored("src/index.ts")).toBe(false);
    });

    it("handles # comments and blank lines", () => {
      writeFileSync(
        join(testDir, ".understand-arch", ".understandignore"),
        "# This is a comment\n\n\nfixtures/\n\n# Another comment\n"
      );
      const filter = createIgnoreFilter(testDir);
      expect(filter.isIgnored("fixtures/data.json")).toBe(true);
      expect(filter.isIgnored("src/index.ts")).toBe(false);
    });

    it("supports ! negation to override defaults", () => {
      writeFileSync(
        join(testDir, ".understand-arch", ".understandignore"),
        "!dist/\n!**/*.test.*\n"
      );
      const filter = createIgnoreFilter(testDir);
      expect(filter.isIgnored("dist/index.js")).toBe(false);
      expect(filter.isIgnored("src/utils.test.ts")).toBe(false);
    });

    it("supports ** recursive matching", () => {
      writeFileSync(
        join(testDir, ".understand-arch", ".understandignore"),
        "**/snapshots/\n"
      );
      const filter = createIgnoreFilter(testDir);
      expect(filter.isIgnored("src/components/snapshots/Button.snap")).toBe(true);
      expect(filter.isIgnored("snapshots/foo.snap")).toBe(true);
    });

    it("merges .understand-arch/ and root .understandignore", () => {
      writeFileSync(
        join(testDir, ".understand-arch", ".understandignore"),
        "__tests__/\n"
      );
      writeFileSync(
        join(testDir, ".understandignore"),
        "fixtures/\n"
      );
      const filter = createIgnoreFilter(testDir);
      expect(filter.isIgnored("__tests__/foo.ts")).toBe(true);
      expect(filter.isIgnored("fixtures/data.json")).toBe(true);
      expect(filter.isIgnored("src/index.ts")).toBe(false);
    });
  });
});
