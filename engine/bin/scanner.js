#!/usr/bin/env node
"use strict";

const { spawnSync } = require("child_process");
const path = require("path");
const { parseArgs, writeJson } = require("./_lib");

const args = parseArgs(process.argv);
if (args["fingerprint-check"]) {
  writeJson({
    version: "2.0",
    mode: "fingerprint-check",
    status: "degraded",
    message: "fingerprint-check currently reports degraded until hook integration writes per-repo drift results"
  });
} else {
  const workspace = args.workspace || args._[0];
  if (!workspace) {
    writeJson({
      version: "2.0",
      status: "ok",
      message: "Pass --workspace <.understand-arch/project> to run the v2 deterministic workspace scanner."
    });
  } else {
    const child = spawnSync(process.execPath, [path.join(__dirname, "analyze-workspace.js"), "--workspace", workspace], {
      stdio: "inherit"
    });
    if ((child.status ?? 1) === 0) {
      const wiki = spawnSync(process.execPath, [path.join(__dirname, "render-wiki.js"), "--workspace", workspace], {
        stdio: "inherit"
      });
      process.exitCode = wiki.status ?? 1;
    } else {
      process.exitCode = child.status ?? 1;
    }
  }
}
