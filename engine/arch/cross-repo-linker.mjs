#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const projectRoot = resolve(process.argv[2] || ".");
const projectId = process.env.ARCH_PROJECT_ID || basename(projectRoot);
const archDir = process.env.ARCH_PROJECT_ROOT || join(projectRoot, ".understand-arch", projectId);
const reposPath = process.argv[3] ? resolve(process.argv[3]) : join(archDir, "specs", "repos.json");
const outPath = process.argv[4] ? resolve(process.argv[4]) : join(archDir, "intermediate", "cross-edges.json");

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function loadRepos() {
  const raw = readJson(reposPath, { repos: [{ repo_id: projectId, graph_path: join(archDir, "specs", "repos", projectId, "knowledge-graph.json") }] });
  return Array.isArray(raw) ? raw : raw.repos || [];
}

function prefix(repoId, id) {
  return id.includes("::") ? id : `${repoId}::${id}`;
}

const repos = loadRepos();
const graphs = repos.map((repo) => ({
  repo,
  graph: readJson(resolve(projectRoot, repo.graph_path || ""), null),
})).filter((entry) => entry.graph);

const packageNames = new Map();
for (const { repo, graph } of graphs) {
  for (const node of graph.nodes || []) {
    if (node.type === "module" || node.type === "service") {
      packageNames.set(String(node.name).toLowerCase(), { repo, node });
    }
  }
}

const edges = [];
const seen = new Set();
for (const { repo, graph } of graphs) {
  const repoId = repo.repo_id || repo.id || repo.name;
  for (const edge of graph.edges || []) {
    if (!["imports", "calls", "depends_on", "serves"].includes(edge.type)) continue;
    const targetName = String(edge.target || "").split(":").pop()?.toLowerCase();
    const hit = targetName ? packageNames.get(targetName) : null;
    if (!hit) continue;
    const targetRepoId = hit.repo.repo_id || hit.repo.id || hit.repo.name;
    if (!targetRepoId || targetRepoId === repoId) continue;
    const source = prefix(repoId, edge.source);
    const target = prefix(targetRepoId, hit.node.id);
    const id = `cross:${source}->${target}:${edge.type}`;
    if (seen.has(id)) continue;
    seen.add(id);
    edges.push({
      id,
      source,
      target,
      type: edge.type,
      cross_repo: true,
      description: edge.description || `Detected cross-repo ${edge.type} from ${repoId} to ${targetRepoId}`,
      evidence_refs: [source, target],
      confidence: "medium",
    });
  }
}

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify({ cross_edges: edges }, null, 2)}\n`, "utf-8");
console.log(`cross_edges=${edges.length}`);
