#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const archDir = resolve(process.argv[2] || process.env.ARCH_PROJECT_ROOT || ".");
const layerPath = join(archDir, "specs", "arch-layer.json");
const reposPath = join(archDir, "specs", "repos.json");
const wikiDir = join(archDir, "wiki");
const outPath = join(archDir, "eval-report.json");

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function readText(path) {
  return existsSync(path) ? readFileSync(path, "utf-8") : "";
}

const layer = readJson(layerPath, null);
if (!layer) throw new Error(`Missing arch-layer.json: ${layerPath}`);
const reposInput = readJson(reposPath, layer.project?.repos ?? []);
const repos = Array.isArray(reposInput) ? reposInput : reposInput.repos ?? [];
const nodeIds = new Set();
let deterministicNodeCount = 0;

for (const repo of Array.isArray(repos) ? repos : []) {
  const graphPath = resolveExisting(repo.graph_path || join("specs", "repos", repo.repo_id || repo.id || repo.name, "knowledge-graph.json"), repo);
  if (!existsSync(graphPath)) continue;
  const graph = readJson(graphPath, { nodes: [] });
  for (const node of graph.nodes || []) {
    deterministicNodeCount++;
    nodeIds.add(node.id);
    if (repo.repo_id && !String(node.id).startsWith(`${repo.repo_id}::`)) nodeIds.add(`${repo.repo_id}::${node.id}`);
  }
}

const inferred = collectInferred(layer);
let evidenceRefs = 0;
let closedEvidence = 0;
let unsupportedClaims = 0;

for (const item of inferred) {
  const refs = Array.isArray(item.evidence_refs) ? item.evidence_refs : [];
  if (refs.length === 0) {
    unsupportedClaims++;
    continue;
  }
  for (const ref of refs) {
    evidenceRefs++;
    if (isClosedRef(ref)) closedEvidence++;
    else unsupportedClaims++;
  }
}

const evidenceClosureRate = evidenceRefs === 0 ? 0 : round(closedEvidence / evidenceRefs);
const hallucinationRate = evidenceRefs === 0 ? 1 : round(unsupportedClaims / Math.max(evidenceRefs, 1));
const architectureCoverage = deterministicNodeCount === 0 ? 0 : round(referencedNodeCount(layer) / deterministicNodeCount);
const wikiText = [
  "ARCHITECTURE.md",
  "01-overview.md",
  "02-components.md",
  "05-capabilities.md",
  "06-quality.md",
  "07-risks-and-debt.md",
  "09-flows-and-scenarios.md",
].map((file) => readText(join(wikiDir, file))).join("\n");
const placeholderCount = countMatches(wikiText, /\bTODO\b|\bTBD\b|待补充|占位|placeholder|lorem ipsum|默认 Mermaid/gi);
const analysisSentences = countMatches(wikiText, /因为|因此|取舍|风险|约束|边界|支撑|影响|证据来源/g);
const listLines = countMatches(wikiText, /^\s*-/gm);
const informationDensity = round(analysisSentences / Math.max(listLines, 1));
const consistency = stableCore(layer) ? 1 : 0.5;
const trustLabel = hallucinationRate === 0 && evidenceClosureRate >= 0.9 && placeholderCount === 0
  ? "high"
  : hallucinationRate <= 0.05 && evidenceClosureRate >= 0.75
    ? "medium"
    : "low";

const report = {
  version: "3.0",
  generated_at: new Date().toISOString(),
  project: layer.project?.name || "",
  trust_label: trustLabel,
  metrics: {
    evidence_closure_rate: evidenceClosureRate,
    hallucination_rate: hallucinationRate,
    coverage: architectureCoverage,
    consistency,
    information_density: informationDensity,
    placeholder_count: placeholderCount,
  },
  notes: [
    "hallucination_rate is deterministic first-layer evidence validation; senior-review samples semantic hallucinations in the LLM gate.",
    "coverage compares arch-layer referenced graph nodes with deterministic graph node count.",
  ],
};

writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, "utf-8");
console.log(JSON.stringify(report, null, 2));

function collectInferred(layer) {
  const keys = [
    "component_profiles",
    "tech_stack",
    "flows",
    "complexity_hotspots",
    "extension_constraints",
    "external_dependencies",
    "boundaries",
    "capabilities",
    "quality_attributes",
    "risks",
    "technical_debt",
    "cross_edges",
  ];
  const items = [];
  if (layer.architecture_style) items.push(layer.architecture_style);
  for (const key of keys) {
    if (Array.isArray(layer[key])) items.push(...layer[key]);
  }
  return items;
}

function resolveExisting(pathValue, repo) {
  const candidates = [
    resolve(pathValue),
    resolve(archDir, pathValue),
    resolve(archDir, "specs", "repos", repo.repo_id || repo.id || repo.name, "knowledge-graph.json"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

function isClosedRef(ref) {
  if (typeof ref !== "string" || ref.length === 0) return false;
  if (nodeIds.has(ref)) return true;
  if (/^(rules|decisions|change-requests|specs)\//.test(ref)) return true;
  if (/^(cap|risk|debt|qa|flow|component|tech|ext|boundary|hotspot):/.test(ref)) return false;
  if (/^[a-zA-Z0-9_.-]+::/.test(ref)) return nodeIds.has(ref);
  return existsSync(resolve(archDir, ref)) || existsSync(resolve(process.cwd(), ref));
}

function referencedNodeCount(layer) {
  const refs = new Set();
  for (const item of collectInferred(layer)) {
    for (const key of ["node_ids", "supporting_node_ids", "inside_node_ids"]) {
      if (Array.isArray(item[key])) for (const id of item[key]) if (nodeIds.has(id)) refs.add(id);
    }
  }
  return refs.size;
}

function stableCore(layer) {
  return Boolean(layer.architecture_style && Array.isArray(layer.component_profiles) && Array.isArray(layer.capabilities));
}

function countMatches(text, regex) {
  return [...text.matchAll(regex)].length;
}

function round(value) {
  return Math.round(value * 1000) / 1000;
}
