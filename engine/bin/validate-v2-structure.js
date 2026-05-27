#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..", "..");
const fail = (message) => {
  console.error(message);
  process.exit(1);
};

function readJson(rel) {
  const full = path.join(root, rel);
  try {
    return JSON.parse(fs.readFileSync(full, "utf8"));
  } catch (error) {
    fail(`Invalid JSON in ${rel}: ${error.message}`);
  }
}

function listFiles(rel, predicate = () => true) {
  const dir = path.join(root, rel);
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && predicate(entry.name))
    .map((entry) => entry.name)
    .sort();
}

function walkFiles(rel) {
  const start = path.join(root, rel);
  const out = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== ".git") visit(full);
      } else {
        out.push(full);
      }
    }
  };
  visit(start);
  return out;
}

const required = [
  "docs/spec-v2.0.md",
  "skills/arch-onboard/SKILL.md",
  "skills/arch-design/SKILL.md",
  "skills/arch-audit/SKILL.md",
  "skills/arch-wiki/SKILL.md",
  "skills/arch-diagram/SKILL.md",
  "skills/arch-analyze/SKILL.md",
  "skills/arch-frame/SKILL.md",
  "skills/arch-adr/SKILL.md",
  "skills/arch-review/SKILL.md",
  "internal/schemas/repos.schema.json",
  "internal/schemas/repo-knowledge-graph.schema.json",
  "internal/schemas/cross-repo.schema.json",
  "internal/schemas/cr.schema.json",
  "internal/schemas/state.schema.json",
  "internal/acceptance/onboard.yaml",
  "internal/acceptance/design.yaml",
  "internal/acceptance/audit.yaml",
  "internal/acceptance/wiki.yaml",
  "internal/tool-contracts/write-scope.yaml",
  "engine/bin/cr-md-editor.js"
  ,"engine/bin/analyze-workspace.js"
  ,"engine/bin/prepare-dist.js"
  ,"engine/bin/smoke-v2-tools.js"
  ,"engine/bin/render-wiki.js"
  ,"engine/bin/adr-editor.js"
  ,"engine/bin/state-editor.js"
  ,"engine/bin/impact-analyzer.js"
  ,"engine/bin/senior-review.js"
  ,"engine/bin/wiki-review.js"
  ,"engine/bin/audit-workspace.js"
];

const missing = required.filter((rel) => !fs.existsSync(path.join(root, rel)));
if (missing.length) {
  fail(`Missing v2 files:\n${missing.join("\n")}`);
}

const skillDirs = fs.readdirSync(path.join(root, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const expectedSkills = ["arch-adr", "arch-analyze", "arch-audit", "arch-design", "arch-diagram", "arch-frame", "arch-onboard", "arch-review", "arch-wiki"];
const extraSkills = skillDirs.filter((name) => !expectedSkills.includes(name));
const missingSkills = expectedSkills.filter((name) => !skillDirs.includes(name));
if (missingSkills.length) {
  fail(`Missing v2 skill directories:\n${missingSkills.join("\n")}`);
}
if (extraSkills.length) {
  fail(`Unexpected v1 skill directories remain:\n${extraSkills.join("\n")}`);
}
for (const skill of expectedSkills) {
  const body = fs.readFileSync(path.join(root, "skills", skill, "SKILL.md"), "utf8");
  if (!body.startsWith("---\n") || !body.includes(`name: ${skill}`) || !body.includes("description:")) {
    fail(`Skill ${skill} missing required frontmatter`);
  }
}

const expectedEngineBins = [
  "preflight.js",
  "scan-project.js",
  "validate-phase-1.js",
  "compute-batches.js",
  "merge-batch-graphs.py",
  "validate-phase-3.js",
  "build-fingerprints.js",
  "extract-structure.js",
  "extract-import-map.js",
  "finalize-cross-repo.js",
  "merge-subdomain-graphs.py",
  "write-outputs.js"
  ,"analyze-workspace.js"
];
const binDir = path.join(root, "engine", "bin");
const missingBins = expectedEngineBins.filter((name) => !fs.existsSync(path.join(binDir, name)));
if (missingBins.length) {
  fail(`Missing engine bin entries:\n${missingBins.join("\n")}`);
}

const forkEvidence = [
  "engine/LICENSE-understand-anything",
  "engine/UPSTREAM-core-package.json",
  "engine/src/core/analyzer/graph-builder.ts",
  "engine/src/core/analyzer/layer-detector.ts",
  "engine/src/core/analyzer/normalize-graph.ts",
  "engine/src/core/fingerprint.ts",
  "engine/src/core/staleness.ts",
  "engine/src/core/ignore-filter.ts",
  "engine/upstream-tools/scan-project.mjs",
  "engine/upstream-tools/compute-batches.mjs",
  "engine/upstream-tools/merge-batch-graphs.py",
  "engine/tests/upstream-skill/test_scan_project.test.mjs"
];
const missingForkEvidence = forkEvidence.filter((rel) => !fs.existsSync(path.join(root, rel)));
if (missingForkEvidence.length) {
  fail(`Engine is missing Understand-Anything fork evidence:\n${missingForkEvidence.join("\n")}`);
}

const excludedForkFiles = [
  "engine/src/core/embedding-search.ts",
  "engine/src/core/analyzer/tour-generator.ts",
  "engine/src/core/analyzer/language-lesson.ts"
];
const presentExcluded = excludedForkFiles.filter((rel) => fs.existsSync(path.join(root, rel)));
if (presentExcluded.length) {
  fail(`Excluded UA features must not be in v2 engine:\n${presentExcluded.join("\n")}`);
}

const schemaFiles = listFiles("internal/schemas", (name) => name.endsWith(".schema.json"));
const expectedSchemas = ["cr.schema.json", "cross-repo.schema.json", "repo-knowledge-graph.schema.json", "repos.schema.json", "state.schema.json"];
if (schemaFiles.join("|") !== expectedSchemas.sort().join("|")) {
  fail(`Expected exactly 5 v2 schemas, found:\n${schemaFiles.join("\n")}`);
}
for (const schema of schemaFiles) readJson(path.join("internal/schemas", schema));

const gateFiles = listFiles("internal/acceptance", (name) => name.endsWith(".yaml"));
const expectedGates = ["audit.yaml", "design.yaml", "onboard.yaml", "wiki.yaml"];
if (gateFiles.join("|") !== expectedGates.sort().join("|")) {
  fail(`Expected exactly 4 acceptance gates, found:\n${gateFiles.join("\n")}`);
}

const agentFiles = listFiles("agents", (name) => /^arch-.*\.md$/.test(name));
if (agentFiles.length !== 9) {
  fail(`Expected 9 agents, found ${agentFiles.length}`);
}
for (const agent of agentFiles) {
  const body = fs.readFileSync(path.join(root, "agents", agent), "utf8");
  if (!body.includes("based_on:")) {
    fail(`Agent ${agent} missing based_on frontmatter`);
  }
  if (body.split(/\r?\n/).length < 100) {
    fail(`Agent ${agent} must contain a real prompt with at least 100 lines`);
  }
}

const rubricFiles = listFiles("internal/rubrics", (name) => name.endsWith(".yaml"));
if (rubricFiles.length !== 10) {
  fail(`Expected 10 rubrics, found ${rubricFiles.length}`);
}

const ruleTemplates = listFiles("templates/rules", (name) => name.endsWith(".md"));
const expectedRules = ["banned-patterns.md", "compliance.md", "dependencies.md", "naming.md", "network-boundaries.md", "tech-radar.md"];
if (ruleTemplates.join("|") !== expectedRules.sort().join("|")) {
  fail(`Expected 6 rule templates, found:\n${ruleTemplates.join("\n")}`);
}

const sampleWiki = listFiles("samples/.understand-arch/sample/wiki", (name) => name.endsWith(".md"));
const expectedWiki = ["README.md", "01-overview.md", "02-components.md", "03-interfaces.md", "04-data-models.md", "05-capabilities.md", "06-quality.md", "07-risks-and-debt.md", "08-deployments.md", "09-flows-and-scenarios.md", "10-decisions.md", "11-changes.md", "12-rules.md", "13-pending-changes.md", "14-diagrams.md"];
if (sampleWiki.join("|") !== expectedWiki.sort().join("|")) {
  fail(`Sample wiki must contain README + 14 pages, found:\n${sampleWiki.join("\n")}`);
}

const sampleRepoGraph = readJson("samples/.understand-arch/sample/specs/repos/sample/knowledge-graph.json");
if (sampleRepoGraph.version !== "2.0" || sampleRepoGraph.repo_id !== "sample") {
  fail("Sample repo graph must be version 2.0 and repo_id=sample");
}
for (const node of sampleRepoGraph.nodes ?? []) {
  if (!node.id?.startsWith("sample::") || node.repo_id !== "sample") {
    fail(`Sample node violates repo prefix invariant: ${JSON.stringify(node)}`);
  }
}
const sampleCrossRepo = readJson("samples/.understand-arch/sample/specs/cross-repo.json");
if (sampleCrossRepo.version !== "2.0" || !Array.isArray(sampleCrossRepo.repos) || sampleCrossRepo.repos.length !== 1) {
  fail("Sample cross-repo graph must mirror one sample repo");
}
readJson("samples/.understand-arch/sample/specs/repos/sample/.fingerprint.json");

const marketplace = readJson(".claude-plugin/marketplace.json");
const manifestSkills = marketplace.plugins?.[0]?.skills?.map((skillPath) => skillPath.replace("./skills/", "")).sort() ?? [];
if (manifestSkills.join("|") !== expectedSkills.join("|")) {
  fail(`Marketplace skills do not match v2 skills:\n${manifestSkills.join("\n")}`);
}

if (fs.existsSync(path.join(root, "arch"))) {
  fail("Top-level arch/ directory must not exist in v2");
}

const activeTextRoots = [".claude-plugin", "internal", "skills", "arch-library", "templates", "samples", "hooks"];
const stalePatterns = [
  "arch-brief",
  "arch-pack",
  "arch-radar",
  "arch-options",
  "arch-diff-judge",
  "specs/baseline.yaml",
  "~/.understand-arch/kb/",
  "generated/wiki",
  "generated/overview"
];
const staleHits = [];
for (const rel of activeTextRoots) {
  for (const full of walkFiles(rel)) {
    if (path.relative(root, full) === path.join("engine", "bin", "validate-v2-structure.js")) continue;
    const ext = path.extname(full).toLowerCase();
    if (![".md", ".json", ".yaml", ".yml", ".js", ".ts"].includes(ext)) continue;
    const text = fs.readFileSync(full, "utf8");
    for (const pattern of stalePatterns) {
      if (text.includes(pattern)) staleHits.push(`${path.relative(root, full)}: ${pattern}`);
    }
  }
}
if (staleHits.length) {
  fail(`Active v1 references remain:\n${staleHits.join("\n")}`);
}

console.log("v2 structure check passed");
