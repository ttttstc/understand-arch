#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const { parseArgs, readReposYaml, writeJson } = require("./_lib");

const args = parseArgs(process.argv);
const workspace = args.workspace || args._[0] || process.cwd();
const reposPath = path.join(workspace, "specs", "repos.yaml");
if (!fs.existsSync(reposPath)) {
  console.error(`repos.yaml not found: ${reposPath}`);
  process.exit(1);
}

const repos = readReposYaml(reposPath);
writeJson({
  phase: "preflight",
  status: "ok",
  workspace,
  repos_count: repos.repos.length,
  repos: repos.repos.map((repo) => ({ id: repo.id, path: repo.path }))
});
