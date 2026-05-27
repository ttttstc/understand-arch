#!/usr/bin/env node
"use strict";
const { parseArgs, readJson, writeJson } = require("./_lib");

const args = parseArgs(process.argv);
const input = args.input || args._[0];
if (!input) {
  console.error("usage: build-fingerprints.js --input scan-result.json");
  process.exit(1);
}
const scan = readJson(input);
const files = {};
for (const file of scan.files ?? []) {
  files[file.path] = { hash: file.hash, bytes: file.bytes, language: file.language };
}
writeJson({
  version: "2.0",
  repo_id: scan.repo_id,
  generated_from: "scan-project",
  files
});
