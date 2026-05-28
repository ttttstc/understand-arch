#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const path = resolve(process.argv[2] || "CR.md");
const section = process.argv[3];
const content = process.argv.slice(4).join(" ");

const headings = [
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

function skeleton() {
  return `---\ncr_id: CR-NEW\ntitle: Untitled\nstatus: draft\n---\n\n${headings.map((h) => `${h}\n\n`).join("\n")}`;
}

if (!section) {
  mkdirSync(dirname(path), { recursive: true });
  if (!existsSync(path)) writeFileSync(path, skeleton(), "utf-8");
  console.log(path);
  process.exit(0);
}

const text = existsSync(path) ? readFileSync(path, "utf-8") : skeleton();
const heading = headings.find((h) => h.toLowerCase().includes(section.toLowerCase()) || h.startsWith(`## ${section}.`));
if (!heading) throw new Error(`Unknown CR section: ${section}`);

const start = text.indexOf(heading);
if (start < 0) throw new Error(`CR.md missing heading: ${heading}`);
const next = headings.map((h) => text.indexOf(h, start + heading.length)).filter((i) => i > start).sort((a, b) => a - b)[0] ?? text.length;
const updated = `${text.slice(0, start + heading.length)}\n\n${content.trim()}\n\n${text.slice(next).replace(/^\s+/, "")}`;
writeFileSync(path, updated, "utf-8");
console.log(path);
