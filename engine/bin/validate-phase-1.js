#!/usr/bin/env node
"use strict";
const { parseArgs, readJson, writeJson } = require("./_lib");

const args = parseArgs(process.argv);
const input = args.input || args._[0];
if (!input) {
  console.error("usage: validate-phase-1.js --input scan-result.json");
  process.exit(1);
}

const scan = readJson(input);
const findings = [];
if (!scan.repo_id) findings.push("missing repo_id");
if (!Array.isArray(scan.files)) findings.push("files must be an array");
if ((scan.files ?? []).some((file) => !file.path || !file.language)) findings.push("each file needs path and language");

writeJson({
  phase: "validate-phase-1",
  status: findings.length ? "fail" : "pass",
  findings
});
if (findings.length) process.exitCode = 1;
