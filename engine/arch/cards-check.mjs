#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { sourceHashForCard } from "./cards-deriver.mjs";

function readJson(path, fallback = undefined) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function inferArchDir(options = {}) {
  if (options.archDir) return resolve(options.archDir);
  if (process.env.ARCH_PROJECT_ROOT) return resolve(process.env.ARCH_PROJECT_ROOT);
  const projectRoot = resolve(options.projectRoot || process.cwd());
  const projectId = options.projectId || process.env.ARCH_PROJECT_ID || basename(projectRoot);
  return join(projectRoot, ".understand-arch", projectId);
}

function resolveMaybe(base, value) {
  if (!value) return base;
  return resolve(String(value).replace(/\\/g, "/").match(/^[a-zA-Z]:\//) ? String(value) : join(base, String(value)));
}

function loadGraphNodeIds(archDir) {
  const layer = readJson(join(archDir, "specs", "arch-layer.json"), {});
  const reposDoc = readJson(join(archDir, "specs", "repos.json"), null);
  const repos = Array.isArray(reposDoc) ? reposDoc : asArray(reposDoc?.repos);
  const layerRepos = asArray(layer?.project?.repos);
  const candidates = repos.length > 0 ? repos : layerRepos;
  const ids = new Set();
  const repoRoots = [];
  for (const repo of candidates) {
    const repoId = repo.repo_id || repo.id || repo.name;
    const graphPath = repo.graph_path
      ? resolveMaybe(archDir, repo.graph_path)
      : join(archDir, "specs", "repos", repoId, "knowledge-graph.json");
    const repoRoot = resolveMaybe(archDir, repo.path || repo.root || ".");
    repoRoots.push(repoRoot);
    const graph = readJson(graphPath, null);
    for (const node of asArray(graph?.nodes)) ids.add(node.id);
  }
  return { ids, repoRoots: repoRoots.length > 0 ? repoRoots : [archDir] };
}

function fileExists(archDir, repoRoots, filePath) {
  const normalized = String(filePath || "").replace(/\\/g, "/");
  if (existsSync(resolveMaybe(archDir, normalized))) return true;
  return repoRoots.some((root) => existsSync(resolveMaybe(root, normalized)));
}

export function checkCards(options = {}) {
  const archDir = inferArchDir(options);
  const cardsPath = options.cardsPath ? resolve(options.cardsPath) : join(archDir, "cards", "agent-cards.json");
  const indexPath = options.indexPath ? resolve(options.indexPath) : join(archDir, "cards", "index.json");
  const doc = readJson(cardsPath, { cards: [] });
  const index = readJson(indexPath, {});
  const { ids: graphNodeIds, repoRoots } = loadGraphNodeIds(archDir);
  const findings = [];
  const staleCardIds = [];

  for (const card of asArray(doc.cards)) {
    if (!String(card.focused_summary || "").trim()) {
      findings.push({ severity: "warning", code: "missing_summary", card_id: card.id });
    }
    for (const nodeId of asArray(card.anchors?.graph_node_ids)) {
      if (!graphNodeIds.has(nodeId)) findings.push({ severity: "error", code: "broken_graph_anchor", card_id: card.id, anchor: nodeId });
    }
    for (const filePath of asArray(card.anchors?.file_paths)) {
      if (!fileExists(archDir, repoRoots, filePath)) findings.push({ severity: "error", code: "broken_file_anchor", card_id: card.id, anchor: filePath });
    }
    for (const range of asArray(card.anchors?.line_ranges)) {
      if (!Array.isArray(range) || range.length !== 2 || range[0] < 1 || range[1] < range[0]) {
        findings.push({ severity: "error", code: "invalid_line_range", card_id: card.id, anchor: range });
      }
    }
    if (card.type === "ConstraintCard" && !card.source_artifact?.startsWith("constraint:")) {
      findings.push({ severity: "error", code: "invalid_constraint_source", card_id: card.id });
    }
    const actualHash = sourceHashForCard(card, { archDir });
    if (!actualHash) {
      findings.push({ severity: "error", code: "missing_source", card_id: card.id, source_artifact: card.source_artifact });
    } else if (actualHash !== card.source_hash) {
      staleCardIds.push(card.id);
      findings.push({ severity: "warning", code: "stale_source_hash", card_id: card.id, expected: card.source_hash, actual: actualHash });
    }
  }

  const cardIds = new Set(asArray(doc.cards).map((card) => card.id));
  for (const [filePath, entry] of Object.entries(index)) {
    for (const cardId of asArray(entry.card_ids)) {
      if (!cardIds.has(cardId)) findings.push({ severity: "error", code: "index_unknown_card", file_path: filePath, card_id: cardId });
    }
    for (const nodeId of asArray(entry.arch_node_ids)) {
      if (!graphNodeIds.has(nodeId)) findings.push({ severity: "error", code: "index_unknown_node", file_path: filePath, node_id: nodeId });
    }
  }

  const ok = !findings.some((finding) => finding.severity === "error");
  return {
    ok,
    card_count: asArray(doc.cards).length,
    stale_card_ids: [...new Set(staleCardIds)].sort(),
    findings,
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.length ? rest.join("=") : true];
  }));
  const result = checkCards({ archDir: args["arch-dir"], projectRoot: args.workspace, projectId: args.project });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
