#!/usr/bin/env node
"use strict";

const fs = require("fs");
const { parseArgs, writeJson } = require("./_lib");
const { parseSections, validateCr } = require("./cr-md-editor");

function reviewDesign(crFile) {
  const markdown = fs.readFileSync(crFile, "utf8");
  const base = validateCr(markdown);
  const sections = parseSections(markdown);
  const findings = [...base.findings];
  for (const section of sections) {
    if (!section.content || section.content === "待补充。") {
      findings.push(`第 ${section.index} 段仍为待补充:${section.title}`);
    }
  }
  const mustMention = [
    ["影响面", /影响节点|impact|影响面/i],
    ["风险", /风险|Rules findings|Known unknowns/i],
    ["发布回滚", /发布|回滚|rollback/i]
  ];
  for (const [label, pattern] of mustMention) {
    if (!pattern.test(markdown)) findings.push(`缺少${label}相关内容`);
  }
  const blocker = findings.filter((finding) => /缺少|待补充/.test(finding));
  const score = Math.max(0, 1 - findings.length * 0.08);
  return {
    mode: "design",
    overall_score: Number(score.toFixed(2)),
    verdict: blocker.length ? "needs_revision" : score >= 0.85 ? "pass" : "needs_revision",
    findings,
    blocker_count: blocker.length
  };
}

function main() {
  const args = parseArgs(process.argv);
  const mode = args.mode || "design";
  if (mode !== "design") throw new Error("senior-review currently supports --mode design");
  const cr = args.cr || args.file;
  if (!cr) throw new Error("senior-review needs --cr CR.md");
  const result = reviewDesign(cr);
  if (args.output) fs.writeFileSync(args.output, `${JSON.stringify(result, null, 2)}\n`);
  writeJson(result);
  if (result.verdict !== "pass") process.exitCode = args["allow-needs-revision"] ? 0 : 1;
}

module.exports = { reviewDesign };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

