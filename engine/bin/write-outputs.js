#!/usr/bin/env node
"use strict";
const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeJson } = require("./_lib");

const args = parseArgs(process.argv);
const input = args.input || args._[0];
const output = args.output;
if (!input || !output) {
  console.error("usage: write-outputs.js --input value.json --output path.json");
  process.exit(1);
}

fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(readJson(input), null, 2)}\n`);
writeJson({ phase: "write-outputs", status: "ok", output });
