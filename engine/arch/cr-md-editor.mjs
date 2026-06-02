#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CR_HEADINGS = [
  "## 1. 背景",
  "## 2. 现状",
  "## 3. 方案概述",
  "## 4. 详细设计",
  "## 5. 替代方案",
  "## 6. NFR",
  "## 7. 风险",
  "## 8. 改动清单",
  "## 9. 实施步骤",
  "## 10. 回滚",
  "## 11. 测试",
  "## 12. 待定",
  "## 13. 关联",
  "## 14. Review",
];

export const DETAIL_SUBSECTIONS = [
  "### 4.1 能力变化",
  "### 4.2 组件与边界",
  "### 4.3 接口与契约",
  "### 4.4 数据与状态",
  "### 4.5 流程与失败模式",
  "### 4.6 约束符合性",
  "### 4.7 接口质量与复杂度隐藏",
  "### 4.8 观测与运维",
];

export const OPTION_HEADINGS = [
  "# 候选方案对比:",
  "## 0. 设计问题",
  "## 1. 方案 A:最小变更方案",
  "## 2. 方案 B:架构改良方案",
  "## 3. 方案 C:长期演进方案",
  "## 4. 横向对比",
  "## 5. 推荐意见",
  "## 6. 人类决策",
];

const PLACEHOLDER_PATTERNS = [
  /TODO/i,
  /TBD/i,
  /placeholder/i,
  /lorem ipsum/i,
  /待补充/,
  /稍后补充/,
  /\.\.\./,
];

function skeleton() {
  return `---\ncr_id: CR-NEW\ntitle: Untitled\nstatus: draft\n---\n\n${CR_HEADINGS.map((h) => `${h}\n\n`).join("\n")}`;
}

function readText(path, fallback = "") {
  return existsSync(path) ? readFileSync(path, "utf-8") : fallback;
}

function writeText(path, text) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text, "utf-8");
}

function sectionBounds(text, headings, heading) {
  const start = text.indexOf(heading);
  if (start < 0) return null;
  const next = headings
    .map((h) => text.indexOf(h, start + heading.length))
    .filter((i) => i > start)
    .sort((a, b) => a - b)[0] ?? text.length;
  return { start, next };
}

function getSection(text, headings, heading) {
  const bounds = sectionBounds(text, headings, heading);
  if (!bounds) return "";
  return text.slice(bounds.start + heading.length, bounds.next);
}

function writeSection(path, section, content) {
  const text = readText(path, skeleton());
  const heading = CR_HEADINGS.find((h) => h.toLowerCase().includes(section.toLowerCase()) || h.startsWith(`## ${section}.`));
  if (!heading) throw new Error(`Unknown CR section: ${section}`);
  const bounds = sectionBounds(text, CR_HEADINGS, heading);
  if (!bounds) throw new Error(`CR.md missing heading: ${heading}`);
  const updated = `${text.slice(0, bounds.start + heading.length)}\n\n${content.trim()}\n\n${text.slice(bounds.next).replace(/^\s+/, "")}`;
  writeText(path, updated);
}

function findMissingInOrder(text, required) {
  let last = -1;
  const missing = [];
  for (const heading of required) {
    const idx = heading.endsWith(":")
      ? text.indexOf(heading)
      : text.indexOf(heading);
    if (idx < 0) missing.push(heading);
    else if (idx < last) missing.push(`${heading} (out of order)`);
    else last = idx;
  }
  return missing;
}

function hasPlaceholders(text) {
  return PLACEHOLDER_PATTERNS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

function countRealLines(text) {
  return text.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
}

export function validateCr(file) {
  const path = resolve(file);
  const text = readText(path);
  const findings = [];
  if (!text) findings.push({ severity: "critical", message: "CR.md does not exist or is empty" });

  const missingHeadings = findMissingInOrder(text, CR_HEADINGS);
  for (const heading of missingHeadings) findings.push({ severity: "critical", message: `Missing or unordered heading: ${heading}` });

  const headingMatches = [...text.matchAll(/^##\s+\d+\.\s+.+$/gm)].map((m) => m[0].trim());
  const unexpected = headingMatches.filter((h) => !CR_HEADINGS.includes(h));
  if (unexpected.length) findings.push({ severity: "critical", message: `Unexpected CR heading(s): ${unexpected.join(", ")}` });

  if (!missingHeadings.length) {
    for (const heading of DETAIL_SUBSECTIONS) {
      if (!getSection(text, CR_HEADINGS, "## 4. 详细设计").includes(heading)) {
        findings.push({ severity: "high", message: `Section 4 missing subsection: ${heading}` });
      }
    }
    const section9 = getSection(text, CR_HEADINGS, "## 9. 实施步骤");
    if (!/###\s+Slice\s+\d+:/i.test(section9)) findings.push({ severity: "high", message: "Section 9 must contain vertical slices using `### Slice N:`" });
    for (const label of ["目标:", "范围:", "验收:", "回滚:", "人机边界:", "依赖:"]) {
      if (!section9.includes(label)) findings.push({ severity: "high", message: `Section 9 slice missing field: ${label}` });
    }
    if (!/(AFK|HITL)/.test(section9)) findings.push({ severity: "high", message: "Section 9 must mark every slice with AFK or HITL" });
    if (!/CR-OPTION\.md/.test(getSection(text, CR_HEADINGS, "## 13. 关联"))) {
      findings.push({ severity: "medium", message: "Section 13 should link CR-OPTION.md" });
    }
  }

  const placeholders = hasPlaceholders(text);
  if (placeholders.length) findings.push({ severity: "high", message: `Placeholder text found: ${placeholders.join(", ")}` });

  const ok = findings.every((finding) => !["critical", "high"].includes(finding.severity));
  return { ok, file: path, sections_found: headingMatches.filter((h) => CR_HEADINGS.includes(h)).length, findings };
}

export function validateOption(file) {
  const path = resolve(file);
  const text = readText(path);
  const findings = [];
  if (!text) findings.push({ severity: "critical", message: "CR-OPTION.md does not exist or is empty" });

  const missing = findMissingInOrder(text, OPTION_HEADINGS);
  for (const heading of missing) findings.push({ severity: "critical", message: `Missing or unordered option heading: ${heading}` });

  for (const label of ["### 核心思路", "### 怎么改", "### 影响范围", "### 优点", "### 代价", "### 主要风险", "### 适合在什么情况下选", "### 不适合在什么情况下选"]) {
    const count = (text.match(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length;
    if (count < 3) findings.push({ severity: "high", message: `Each A/B/C option must contain subsection: ${label}` });
  }
  if (!/\|\s*维度\s*\|\s*方案 A\s*\|\s*方案 B\s*\|\s*方案 C\s*\|/.test(text)) findings.push({ severity: "high", message: "Missing横向对比 table for A/B/C" });
  if (!/- \[ \] 采用方案 A/.test(text) || !/- \[ \] 采用方案 B/.test(text) || !/- \[ \] 采用方案 C/.test(text)) {
    findings.push({ severity: "high", message: "Human decision checklist must include options A, B, and C" });
  }
  if (!/推荐[:：]\s*方案\s*[ABC]/.test(text)) findings.push({ severity: "high", message: "Recommendation must choose 方案 A/B/C" });

  const placeholders = hasPlaceholders(text);
  if (placeholders.length) findings.push({ severity: "high", message: `Placeholder text found: ${placeholders.join(", ")}` });
  if (countRealLines(text) < 80) findings.push({ severity: "medium", message: "CR-OPTION.md is too thin to support design choice" });

  const ok = findings.every((finding) => !["critical", "high"].includes(finding.severity));
  return { ok, file: path, findings };
}

function parseFileArg(args) {
  const idx = args.findIndex((arg) => arg === "--file" || arg === "-f");
  return idx >= 0 ? args[idx + 1] : args[1] || args[0];
}

function printJson(value, exitCode) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
  process.exit(exitCode);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [command, ...args] = process.argv.slice(2);

  if (command === "validate") {
    const result = validateCr(parseFileArg(args));
    printJson(result, result.ok ? 0 : 1);
  }

  if (command === "validate-option") {
    const result = validateOption(parseFileArg(args));
    printJson(result, result.ok ? 0 : 1);
  }

  if (command === "create" || command === "init") {
    const crPath = resolve(parseFileArg(args));
    if (!existsSync(crPath)) writeText(crPath, skeleton());
    console.log(crPath);
    process.exit(0);
  }

  const crPath = resolve(command || "CR.md");
  const section = args[0];
  const content = args.slice(1).join(" ");

  if (!section) {
    if (!existsSync(crPath)) writeText(crPath, skeleton());
    console.log(crPath);
    process.exit(0);
  }

  writeSection(crPath, section, content);
  console.log(crPath);
}
