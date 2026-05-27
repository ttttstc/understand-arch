#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeJson } = require("./_lib");
const { WIKI_PAGES } = require("./render-wiki");

function collectNodeIds(workspace) {
  const cross = readJson(path.join(workspace, "specs", "cross-repo.json"));
  const ids = new Set();
  for (const repo of cross.repos ?? []) {
    const graphPath = path.join(workspace, "specs", "repos", repo.id, "knowledge-graph.json");
    if (!fs.existsSync(graphPath)) continue;
    const graph = readJson(graphPath);
    for (const node of graph.nodes ?? []) ids.add(node.id);
  }
  return ids;
}

function reviewWiki(workspace, mode = "lite") {
  const wikiDir = path.join(workspace, "wiki");
  const findings = [];
  const expected = ["README.md", ...WIKI_PAGES.map(([file]) => file)];
  for (const file of expected) {
    if (!fs.existsSync(path.join(wikiDir, file))) findings.push(`缺少 wiki 页面:${file}`);
  }
  const nodeIds = collectNodeIds(workspace);
  const allText = expected
    .filter((file) => fs.existsSync(path.join(wikiDir, file)))
    .map((file) => fs.readFileSync(path.join(wikiDir, file), "utf8"))
    .join("\n");
  const referenced = [...nodeIds].filter((id) => allText.includes(id));
  if (nodeIds.size && referenced.length === 0) findings.push("wiki 未引用任何 graph node id");

  const interfaces = path.join(wikiDir, "03-interfaces.md");
  if (!fs.existsSync(interfaces) || !fs.readFileSync(interfaces, "utf8").includes("已知局限")) {
    findings.push("03-interfaces.md 缺少已知局限");
  }
  if (mode === "full") {
    const rulesPage = path.join(wikiDir, "12-rules.md");
    if (!fs.existsSync(rulesPage) || !/rules\/|暂无 rules/.test(fs.readFileSync(rulesPage, "utf8"))) {
      findings.push("12-rules.md 未呈现 rules 摘要");
    }
    const diagrams = path.join(wikiDir, "14-diagrams.md");
    if (!fs.existsSync(diagrams) || !fs.readFileSync(diagrams, "utf8").includes("```mermaid")) {
      findings.push("14-diagrams.md 缺少 Mermaid 占位");
    }
  }

  const score = Math.max(0, 1 - findings.length * 0.12);
  return {
    mode,
    overall_score: Number(score.toFixed(2)),
    verdict: findings.length ? "needs_revision" : "pass",
    pages_expected: expected.length,
    graph_nodes: nodeIds.size,
    referenced_nodes: referenced.length,
    findings
  };
}

function main() {
  const args = parseArgs(process.argv);
  const workspace = path.resolve(args.workspace || args._[0] || process.cwd());
  const result = reviewWiki(workspace, args.mode || "lite");
  if (args.output) fs.writeFileSync(args.output, `${JSON.stringify(result, null, 2)}\n`);
  writeJson(result);
  if (result.verdict !== "pass") process.exitCode = args["allow-needs-revision"] ? 0 : 1;
}

module.exports = { reviewWiki };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

