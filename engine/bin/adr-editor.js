#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeJson } = require("./_lib");

function slugify(value) {
  return String(value || "decision")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-|-$/g, "")
    || "decision";
}

function nextAdrId(decisionsDir) {
  if (!fs.existsSync(decisionsDir)) return "ADR-001";
  const nums = fs.readdirSync(decisionsDir)
    .map((name) => name.match(/^ADR-(\d{3})-/)?.[1])
    .filter(Boolean)
    .map(Number);
  return `ADR-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(3, "0")}`;
}

function adrBody({ id, title, status, date, context, decision, consequences, affectedNodeIds }) {
  return [
    `# ${id} ${title}`,
    "",
    `- Status: ${status}`,
    `- Date: ${date}`,
    `- Affected nodes: ${affectedNodeIds.length ? affectedNodeIds.map((node) => `\`${node}\``).join(", ") : "none"}`,
    "",
    "## Context",
    "",
    context || "待补充。",
    "",
    "## Decision",
    "",
    decision || "待补充。",
    "",
    "## Consequences",
    "",
    consequences || "待补充。",
    ""
  ].join("\n");
}

function appendDecisionIndex(workspace, entry) {
  const crossPath = path.join(workspace, "specs", "cross-repo.json");
  const cross = readJson(crossPath);
  const existing = cross.architecture_decisions ?? [];
  if (existing.some((decision) => decision.id === entry.id)) {
    throw new Error(`${entry.id} already exists in cross-repo.json`);
  }
  cross.architecture_decisions = [...existing, entry];
  fs.writeFileSync(crossPath, `${JSON.stringify(cross, null, 2)}\n`);
}

function createAdr(args) {
  const workspace = path.resolve(args.workspace || args._[1] || process.cwd());
  const title = args.title;
  if (!title) throw new Error("create 需要 --title");
  const decisionsDir = path.join(workspace, "decisions");
  fs.mkdirSync(decisionsDir, { recursive: true });
  const id = args.id || nextAdrId(decisionsDir);
  const file = path.join(decisionsDir, `${id}-${slugify(title)}.md`);
  if (fs.existsSync(file)) throw new Error(`ADR already exists: ${file}`);

  const date = args.date || new Date().toISOString().slice(0, 10);
  const status = args.status || "proposed";
  const affectedNodeIds = args["affected-node-ids"] ? String(args["affected-node-ids"]).split(",").filter(Boolean) : [];
  fs.writeFileSync(file, adrBody({
    id,
    title,
    status,
    date,
    context: args.context,
    decision: args.decision,
    consequences: args.consequences,
    affectedNodeIds
  }));

  const mdPath = path.relative(workspace, file).replace(/\\/g, "/");
  const entry = {
    id,
    title,
    status,
    date,
    context: args.context || "",
    decision: args.decision || "",
    consequences: args.consequences || "",
    affected_node_ids: affectedNodeIds,
    md_path: mdPath,
    evidence_refs: affectedNodeIds.map((nodeId) => ({
      repo_id: nodeId.split("::")[0],
      file: "",
      source: "human",
      extracted_at: new Date().toISOString()
    }))
  };
  appendDecisionIndex(workspace, entry);
  return { status: "ok", id, file, md_path: mdPath };
}

function main() {
  const args = parseArgs(process.argv);
  const command = args._[0];
  if (command !== "create") {
    throw new Error("usage: adr-editor.js create --workspace <workspace> --title <title>");
  }
  writeJson(createAdr(args));
}

module.exports = { createAdr, nextAdrId, slugify };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

