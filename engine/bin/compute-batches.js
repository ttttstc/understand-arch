#!/usr/bin/env node
"use strict";
const { parseArgs, readJson, writeJson } = require("./_lib");

const args = parseArgs(process.argv);
const input = args.input || args._[0];
if (!input) {
  console.error("usage: compute-batches.js --input scan-result.json [--max-files 50]");
  process.exit(1);
}
const maxFiles = Number(args["max-files"] || 50);
const scan = readJson(input);
const batches = [];
for (let i = 0; i < scan.files.length; i += maxFiles) {
  batches.push({
    id: `${scan.repo_id}-batch-${String(batches.length + 1).padStart(3, "0")}`,
    repo_id: scan.repo_id,
    files: scan.files.slice(i, i + maxFiles).map((file) => file.path)
  });
}
writeJson({ phase: "compute-batches", version: "2.0", repo_id: scan.repo_id, batches });
