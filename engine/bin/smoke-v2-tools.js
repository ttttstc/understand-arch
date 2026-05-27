#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..", "..");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    ...options
  });
  if (result.status !== 0) {
    process.stderr.write(result.stdout || "");
    process.stderr.write(result.stderr || "");
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status}`);
  }
  return result;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "understand-arch-v2-smoke-"));
  const workspace = path.join(tmp, ".understand-arch", "demo");
  const repo = path.join(tmp, "repo");
  const simpleFixture = path.join(root, "engine", "tests", "fixtures", "simple-engine");
  fs.mkdirSync(path.join(workspace, "specs"), { recursive: true });
  fs.cpSync(simpleFixture, repo, { recursive: true });
  fs.writeFileSync(path.join(workspace, "specs", "repos.yaml"), [
    'version: "1.0"',
    "repos:",
    "  - id: demo",
    "    path: ../../repo",
    '    git_remote: ""',
    "    primary_language: typescript",
    '    description: "smoke repo"',
    ""
  ].join("\n"));

  run(process.execPath, ["engine/bin/scanner.js", "--workspace", workspace]);

  const graphPath = path.join(workspace, "specs", "repos", "demo", "knowledge-graph.json");
  const crossPath = path.join(workspace, "specs", "cross-repo.json");
  const fingerprintPath = path.join(workspace, "specs", "repos", "demo", ".fingerprint.json");
  const graph = readJson(graphPath);
  const cross = readJson(crossPath);
  run(process.execPath, ["engine/bin/validate-phase-3.js", "--input", graphPath]);
  if (graph.repo_id !== "demo" || graph.nodes.length < 6) throw new Error("workspace scanner graph invariant failed");
  if (!graph.nodes.every((node) => node.id.startsWith("demo::"))) throw new Error("node prefix invariant failed");
  if (!graph.nodes.every((node) => node.repo_id === "demo")) throw new Error("node repo_id invariant failed");
  if (!graph.nodes.every((node) => node.evidence_refs?.[0]?.repo_id === "demo")) throw new Error("node evidence invariant failed");
  if (!graph.nodes.some((node) => node.type === "function" && node.name === "answer")) {
    throw new Error("workspace scanner must reuse UA structure extraction for function nodes");
  }
  if (!graph.nodes.some((node) => node.type === "class" && node.name === "DemoService")) {
    throw new Error("workspace scanner must reuse UA structure extraction for class nodes");
  }
  if (!graph.edges.some((edge) => edge.type === "contains" && edge.target.includes("func-src-util-ts-answer"))) {
    throw new Error("workspace scanner must emit contains edges for extracted symbols");
  }
  if (!graph.edges.some((edge) => edge.type === "imports" && edge.source === "demo::file-src-app-ts" && edge.target === "demo::file-src-util-ts")) {
    throw new Error("workspace scanner must reuse UA import-map for imports edges");
  }
  if (graph.edges.some((edge) => !edge.source.startsWith("demo::") || !edge.target.startsWith("demo::"))) {
    throw new Error("repo graph must not contain cross-repo edges");
  }
  if (cross.repos.length !== 1 || !fs.existsSync(fingerprintPath)) throw new Error("cross-repo/fingerprint invariant failed");

  const structureIn = path.join(tmp, "structure-input.json");
  const structureOut = path.join(tmp, "structure-output.json");
  const importIn = path.join(tmp, "import-input.json");
  const importOut = path.join(tmp, "import-output.json");
  fs.writeFileSync(structureIn, JSON.stringify({
    projectRoot: repo,
    batchFiles: [{ path: "src/util.ts", language: "typescript", sizeLines: 3, fileCategory: "code" }],
    batchImportData: {}
  }, null, 2));
  fs.writeFileSync(importIn, JSON.stringify({
    projectRoot: repo,
    files: [
      { path: "src/app.ts", language: "typescript", fileCategory: "code" },
      { path: "src/util.ts", language: "typescript", fileCategory: "code" }
    ]
  }, null, 2));

  run(process.execPath, ["engine/bin/extract-structure.js", structureIn, structureOut]);
  run(process.execPath, ["engine/bin/extract-import-map.js", importIn, importOut]);
  const structure = readJson(structureOut);
  const importMap = readJson(importOut);
  const functions = structure.results?.[0]?.functions ?? [];
  if (!functions.some((fn) => fn.name === "answer")) throw new Error("extract-structure did not find answer()");
  if (!importMap.scriptCompleted) throw new Error("extract-import-map did not complete");

  run(process.execPath, ["engine/bin/render-wiki.js", "--workspace", workspace]);
  const wikiPages = fs.readdirSync(path.join(workspace, "wiki")).filter((name) => name.endsWith(".md")).sort();
  if (wikiPages.length !== 15) throw new Error(`expected README + 14 wiki pages, found ${wikiPages.length}`);
  const interfacesPage = fs.readFileSync(path.join(workspace, "wiki", "03-interfaces.md"), "utf8");
  if (!interfacesPage.includes("已知局限")) throw new Error("wiki interfaces page must keep known limitations");
  run(process.execPath, ["engine/bin/wiki-review.js", "--workspace", workspace, "--mode", "lite"]);
  run(process.execPath, ["engine/bin/wiki-review.js", "--workspace", workspace, "--mode", "full"]);

  const crDir = path.join(workspace, "change-requests", "CR-2026-001-demo");
  const crFile = path.join(crDir, "CR.md");
  fs.mkdirSync(path.join(workspace, "rules"), { recursive: true });
  fs.writeFileSync(path.join(workspace, "rules", "naming.md"), "# Naming\n\nsrc app changes must keep stable naming.\n");
  run(process.execPath, [
    "engine/bin/cr-md-editor.js",
    "create",
    "--file", crFile,
    "--id", "CR-2026-001",
    "--title", "Demo change",
    "--project", "demo",
    "--impact-node-ids", "demo::file-src-app-ts"
  ]);
  run(process.execPath, [
    "engine/bin/cr-md-editor.js",
    "set-section",
    "--file", crFile,
    "--actor", "arch-frame",
    "--section", "1",
    "--content", "Demo background."
  ]);
  const impactOut = path.join(tmp, "impact-output.json");
  run(process.execPath, [
    "engine/bin/impact-analyzer.js",
    "--workspace", workspace,
    "--text", "Change src/app.ts answer naming and update app behavior.",
    "--output", impactOut,
    "--cr", crFile,
    "--cr-id", "CR-2026-001"
  ]);
  const impact = readJson(impactOut);
  if (!impact.impact_node_ids.includes("demo::file-src-app-ts")) {
    throw new Error("impact analyzer did not find src/app.ts node");
  }
  if (!impact.rules_findings.some((finding) => finding.rule_path === "rules/naming.md")) {
    throw new Error("impact analyzer did not report rules/naming.md finding");
  }
  const crAfterImpact = fs.readFileSync(crFile, "utf8");
  if (!crAfterImpact.includes("demo::file-src-app-ts") || !crAfterImpact.includes("rules/naming.md")) {
    throw new Error("impact analyzer did not write CR impact sections");
  }
  const crossAfterImpact = readJson(crossPath);
  if (!(crossAfterImpact.change_requests ?? []).some((cr) => cr.id === "CR-2026-001")) {
    throw new Error("impact analyzer did not append change request ref");
  }
  if (!(crossAfterImpact.traceability ?? []).some((link) => link.cr_id === "CR-2026-001" && link.to?.id === "demo::file-src-app-ts")) {
    throw new Error("impact analyzer did not append traceability");
  }
  const denied = spawnSync(process.execPath, [
    "engine/bin/cr-md-editor.js",
    "set-section",
    "--file", crFile,
    "--actor", "arch-review",
    "--section", "1",
    "--content", "Should fail."
  ], { cwd: root, encoding: "utf8" });
  if (denied.status === 0) throw new Error("arch-review should not be allowed to write section 1");
  run(process.execPath, [
    "engine/bin/cr-md-editor.js",
    "append-review",
    "--file", crFile,
    "--content", "Review passed for smoke test."
  ]);
  run(process.execPath, ["engine/bin/cr-md-editor.js", "validate", "--file", crFile]);
  const review = spawnSync(process.execPath, [
    "engine/bin/senior-review.js",
    "--mode", "design",
    "--cr", crFile,
    "--allow-needs-revision"
  ], { cwd: root, encoding: "utf8" });
  if (review.status !== 0) {
    process.stderr.write(review.stdout || "");
    process.stderr.write(review.stderr || "");
    throw new Error("senior review smoke failed");
  }
  const reviewJson = JSON.parse(review.stdout);
  if (!["pass", "needs_revision"].includes(reviewJson.verdict)) {
    throw new Error("senior review did not return a valid verdict");
  }

  run(process.execPath, [
    "engine/bin/adr-editor.js",
    "create",
    "--workspace", workspace,
    "--title", "Use deterministic smoke architecture",
    "--status", "accepted",
    "--context", "Smoke test needs a durable decision.",
    "--decision", "Use deterministic engine outputs as the test source.",
    "--consequences", "The ADR index must be appended to cross-repo.json.",
    "--affected-node-ids", "demo::file-src-app-ts"
  ]);
  const crossAfterAdr = readJson(crossPath);
  const adr = (crossAfterAdr.architecture_decisions ?? []).find((decision) => decision.id === "ADR-001");
  if (!adr || adr.md_path !== "decisions/ADR-001-use-deterministic-smoke-architecture.md") {
    throw new Error("ADR editor did not append cross-repo architecture decision index");
  }

  run(process.execPath, ["engine/bin/state-editor.js", "init", "--workspace", workspace]);
  run(process.execPath, [
    "engine/bin/state-editor.js",
    "history",
    "--workspace", workspace,
    "--skill", "arch-design",
    "--action", "smoke",
    "--status", "ok"
  ]);
  const shortOverride = spawnSync(process.execPath, [
    "engine/bin/state-editor.js",
    "override",
    "--workspace", workspace,
    "--scope", "design",
    "--reason", "too short"
  ], { cwd: root, encoding: "utf8" });
  if (shortOverride.status === 0) throw new Error("short override reason should fail");
  run(process.execPath, [
    "engine/bin/state-editor.js",
    "override",
    "--workspace", workspace,
    "--scope", "design",
    "--reason", "这是一个足够长的 smoke override 审计原因",
    "--by", "user"
  ]);
  const state = readJson(path.join(workspace, "state.yaml.json"));
  if (state.status !== "degraded" || state.overrides.length !== 1 || state.history.length !== 1) {
    throw new Error("state editor did not preserve degraded override audit");
  }
  const degradedAudit = spawnSync(process.execPath, [
    "engine/bin/audit-workspace.js",
    "--workspace", workspace,
    "--allow-non-fresh"
  ], { cwd: root, encoding: "utf8" });
  if (degradedAudit.status !== 0) {
    process.stderr.write(degradedAudit.stdout || "");
    process.stderr.write(degradedAudit.stderr || "");
    throw new Error("degraded audit command failed");
  }
  if (JSON.parse(degradedAudit.stdout).status !== "degraded") {
    throw new Error("audit should surface degraded state overrides");
  }

  const multiWorkspace = path.join(tmp, ".understand-arch", "multi");
  const webRepo = path.join(tmp, "web");
  const apiRepo = path.join(tmp, "api");
  fs.mkdirSync(path.join(multiWorkspace, "specs"), { recursive: true });
  fs.mkdirSync(path.join(webRepo, "src"), { recursive: true });
  fs.mkdirSync(path.join(apiRepo, "src"), { recursive: true });
  fs.writeFileSync(path.join(webRepo, "src", "client.ts"), "import { getUser } from '@api/users';\nexport const client = getUser;\n");
  fs.writeFileSync(path.join(apiRepo, "README.md"), "# API\n");
  fs.writeFileSync(path.join(apiRepo, "src", "users.ts"), "export function getUser() { return null; }\n");
  fs.writeFileSync(path.join(multiWorkspace, "specs", "repos.yaml"), [
    'version: "1.0"',
    "repos:",
    "  - id: web",
    "    path: ../../web",
    '    git_remote: ""',
    "    primary_language: typescript",
    '    description: "web repo"',
    "  - id: api",
    "    path: ../../api",
    '    git_remote: ""',
    "    primary_language: typescript",
    '    description: "api repo"',
    ""
  ].join("\n"));
  run(process.execPath, ["engine/bin/scanner.js", "--workspace", multiWorkspace]);
  const multiCross = readJson(path.join(multiWorkspace, "specs", "cross-repo.json"));
  const crossEdge = (multiCross.cross_edges ?? []).find((edge) => edge.source.startsWith("web::") && edge.target.startsWith("api::"));
  if (!crossEdge) throw new Error("expected deterministic web -> api cross-repo edge");
  if (!crossEdge.cross_repo) throw new Error("cross edge must set cross_repo=true");
  const freshAudit = JSON.parse(run(process.execPath, [
    "engine/bin/audit-workspace.js",
    "--workspace", multiWorkspace
  ]).stdout);
  if (freshAudit.status !== "fresh") throw new Error("fresh audit should pass before file changes");
  fs.appendFileSync(path.join(webRepo, "src", "client.ts"), "\nexport const changed = true;\n");
  const staleAudit = JSON.parse(run(process.execPath, [
    "engine/bin/audit-workspace.js",
    "--workspace", multiWorkspace,
    "--allow-non-fresh"
  ]).stdout);
  if (staleAudit.status !== "stale" || !staleAudit.repos.some((repo) => repo.changed_files.includes("src/client.ts"))) {
    throw new Error("audit should report stale changed file");
  }

  console.log("v2 tool smoke passed");
}

main();
