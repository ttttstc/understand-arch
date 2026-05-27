#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, readReposYaml, sha256, writeJson } = require("./_lib");

function fileHash(file) {
  return sha256(fs.readFileSync(file));
}

function auditRepo(workspace, repo) {
  const repoRoot = path.resolve(workspace, repo.path || ".");
  const fpPath = path.join(workspace, "specs", "repos", repo.id, ".fingerprint.json");
  const graphPath = path.join(workspace, "specs", "repos", repo.id, "knowledge-graph.json");
  const findings = [];
  if (!fs.existsSync(fpPath)) findings.push("missing fingerprint");
  if (!fs.existsSync(graphPath)) findings.push("missing repo graph");
  const fingerprint = fs.existsSync(fpPath) ? readJson(fpPath) : { files: {} };
  const changed = [];
  const missing = [];
  for (const [rel, info] of Object.entries(fingerprint.files ?? {})) {
    const full = path.join(repoRoot, rel);
    if (!fs.existsSync(full)) {
      missing.push(rel);
      continue;
    }
    const hash = fileHash(full);
    if (hash !== info.hash) changed.push(rel);
  }
  const status = findings.length ? "unknown" : missing.length || changed.length ? "stale" : "fresh";
  return { repo_id: repo.id, status, changed_files: changed, missing_files: missing, findings };
}

function auditWorkspace(workspace) {
  const reposPath = path.join(workspace, "specs", "repos.yaml");
  const registry = readReposYaml(reposPath);
  const repos = registry.repos.map((repo) => auditRepo(workspace, repo));
  const statePath = path.join(workspace, "state.yaml.json");
  const state = fs.existsSync(statePath) ? readJson(statePath) : null;
  const degraded = state?.status === "degraded" || (state?.overrides ?? []).length > 0;
  return {
    version: "2.0",
    audited_at: new Date().toISOString(),
    status: degraded ? "degraded" : repos.some((repo) => repo.status === "stale") ? "stale" : repos.some((repo) => repo.status === "unknown") ? "unknown" : "fresh",
    repos,
    degraded,
    overrides: state?.overrides ?? []
  };
}

function main() {
  const args = parseArgs(process.argv);
  const workspace = path.resolve(args.workspace || args._[0] || process.cwd());
  const result = auditWorkspace(workspace);
  if (args.output) fs.writeFileSync(args.output, `${JSON.stringify(result, null, 2)}\n`);
  writeJson(result);
  if (["stale", "unknown", "degraded"].includes(result.status) && !args["allow-non-fresh"]) process.exitCode = 1;
}

module.exports = { auditWorkspace };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

