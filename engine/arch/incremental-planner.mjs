#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  PluginRegistry,
  TreeSitterPlugin,
  analyzeChanges,
  buildFingerprintStore,
  classifyUpdate,
  getChangedFiles,
  isStale,
  mergeGraphUpdate,
  registerAllParsers,
} from "../core/dist/index.js";

const ACTION_RANK = {
  SKIP: 0,
  PARTIAL_UPDATE: 1,
  ARCHITECTURE_UPDATE: 2,
  FULL_UPDATE: 3,
};

function readJson(path, fallback = undefined) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value).trim() !== "").map(String))];
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

async function createDefaultRegistry() {
  const registry = new PluginRegistry();
  try {
    const treeSitter = new TreeSitterPlugin();
    await treeSitter.init();
    registry.register(treeSitter);
  } catch {
    // Keep the planner usable in minimal environments; UA fingerprint comparison
    // remains conservative when structural parsers are unavailable.
  }
  registerAllParsers(registry);
  return registry;
}

function currentCommit(repoRoot) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "unknown";
  }
}

function isGitRepo(repoRoot) {
  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { cwd: repoRoot, encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] });
    return true;
  } catch {
    return false;
  }
}

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function loadRepos(archDir) {
  const reposDoc = readJson(join(archDir, "specs", "repos.json"), { repos: [] });
  return (Array.isArray(reposDoc) ? reposDoc : asArray(reposDoc.repos)).map((repo) => {
    const repoId = repo.repo_id || repo.id || repo.name;
    return {
      ...repo,
      repo_id: repoId,
      path: resolveMaybe(archDir, repo.path || "."),
      graph_path: repo.graph_path ? resolveMaybe(archDir, repo.graph_path) : join(archDir, "specs", "repos", repoId, "knowledge-graph.json"),
      fingerprint_path: repo.fingerprint_path ? resolveMaybe(archDir, repo.fingerprint_path) : join(archDir, "specs", "repos", repoId, ".fingerprint.json"),
    };
  });
}

function graphKnownFiles(graph) {
  return [...new Set(asArray(graph.nodes).map((node) => normalizePath(node.filePath)).filter(Boolean))].sort();
}

function isFingerprintStore(value) {
  return Boolean(value && typeof value === "object" && value.files && typeof value.files === "object" && !Array.isArray(value.files));
}

function emptyAnalysis() {
  return {
    fileChanges: [],
    newFiles: [],
    deletedFiles: [],
    structurallyChangedFiles: [],
    cosmeticOnlyFiles: [],
    unchangedFiles: [],
  };
}

function lookupAffected(index, changedFiles) {
  const affectedCardIds = new Set();
  const affectedArchNodes = new Set();
  const affectedConstraintIds = new Set();
  for (const file of changedFiles.map(normalizePath)) {
    const entry = index[file];
    if (!entry) continue;
    for (const id of asArray(entry.card_ids)) affectedCardIds.add(id);
    for (const id of asArray(entry.arch_node_ids)) affectedArchNodes.add(id);
    for (const id of asArray(entry.constraint_ids)) affectedConstraintIds.add(id);
  }
  return {
    affected_arch_nodes: [...affectedArchNodes].sort(),
    affected_card_ids: [...affectedCardIds].sort(),
    affected_constraint_ids: [...affectedConstraintIds].sort(),
  };
}

function mergePlan(base, next) {
  const action = ACTION_RANK[next.action] > ACTION_RANK[base.action] ? next.action : base.action;
  return {
    action,
    files_to_reanalyze: [...new Set([...base.files_to_reanalyze, ...next.files_to_reanalyze])].sort(),
    rerun_architecture: base.rerun_architecture || next.rerun_architecture,
    rerun_tour: base.rerun_tour || next.rerun_tour,
    affected_arch_nodes: [...new Set([...base.affected_arch_nodes, ...next.affected_arch_nodes])].sort(),
    affected_card_ids: [...new Set([...base.affected_card_ids, ...next.affected_card_ids])].sort(),
    affected_constraint_ids: [...new Set([...base.affected_constraint_ids, ...next.affected_constraint_ids])].sort(),
    reason: [base.reason, next.reason].filter(Boolean).join("; "),
    repos: [...base.repos, next.repo_plan],
  };
}

export async function planIncremental(options = {}) {
  const archDir = inferArchDir(options);
  const repos = loadRepos(archDir).filter((repo) => !options.repoId || repo.repo_id === options.repoId);
  const registry = options.registry || await createDefaultRegistry();
  const index = readJson(join(archDir, "cards", "index.json"), {});

  let plan = {
    action: "SKIP",
    files_to_reanalyze: [],
    rerun_architecture: false,
    rerun_tour: false,
    affected_arch_nodes: [],
    affected_card_ids: [],
    affected_constraint_ids: [],
    reason: "",
    repos: [],
  };

  for (const repo of repos) {
    const store = readJson(repo.fingerprint_path, null);
    const graph = readJson(repo.graph_path, { nodes: [], edges: [] });
    const allKnownFiles = graphKnownFiles(graph);

    if (!isFingerprintStore(store)) {
      plan = mergePlan(plan, {
        action: "FULL_UPDATE",
        files_to_reanalyze: allKnownFiles,
        rerun_architecture: true,
        rerun_tour: true,
        affected_arch_nodes: [],
        affected_card_ids: [],
        affected_constraint_ids: [],
        reason: `${repo.repo_id}: missing or incompatible fingerprint baseline`,
        repo_plan: { repo_id: repo.repo_id, action: "FULL_UPDATE", reason: "missing or incompatible fingerprint baseline" },
      });
      continue;
    }

    const since = options.since || store.gitCommitHash;
    const explicitChangedFiles = options.changedFilesByRepo?.[repo.repo_id] || options.changedFiles;
    const candidateFiles = explicitChangedFiles
      ? explicitChangedFiles
      : isGitRepo(repo.path)
        ? options.useGetChangedFiles
          ? getChangedFiles(repo.path, since)
          : isStale(repo.path, since).changedFiles
        : unique([...Object.keys(store.files || {}), ...allKnownFiles]);
    const analysis = candidateFiles.length > 0
      ? analyzeChanges(repo.path, candidateFiles.map(normalizePath), store, registry)
      : emptyAnalysis();
    const changedFiles = analysis.fileChanges
      .filter((change) => change.changeLevel !== "NONE")
      .map((change) => normalizePath(change.filePath));
    const decision = classifyUpdate(analysis, allKnownFiles.length || Object.keys(store.files || {}).length, allKnownFiles);
    const affectedFiles = decision.filesToReanalyze.length > 0 ? decision.filesToReanalyze : changedFiles;
    const affected = lookupAffected(index, affectedFiles);

    plan = mergePlan(plan, {
      action: decision.action,
      files_to_reanalyze: decision.filesToReanalyze.map(normalizePath).sort(),
      rerun_architecture: decision.rerunArchitecture,
      rerun_tour: decision.rerunTour,
      ...affected,
      reason: `${repo.repo_id}: ${decision.reason}`,
      repo_plan: {
        repo_id: repo.repo_id,
        action: decision.action,
        changed_files: changedFiles.map(normalizePath).sort(),
        files_to_reanalyze: decision.filesToReanalyze.map(normalizePath).sort(),
        affected_arch_nodes: affected.affected_arch_nodes,
        affected_card_ids: affected.affected_card_ids,
        affected_constraint_ids: affected.affected_constraint_ids,
        reason: decision.reason,
      },
    });
  }

  return {
    ...plan,
    current_commit: repos.length === 1 ? currentCommit(repos[0].path) : undefined,
  };
}

export function buildCurrentFingerprintStore(projectDir, filePaths, registry, gitCommitHash) {
  return buildFingerprintStore(projectDir, filePaths, registry, gitCommitHash);
}

export function mergeIncrementalGraph({ existingGraph, changedFiles, newNodes, newEdges, newCommitHash }) {
  return mergeGraphUpdate(existingGraph, changedFiles, newNodes, newEdges, newCommitHash);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.length ? rest.join("=") : true];
  }));
  const result = await planIncremental({
    archDir: args["arch-dir"],
    projectRoot: args.workspace,
    projectId: args.project,
    repoId: args.repo,
    since: args.since,
    useGetChangedFiles: Boolean(args["use-get-changed-files"]),
  });
  console.log(JSON.stringify(result, null, 2));
}
