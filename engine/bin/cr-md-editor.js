#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { parseArgs, writeJson } = require("./_lib");

const SECTIONS = [
  "背景与目标",
  "当前架构事实",
  "需求解读与验收标准",
  "影响面总览",
  "仓库与组件改动点",
  "接口与事件契约",
  "数据模型与迁移策略",
  "运行时、部署与配置",
  "方案设计",
  "备选方案与取舍",
  "风险、技术债与缓解",
  "发布、回滚与观测",
  "任务拆解与验收计划",
  "Review"
];

const ACTOR_RULES = {
  "arch-frame": new Set([1]),
  "arch-impact-analyzer": new Set([2, 4, 5, 6, 7, 8, 11]),
  "arch-solution-designer": new Set([3, 9, 10, 12, 13]),
  "arch-review": new Set([14]),
  "arch-design": new Set(Array.from({ length: 14 }, (_, index) => index + 1))
};

function sectionHeading(index) {
  return `## ${index + 1}. ${SECTIONS[index]}`;
}

function encodeYamlScalar(value) {
  if (Array.isArray(value)) return `[${value.map(encodeYamlScalar).join(", ")}]`;
  if (value && typeof value === "object") return JSON.stringify(value);
  return JSON.stringify(value ?? "");
}

function createSkeleton(frontmatter) {
  const normalized = {
    introduced_adrs: [],
    traceability: [],
    ...frontmatter,
    sections: SECTIONS
  };
  const yaml = Object.entries(normalized)
    .map(([key, value]) => `${key}: ${encodeYamlScalar(value)}`)
    .join("\n");
  return `---\n${yaml}\n---\n\n${SECTIONS.map((_, index) => `${sectionHeading(index)}\n\n待补充。\n`).join("\n")}`;
}

function assertSectionWriteAllowed(sectionNumber, actor) {
  const allowed = ACTOR_RULES[actor];
  if (!allowed) throw new Error(`未知 actor: ${actor}`);
  if (!allowed.has(sectionNumber)) {
    throw new Error(`${actor} 无权写 CR.md 第 ${sectionNumber} 段`);
  }
}

function readCr(file) {
  return fs.readFileSync(file, "utf8");
}

function extractFrontmatter(markdown) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error("CR.md 缺少 YAML frontmatter");
  return match[1];
}

function parseSections(markdown) {
  const sections = [];
  for (let index = 0; index < SECTIONS.length; index += 1) {
    const current = sectionHeading(index);
    const next = index + 1 < SECTIONS.length ? sectionHeading(index + 1) : null;
    const start = markdown.indexOf(current);
    if (start === -1) {
      sections.push({ index: index + 1, title: SECTIONS[index], found: false, content: "" });
      continue;
    }
    const contentStart = start + current.length;
    const end = next ? markdown.indexOf(next, contentStart) : markdown.length;
    sections.push({
      index: index + 1,
      title: SECTIONS[index],
      found: true,
      content: markdown.slice(contentStart, end === -1 ? markdown.length : end).trim()
    });
  }
  return sections;
}

function replaceSection(markdown, sectionNumber, content, append = false) {
  const index = sectionNumber - 1;
  const heading = sectionHeading(index);
  const nextHeading = sectionNumber < SECTIONS.length ? sectionHeading(index + 1) : null;
  const start = markdown.indexOf(heading);
  if (start === -1) throw new Error(`CR.md 缺少第 ${sectionNumber} 段: ${heading}`);
  const contentStart = start + heading.length;
  const end = nextHeading ? markdown.indexOf(nextHeading, contentStart) : markdown.length;
  const realEnd = end === -1 ? markdown.length : end;
  const oldContent = markdown.slice(contentStart, realEnd).trim();
  const nextContent = append && oldContent && oldContent !== "待补充。" ? `${oldContent}\n\n${content.trim()}` : content.trim();
  return `${markdown.slice(0, contentStart)}\n\n${nextContent}\n\n${markdown.slice(realEnd).replace(/^\s+/, "")}`;
}

function validateCr(markdown) {
  const findings = [];
  try {
    extractFrontmatter(markdown);
  } catch (error) {
    findings.push(error.message);
  }
  const sections = parseSections(markdown);
  for (const section of sections) {
    if (!section.found) findings.push(`缺少第 ${section.index} 段: ${section.title}`);
  }
  return { ok: findings.length === 0, findings, sections_found: sections.filter((section) => section.found).length };
}

function readContentArg(args) {
  if (args.content) return args.content;
  if (args["content-file"]) return fs.readFileSync(args["content-file"], "utf8");
  throw new Error("需要 --content 或 --content-file");
}

function main() {
  const args = parseArgs(process.argv);
  const command = args._[0];
  if (!command || command === "sections") {
    writeJson({ sections: SECTIONS });
    return;
  }

  if (command === "create") {
    const file = args.file;
    if (!file) throw new Error("create 需要 --file");
    const frontmatter = {
      id: args.id,
      title: args.title || "",
      status: args.status || "draft",
      created_at: args["created-at"] || new Date().toISOString(),
      project: args.project || "",
      impact_node_ids: args["impact-node-ids"] ? String(args["impact-node-ids"]).split(",").filter(Boolean) : []
    };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, createSkeleton(frontmatter));
    writeJson({ status: "ok", file, sections: SECTIONS.length });
    return;
  }

  const file = args.file;
  if (!file) throw new Error(`${command} 需要 --file`);
  const markdown = readCr(file);

  if (command === "validate") {
    const result = validateCr(markdown);
    writeJson(result);
    if (!result.ok) process.exitCode = 1;
    return;
  }

  if (command === "set-section" || command === "append-review") {
    const actor = args.actor || (command === "append-review" ? "arch-review" : "arch-design");
    const sectionNumber = command === "append-review" ? 14 : Number(args.section);
    assertSectionWriteAllowed(sectionNumber, actor);
    const content = readContentArg(args);
    const updated = replaceSection(markdown, sectionNumber, content, command === "append-review");
    fs.writeFileSync(file, updated);
    writeJson({ status: "ok", file, actor, section: sectionNumber });
    return;
  }

  throw new Error(`未知命令: ${command}`);
}

module.exports = {
  SECTIONS,
  createSkeleton,
  assertSectionWriteAllowed,
  parseSections,
  replaceSection,
  validateCr
};

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

