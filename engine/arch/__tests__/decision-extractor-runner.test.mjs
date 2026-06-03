import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { runDecisionExtractor } from "../decision-extractor-runner.mjs";
import { tempDir } from "./cards-fixture.mjs";

function writeDecisionFixture() {
  const root = tempDir("decision-extractor");
  const archDir = join(root, ".understand-arch", "sample");
  mkdirSync(join(archDir, "change-requests", "CR-001"), { recursive: true });
  mkdirSync(join(archDir, "rules", "constraints"), { recursive: true });
  writeFileSync(join(archDir, "change-requests", "CR-001", "CR.md"), [
    "# CR-001 登录入口改造",
    "## 4 详细设计",
    "### 4.6 约束符合性表",
    "| id | title | constraint | basis | violation_check | category |",
    "| --- | --- | --- | --- | --- | --- |",
    "| CON-101 | 登录入口走认证模块 | 登录入口必须通过 Auth Module,不得绕过认证模块。 | src/auth.ts:1 | 评审时检查登录入口调用链 | dependency-rule |",
    "## 5 替代方案对比",
    "直接绕过 Auth Module 的方案被否决。",
    "## 6 风险与缓解",
    "绕过认证模块会造成权限风险。",
    "## 11 关联",
    "ADR-001"
  ].join("\n"), "utf-8");
  return { root, archDir };
}

describe("decision-extractor-runner", () => {
  it("fixture CR.md 生成 proposed constraint 且 source=cr-derived", () => {
    const { root, archDir } = writeDecisionFixture();
    const result = runDecisionExtractor({ archDir, projectRoot: root, writeConstraints: false });

    expect(result.proposed_count).toBe(1);
    expect(result.constraints[0]).toMatchObject({
      id: "CON-101",
      status: "proposed",
      source: "cr-derived",
      evidence_level: "observed",
    });
    const mine = JSON.parse(readFileSync(join(archDir, "intermediate", "constraint-mine.json"), "utf-8"));
    expect(mine.constraints[0].constraint).toContain("登录入口必须通过 Auth Module");
  });

  it("constraint-check 对 cr-derived + confirmed 精确失败", () => {
    const { root, archDir } = writeDecisionFixture();
    writeFileSync(join(archDir, "rules", "constraints", "risk-register.md"), [
      "# 约束:risk-register",
      "",
      "### CON-102:错误确认",
      "- 约束:CR 回流不得自确认。",
      "- 依据:change-requests/CR-001/CR.md",
      "- 证据等级:confirmed",
      "- 证据:src/auth.ts:1",
      "- 违反检测:评审时检查",
      "- 状态:confirmed",
      "- 来源:cr-derived"
    ].join("\n"), "utf-8");

    expect(() => execFileSync("node", ["engine/arch/constraint-check.mjs", root], {
      cwd: process.cwd(),
      env: { ...process.env, ARCH_PROJECT_ROOT: archDir },
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    })).toThrow();
  });
});
