#!/usr/bin/env node
"use strict";
const { spawnSync } = require("child_process");
const path = require("path");

const tool = path.resolve(__dirname, "..", "upstream-tools", "extract-structure.mjs");
const child = spawnSync(process.execPath, [tool, ...process.argv.slice(2)], { stdio: "inherit" });
process.exitCode = child.status ?? 1;
