#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const { detectLanguage, parseArgs, sha256, walkFiles, writeJson } = require("./_lib");

const args = parseArgs(process.argv);
const repoRoot = path.resolve(args.repo || args._[0] || process.cwd());
const repoId = args["repo-id"] || path.basename(repoRoot).toLowerCase().replace(/[^a-z0-9-]/g, "-") || "repo";
const files = walkFiles(repoRoot).map((full) => {
  const rel = path.relative(repoRoot, full).replace(/\\/g, "/");
  const bytes = fs.readFileSync(full);
  return {
    path: rel,
    bytes: bytes.length,
    language: detectLanguage(full),
    hash: sha256(bytes)
  };
});

const languages = [...new Set(files.map((file) => file.language).filter((lang) => lang !== "unknown"))].sort();
writeJson({
  phase: "scan-project",
  version: "2.0",
  repo_id: repoId,
  repo_root: repoRoot,
  files,
  languages,
  files_scanned: files.length
});
