#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeJson } = require("./_lib");
const { replaceSection } = require("./cr-md-editor");

function readTextArg(args) {
  if (args.text) return args.text;
  if (args.file) return fs.readFileSync(args.file, "utf8");
  return "";
}

function tokenize(text) {
  return [...new Set(String(text).toLowerCase().match(/[a-z0-9_\-/]{3,}|[\u4e00-\u9fa5]{2,}/g) ?? [])];
}

function loadGraphs(workspace) {
  const specs = path.join(workspace, "specs");
  const crossRepo = readJson(path.join(specs, "cross-repo.json"));
  const repoGraphs = [];
  for (const repo of crossRepo.repos ?? []) {
    const graphPath = path.join(specs, "repos", repo.id, "knowledge-graph.json");
    if (fs.existsSync(graphPath)) repoGraphs.push(readJson(graphPath));
  }
  return { crossRepo, repoGraphs };
}

function scoreNode(node, tokens) {
  const haystack = [
    node.id,
    node.name,
    node.summary,
    node.filePath,
    ...(node.tags ?? [])
  ].join(" ").toLowerCase();
  return tokens.filter((token) => haystack.includes(token)).length;
}

function analyzeRules(workspace, text) {
  const rulesDir = path.join(workspace, "rules");
  if (!fs.existsSync(rulesDir)) return [];
  const tokens = tokenize(text);
  const findings = [];
  for (const name of fs.readdirSync(rulesDir).filter((file) => file.endsWith(".md")).sort()) {
    const rel = `rules/${name}`;
    const body = fs.readFileSync(path.join(rulesDir, name), "utf8");
    const ruleTokens = tokenize(body);
    const overlap = tokens.filter((token) => ruleTokens.includes(token));
    if (overlap.length) {
      findings.push({
        rule_path: rel,
        severity: "info",
        statement: `需求文本命中规则关键词:${overlap.slice(0, 8).join(", ")}`,
        confidence: "medium"
      });
    }
  }
  return findings;
}

function analyzeImpact(workspace, text) {
  const { crossRepo, repoGraphs } = loadGraphs(workspace);
  const tokens = tokenize(text);
  const scored = repoGraphs.flatMap((graph) => (graph.nodes ?? []).map((node) => ({
    node,
    score: scoreNode(node, tokens)
  }))).filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id));

  const impactedNodes = scored.slice(0, 20).map((entry) => ({
    id: entry.node.id,
    name: entry.node.name,
    type: entry.node.type,
    repo_id: entry.node.repo_id,
    score: entry.score,
    evidence_refs: entry.node.evidence_refs ?? []
  }));
  const impactIds = new Set(impactedNodes.map((node) => node.id));
  const relatedCrossEdges = (crossRepo.cross_edges ?? []).filter((edge) => impactIds.has(edge.source) || impactIds.has(edge.target));
  const rulesFindings = analyzeRules(workspace, text);

  return {
    version: "2.0",
    analyzed_at: new Date().toISOString(),
    impact_node_ids: impactedNodes.map((node) => node.id),
    impacted_nodes: impactedNodes,
    related_cross_edges: relatedCrossEdges,
    rules_findings: rulesFindings,
    traceability: impactedNodes.map((node) => ({
      from: { type: "requirement", id: "REQ-001" },
      to: { type: "graph_node", id: node.id },
      relation: "may_affect",
      confidence: node.score > 1 ? "high" : "medium"
    })),
    known_unknowns: impactedNodes.length ? [] : [
      {
        id: "KU-impact-001",
        statement: "需求文本未命中现有 graph 节点,需要人工确认影响面。",
        confidence: "high"
      }
    ]
  };
}

function sectionContent(result, section) {
  if (section === 4) {
    return [
      "## 影响节点",
      result.impacted_nodes.length ? result.impacted_nodes.map((node) => `- \`${node.id}\` ${node.name} (${node.type}, score=${node.score})`).join("\n") : "暂无自动命中节点。",
      "",
      "## 跨仓关联",
      result.related_cross_edges.length ? result.related_cross_edges.map((edge) => `- \`${edge.source}\` -> \`${edge.target}\` (${edge.type})`).join("\n") : "暂无自动命中的跨仓关联。"
    ].join("\n");
  }
  if (section === 5) {
    const byRepo = new Map();
    for (const node of result.impacted_nodes) {
      if (!byRepo.has(node.repo_id)) byRepo.set(node.repo_id, []);
      byRepo.get(node.repo_id).push(node);
    }
    return byRepo.size ? [...byRepo.entries()].map(([repo, nodes]) => `## ${repo}\n${nodes.map((node) => `- \`${node.id}\` ${node.name}`).join("\n")}`).join("\n\n") : "暂无自动命中仓库或组件。";
  }
  if (section === 11) {
    return [
      "## Rules findings",
      result.rules_findings.length ? result.rules_findings.map((finding) => `- \`${finding.rule_path}\` ${finding.statement}`).join("\n") : "未命中 rules/*.md 关键词。",
      "",
      "## Known unknowns",
      result.known_unknowns.length ? result.known_unknowns.map((item) => `- ${item.id}: ${item.statement}`).join("\n") : "暂无。"
    ].join("\n");
  }
  throw new Error(`unsupported impact section ${section}`);
}

function patchCrossRepo(workspace, crId, crDir, result) {
  const crossPath = path.join(workspace, "specs", "cross-repo.json");
  const cross = readJson(crossPath);
  const existing = cross.change_requests ?? [];
  const ref = {
    id: crId,
    title: crId,
    status: "draft",
    date: new Date().toISOString().slice(0, 10),
    impact_node_ids: result.impact_node_ids,
    introduced_adrs: [],
    dir_path: path.relative(workspace, crDir).replace(/\\/g, "/")
  };
  cross.change_requests = [...existing.filter((item) => item.id !== crId), ref];
  cross.traceability = [...(cross.traceability ?? []), ...result.traceability.map((link) => ({ ...link, cr_id: crId }))];
  fs.writeFileSync(crossPath, `${JSON.stringify(cross, null, 2)}\n`);
}

function main() {
  const args = parseArgs(process.argv);
  const workspace = path.resolve(args.workspace || process.cwd());
  const text = readTextArg(args);
  const result = analyzeImpact(workspace, text);

  if (args.output) {
    fs.writeFileSync(args.output, `${JSON.stringify(result, null, 2)}\n`);
  }

  if (args.cr) {
    let markdown = fs.readFileSync(args.cr, "utf8");
    for (const section of [4, 5, 11]) {
      markdown = replaceSection(markdown, section, sectionContent(result, section));
    }
    fs.writeFileSync(args.cr, markdown);
    if (args["cr-id"]) patchCrossRepo(workspace, args["cr-id"], path.dirname(args.cr), result);
  }

  writeJson(result);
}

module.exports = { analyzeImpact };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

