#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeJson } = require("./_lib");

const WIKI_PAGES = [
  ["01-overview.md", "Overview"],
  ["02-components.md", "Components"],
  ["03-interfaces.md", "Interfaces"],
  ["04-data-models.md", "Data Models"],
  ["05-capabilities.md", "Capabilities"],
  ["06-quality.md", "Quality"],
  ["07-risks-and-debt.md", "Risks And Debt"],
  ["08-deployments.md", "Deployments"],
  ["09-flows-and-scenarios.md", "Flows And Scenarios"],
  ["10-decisions.md", "Decisions"],
  ["11-changes.md", "Changes"],
  ["12-rules.md", "Rules"],
  ["13-pending-changes.md", "Pending Changes"],
  ["14-diagrams.md", "Diagrams"]
];

function loadWorkspace(workspace) {
  const specs = path.join(workspace, "specs");
  const crossRepo = readJson(path.join(specs, "cross-repo.json"));
  const repoGraphs = [];
  for (const repo of crossRepo.repos ?? []) {
    const graphPath = path.join(specs, "repos", repo.id, "knowledge-graph.json");
    if (fs.existsSync(graphPath)) repoGraphs.push(readJson(graphPath));
  }
  return { crossRepo, repoGraphs };
}

function allNodes(repoGraphs) {
  return repoGraphs.flatMap((graph) => graph.nodes ?? []);
}

function nodeList(nodes, limit = 50) {
  if (!nodes.length) return "暂无。";
  return nodes.slice(0, limit).map((node) => `- \`${node.id}\` ${node.name}: ${node.summary}`).join("\n");
}

function evidenceLine(node) {
  const evidence = node.evidence_refs?.[0];
  if (!evidence) return `证据:${node.id}`;
  return `证据:${node.id} -> ${evidence.repo_id}/${evidence.file}`;
}

function writePage(wikiDir, file, title, body) {
  fs.writeFileSync(path.join(wikiDir, file), `# ${title}\n\n${body.trim()}\n`);
}

function renderRules(workspace) {
  const rulesDir = path.join(workspace, "rules");
  if (!fs.existsSync(rulesDir)) return "暂无 rules/*.md。";
  const files = fs.readdirSync(rulesDir).filter((name) => name.endsWith(".md")).sort();
  if (!files.length) return "暂无 rules/*.md。";
  return files.map((name) => `- \`rules/${name}\``).join("\n");
}

function renderWiki(workspace) {
  const { crossRepo, repoGraphs } = loadWorkspace(workspace);
  const nodes = allNodes(repoGraphs);
  const wikiDir = path.join(workspace, "wiki");
  fs.mkdirSync(wikiDir, { recursive: true });

  const byType = (types) => nodes.filter((node) => types.includes(node.type));
  const files = byType(["file", "document", "module", "service"]);
  const interfaces = byType(["endpoint", "schema"]);
  const data = byType(["table", "schema", "entity"]);
  const deployments = byType(["resource", "pipeline", "config"]);
  const flows = byType(["flow", "step"]);
  const evidence = nodes.slice(0, 10).map(evidenceLine).join("\n") || "暂无 evidence。";

  const index = WIKI_PAGES.map(([file, title]) => `- [${title}](./${file})`).join("\n");
  fs.writeFileSync(path.join(wikiDir, "README.md"), `# ${crossRepo.project?.name ?? path.basename(workspace)} 架构 wiki\n\n${index}\n`);

  writePage(wikiDir, "01-overview.md", "01 Overview", [
    `项目:${crossRepo.project?.name ?? path.basename(workspace)}`,
    `仓库数:${crossRepo.repos?.length ?? 0}`,
    `节点数:${nodes.length}`,
    "",
    "## 证据",
    evidence
  ].join("\n"));

  writePage(wikiDir, "02-components.md", "02 Components", nodeList(files));
  writePage(wikiDir, "03-interfaces.md", "03 Interfaces", `${nodeList(interfaces)}\n\n## 已知局限\n\n本页只呈现 graph 中已识别的 endpoint/schema 节点;缺失项必须回写 graph 或 known_unknowns。`);
  writePage(wikiDir, "04-data-models.md", "04 Data Models", nodeList(data));
  writePage(wikiDir, "05-capabilities.md", "05 Capabilities", nodeList(crossRepo.capabilities ?? []));
  writePage(wikiDir, "06-quality.md", "06 Quality", nodeList(crossRepo.quality_attributes ?? []));
  writePage(wikiDir, "07-risks-and-debt.md", "07 Risks And Debt", [
    "## Risks",
    nodeList(crossRepo.risks ?? []),
    "",
    "## Technical Debt",
    nodeList(crossRepo.technical_debt ?? [])
  ].join("\n"));
  writePage(wikiDir, "08-deployments.md", "08 Deployments", nodeList(deployments));
  writePage(wikiDir, "09-flows-and-scenarios.md", "09 Flows And Scenarios", nodeList(flows));
  writePage(wikiDir, "10-decisions.md", "10 Decisions", nodeList(crossRepo.architecture_decisions ?? []));
  writePage(wikiDir, "11-changes.md", "11 Changes", nodeList(crossRepo.change_requests ?? []));
  writePage(wikiDir, "12-rules.md", "12 Rules", renderRules(workspace));
  writePage(wikiDir, "13-pending-changes.md", "13 Pending Changes", nodeList((crossRepo.change_requests ?? []).filter((cr) => ["draft", "in_review", "ready"].includes(cr.status))));
  writePage(wikiDir, "14-diagrams.md", "14 Diagrams", [
    "v2.0 保留 4+1 / C4 视图占位,图片生成留给 v2.1。",
    "",
    "## Mermaid 占位",
    "",
    "```mermaid",
    "flowchart LR",
    ...((crossRepo.repos ?? []).map((repo) => `  ${repo.id}[${repo.id}]`)),
    "```"
  ].join("\n"));

  return { wikiDir, pages: WIKI_PAGES.length + 1 };
}

function main() {
  const args = parseArgs(process.argv);
  const workspace = path.resolve(args.workspace || args._[0] || process.cwd());
  const result = renderWiki(workspace);
  writeJson({ status: "ok", ...result });
}

module.exports = { WIKI_PAGES, renderWiki };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

