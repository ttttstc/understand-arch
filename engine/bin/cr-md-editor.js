#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { parseArgs, writeJson } = require("./_lib");

const SECTIONS = [
  "背景与目标",
  "现状分析",
  "方案概述",
  "详细设计",
  "替代方案对比",
  "NFR 影响",
  "风险与缓解",
  "改动清单",
  "实施步骤 + 灰度策略",
  "回滚预案",
  "测试策略",
  "待定问题(known_unknowns)",
  "关联",
  "Review(arch-review 写入,append-only)"
];

const ACTOR_RULES = {
  "arch-frame": new Set([1]),
  "arch-impact-analyzer": new Set([8]),
  "arch-solution-designer": new Set([1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13]),
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
    cr_id: frontmatter.cr_id || frontmatter.id || "CR-TODO",
    title: frontmatter.title || "",
    status: frontmatter.status || "draft",
    owner: frontmatter.owner || "",
    created: frontmatter.created || frontmatter.created_at || new Date().toISOString().slice(0, 10),
    prd_link: frontmatter.prd_link || "",
    affects_repos: frontmatter.affects_repos || (frontmatter.project ? [frontmatter.project] : []),
    impact: frontmatter.impact || {
      added_nodes: [],
      modified_nodes: frontmatter.impact_node_ids || [],
      removed_nodes: [],
      estimated_files_changed: 0
    }
  };
  const yaml = Object.entries(normalized)
    .map(([key, value]) => `${key}: ${encodeYamlScalar(value)}`)
    .join("\n");
  return `---\n${yaml}\n---\n\n# ${normalized.cr_id} — ${normalized.title}\n\n${SECTIONS.map((_, index) => `${sectionHeading(index)}\n\n${sectionPlaceholder(index + 1)}\n`).join("\n")}`;
}

function sectionPlaceholder(sectionNumber) {
  const placeholders = {
    1: "- 业务背景:\n- 设计目标:\n- 非目标:",
    2: "- 当前架构子集:\n- 现状痛点:\n- 已有约束:",
    3: "- 核心思路:\n- 关键决策点:\n- 与替代方案的对比简表:",
    4: "### 4.1 数据模型变化\n- 待补充。\n\n### 4.2 接口变化(REST/gRPC/event)\n- 待补充。\n\n### 4.3 组件变化\n- 待补充。\n\n### 4.4 部署变化\n- 待补充。\n\n### 4.5 关键流程时序\n```mermaid\nsequenceDiagram\n  participant A as 调用方\n  participant B as 被调用方\n  A->>B: 待补充\n```",
    5: "- 替代方案:\n- 对比维度:实现复杂度 / 性能 / 可维护性 / 成本 / 风险",
    6: "- 性能:\n- 可用性:\n- 安全:\n- 合规:\n- 可观测性:",
    7: "- 主要风险:\n- 缓解措施:\n- 升级到 graph.risks[] 的候选:",
    8: "### 8.1 跨仓总览\n| 仓 | 新增文件 | 修改文件 | 删除文件 | 新增接口 | 修改接口 |\n|---|---:|---:|---:|---:|---:|\n\n### 8.2 仓级改动\n- 待补充。\n\n### 8.4 依赖关系\n- 待补充。",
    9: "- 拆分子任务:\n- 灰度策略:\n- 验证点:",
    10: "- 触发条件:\n- 回滚步骤:\n- 数据回滚:",
    11: "- 单元测试:\n- 集成测试:\n- 性能测试:\n- 验收标准:",
    12: "- PRD 未澄清的设计点:\n- 待 owner 决策的细节:\n- graph.known_unknowns[] 候选:",
    13: "- 关联 PRD 路径:\n- 关联上游 ADR:\n- 关联下游影响 CR:\n- 关联仓:",
    14: "- 尚未评审。"
  };
  return placeholders[sectionNumber] || "待补充。";
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

function updateFrontmatterBlock(markdown, partial) {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) throw new Error("CR.md 缺少 YAML frontmatter");
  const existing = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx > 0) existing[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  const merged = { ...existing, ...partial };
  const yaml = Object.entries(merged).map(([key, value]) => `${key}: ${typeof value === "string" ? value : encodeYamlScalar(value)}`).join("\n");
  return `---\n${yaml}\n---\n${markdown.slice(match[0].length)}`;
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
      cr_id: args["cr-id"] || args.id,
      title: args.title || "",
      status: args.status || "draft",
      owner: args.owner || "",
      created: args.created || args["created-at"] || new Date().toISOString().slice(0, 10),
      prd_link: args["prd-link"] || "",
      project: args.project || "",
      affects_repos: args["affects-repos"] ? String(args["affects-repos"]).split(",").filter(Boolean) : (args.project ? [args.project] : []),
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

  if (command === "update-frontmatter") {
    const actor = args.actor || "arch-design";
    if (actor !== "arch-impact-analyzer" && actor !== "arch-frame" && actor !== "arch-design") {
      throw new Error(`${actor} 无权更新 CR.md frontmatter`);
    }
    const partial = args.json ? JSON.parse(args.json) : JSON.parse(readContentArg(args));
    const updated = updateFrontmatterBlock(markdown, partial);
    fs.writeFileSync(file, updated);
    writeJson({ status: "ok", file, actor, frontmatter_keys: Object.keys(partial) });
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
  updateFrontmatterBlock,
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
