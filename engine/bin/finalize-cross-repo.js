#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeJson } = require("./_lib");

const args = parseArgs(process.argv);
const workspace = path.resolve(args.workspace || args._[0] || process.cwd());
const reposDir = path.join(workspace, "specs", "repos");
if (!fs.existsSync(reposDir)) {
  console.error(`repos dir not found: ${reposDir}`);
  process.exit(1);
}

const repoGraphs = fs.readdirSync(reposDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => readJson(path.join(reposDir, entry.name, "knowledge-graph.json")));

const repos = repoGraphs.map((graph) => graph.repo_meta);
const crossEdges = [];
const seen = new Set();
function addCrossEdge(edge) {
  const key = `${edge.source}->${edge.target}->${edge.type}`;
  if (!seen.has(key)) {
    seen.add(key);
    crossEdges.push(edge);
  }
}
for (const graph of repoGraphs) {
  for (const edge of graph.edges ?? []) {
    const sourceRepo = String(edge.source).split("::")[0];
    const targetRepo = String(edge.target).split("::")[0];
    if (sourceRepo !== targetRepo) addCrossEdge({ ...edge, cross_repo: true });
  }
}

function targetAnchorNode(graph) {
  return (graph.nodes ?? []).find((node) => node.type === "document" && /readme/i.test(node.name))
    || (graph.nodes ?? [])[0];
}

function mentionsRepo(text, repo) {
  if (!text) return false;
  const escaped = repo.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`['"]@?${escaped}[/:'"]`, "i"),
    new RegExp(`\\b${escaped}\\b`, "i")
  ];
  const remoteBase = String(repo.git_remote || "").split(/[\\/]/).pop()?.replace(/\.git$/, "");
  if (remoteBase && remoteBase !== repo.id) {
    const escapedRemote = remoteBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    patterns.push(new RegExp(`\\b${escapedRemote}\\b`, "i"));
  }
  return patterns.some((pattern) => pattern.test(text));
}

for (const sourceGraph of repoGraphs) {
  const sourceRepo = sourceGraph.repo_meta;
  const sourceRoot = path.resolve(workspace, sourceRepo.path || ".");
  for (const targetGraph of repoGraphs) {
    const targetRepo = targetGraph.repo_meta;
    if (sourceRepo.id === targetRepo.id) continue;
    const targetNode = targetAnchorNode(targetGraph);
    if (!targetNode) continue;
    for (const node of sourceGraph.nodes ?? []) {
      if (!node.filePath) continue;
      const file = path.join(sourceRoot, node.filePath);
      if (!fs.existsSync(file)) continue;
      const stat = fs.statSync(file);
      if (stat.size > 256 * 1024) continue;
      let text = "";
      try {
        text = fs.readFileSync(file, "utf8");
      } catch {
        continue;
      }
      if (!mentionsRepo(text, targetRepo)) continue;
      addCrossEdge({
        source: node.id,
        target: targetNode.id,
        type: "references",
        direction: "forward",
        description: `${sourceRepo.id}/${node.filePath} 明确引用 ${targetRepo.id}`,
        weight: 0.6,
        cross_repo: true,
        evidence_refs: [
          {
            repo_id: sourceRepo.id,
            file: node.filePath,
            source: "engine",
            extracted_at: new Date().toISOString()
          }
        ]
      });
    }
  }
}

const out = {
  version: "2.0",
  project: {
    name: path.basename(workspace),
    description: "",
    languages_overall: [...new Set(repos.flatMap((repo) => repo.languages || []))].sort(),
    frameworks_overall: [...new Set(repos.flatMap((repo) => repo.frameworks || []))].sort(),
    analyzed_at: new Date().toISOString()
  },
  repos,
  cross_edges: crossEdges,
  capabilities: [],
  architecture_decisions: [],
  change_requests: [],
  traceability: [],
  quality_attributes: [],
  risks: [],
  technical_debt: [],
  known_unknowns: []
};

const output = args.output || path.join(workspace, "specs", "cross-repo.json");
fs.writeFileSync(output, `${JSON.stringify(out, null, 2)}\n`);
writeJson({ phase: "finalize-cross-repo", status: "ok", output, repos: repos.length, cross_edges: crossEdges.length });
