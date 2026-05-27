#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeJson } = require("./_lib");

function defaultState(project) {
  return {
    version: "2.0",
    project,
    status: "idle",
    current_skill: null,
    current_phase: null,
    hooks_enabled: false,
    last_graph_refresh: null,
    history: [],
    overrides: []
  };
}

function statePath(workspace) {
  return path.join(workspace, "state.yaml.json");
}

function legacyStatePath(workspace) {
  return path.join(workspace, "state.yaml");
}

function loadState(workspace) {
  const jsonPath = statePath(workspace);
  if (fs.existsSync(jsonPath)) return readJson(jsonPath);
  const project = path.basename(workspace);
  return defaultState(project);
}

function saveState(workspace, state) {
  fs.writeFileSync(statePath(workspace), `${JSON.stringify(state, null, 2)}\n`);
  const yaml = [
    `version: "${state.version}"`,
    `project: ${state.project}`,
    `status: ${state.status}`,
    `current_skill: ${state.current_skill ?? "null"}`,
    `current_phase: ${state.current_phase ?? "null"}`,
    `hooks_enabled: ${state.hooks_enabled ? "true" : "false"}`,
    `last_graph_refresh: ${state.last_graph_refresh ?? "null"}`,
    `history_count: ${state.history.length}`,
    `overrides_count: ${state.overrides.length}`,
    ""
  ].join("\n");
  fs.writeFileSync(legacyStatePath(workspace), yaml);
}

function addHistory(state, args) {
  state.history.push({
    ts: new Date().toISOString(),
    skill: args.skill || "unknown",
    action: args.action || "unknown",
    status: args.status || "ok"
  });
}

function addOverride(state, args) {
  const reason = args.reason || "";
  if (reason.length < 20) throw new Error("override reason 必须不少于 20 个字符");
  state.overrides.push({
    ts: new Date().toISOString(),
    scope: args.scope || "unknown",
    reason,
    by: args.by || "user"
  });
  state.status = "degraded";
}

function main() {
  const args = parseArgs(process.argv);
  const command = args._[0];
  const workspace = path.resolve(args.workspace || args._[1] || process.cwd());
  const state = loadState(workspace);

  if (command === "init") {
    saveState(workspace, state);
    writeJson({ status: "ok", workspace, state: statePath(workspace) });
    return;
  }
  if (command === "history") {
    addHistory(state, args);
    saveState(workspace, state);
    writeJson({ status: "ok", history_count: state.history.length });
    return;
  }
  if (command === "override") {
    addOverride(state, args);
    saveState(workspace, state);
    writeJson({ status: "ok", degraded: true, overrides_count: state.overrides.length });
    return;
  }
  if (command === "view") {
    writeJson(state);
    return;
  }

  throw new Error("usage: state-editor.js init|history|override|view --workspace <workspace>");
}

module.exports = { defaultState, loadState, saveState };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

