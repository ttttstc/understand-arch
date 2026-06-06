#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { inferArchDir } from "./project-paths.mjs";

const TARGET_CR_SECTIONS = [
  /^#{1,6}\s*(4(?:\.6)?|四)[\s.、-]*(详细设计|约束符合性|设计)/,
  /^#{1,6}\s*(5|五)[\s.、-]*(替代方案|方案对比)/,
  /^#{1,6}\s*(6|六)[\s.、-]*(风险|缓解)/,
  /^#{1,6}\s*(11|十一)[\s.、-]*(关联|ADR)/i,
];

const CATEGORY_BY_TEXT = [
  [/api|接口|契约/i, "api-contract"],
  [/依赖|边界|模块|调用/i, "dependency-rule"],
  [/风险|回滚|revert|hotfix/i, "risk-register"],
  [/测试|覆盖/i, "test-coverage-gap"],
  [/领域|状态|不变量/i, "domain-invariant"],
];

function readJson(path, fallback = undefined) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function walkMarkdown(dir) {
  if (!existsSync(dir)) return [];
  const files = [];
  const visit = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) files.push(path);
    }
  };
  visit(dir);
  return files.sort();
}

function changedDocsSince(root, since) {
  if (!since) return null;
  try {
    const output = execFileSync("git", ["diff", `${since}..HEAD`, "--name-only"], {
      cwd: root,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return new Set(output.split(/\r?\n/).map(normalizePath).filter((path) => /(?:CR|ADR).*\.md$/i.test(path) || /(?:change-requests|decisions).+\.md$/i.test(path)));
  } catch {
    return null;
  }
}

function selectedSections(markdown) {
  const lines = markdown.split(/\r?\n/);
  const chunks = [];
  let current = null;
  for (const line of lines) {
    if (/^#{1,6}\s+/.test(line)) {
      if (current) chunks.push(current);
      current = TARGET_CR_SECTIONS.some((pattern) => pattern.test(line)) ? { heading: line.trim(), lines: [line] } : null;
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) chunks.push(current);
  return chunks.map((chunk) => ({ heading: chunk.heading, text: chunk.lines.join("\n").trim() }));
}

export function collectDecisionSources(options = {}) {
  const archDir = inferArchDir(options);
  const workspaceRoot = resolve(options.projectRoot || process.cwd());
  const changed = changedDocsSince(workspaceRoot, options.since);
  const crFiles = walkMarkdown(join(archDir, "change-requests")).filter((path) => basename(path).toLowerCase() === "cr.md");
  const adrFiles = walkMarkdown(join(archDir, "decisions"));
  const sources = [];

  for (const path of [...crFiles, ...adrFiles]) {
    const rel = normalizePath(relative(archDir, path));
    if (changed && !changed.has(rel) && !changed.has(normalizePath(relative(workspaceRoot, path)))) continue;
    const text = readFileSync(path, "utf-8");
    sources.push({
      path: rel,
      type: rel.startsWith("change-requests/") ? "CR" : "ADR",
      title: text.match(/^#\s+(.+)$/m)?.[1]?.trim() || basename(path),
      selected_sections: rel.startsWith("change-requests/") ? selectedSections(text) : [{ heading: "ADR", text }],
    });
  }

  const doc = { version: "3.4", generated_at: new Date().toISOString(), sources };
  writeJson(join(archDir, "intermediate", "decision-extractor-input.json"), doc);
  return { archDir, sources, inputPath: join(archDir, "intermediate", "decision-extractor-input.json") };
}

function inferCategory(text) {
  for (const [pattern, category] of CATEGORY_BY_TEXT) {
    if (pattern.test(text)) return category;
  }
  return "unknown";
}

function nextConstraintId(existingIds, offset) {
  const max = [...existingIds]
    .map((id) => Number(String(id).match(/^CON-(\d+)$/)?.[1] || 0))
    .reduce((a, b) => Math.max(a, b), 0);
  return `CON-${String(max + offset).padStart(3, "0")}`;
}

function existingConstraintIds(archDir) {
  const ids = new Set();
  for (const file of walkMarkdown(join(archDir, "rules", "constraints"))) {
    const text = readFileSync(file, "utf-8");
    for (const match of text.matchAll(/\bCON-\d{3,}\b/g)) ids.add(match[0]);
  }
  return ids;
}

export function extractStructuredConstraints(inputDoc, options = {}) {
  const archDir = inferArchDir(options);
  const existingIds = existingConstraintIds(archDir);
  const constraints = [];
  let generated = 1;

  for (const source of inputDoc.sources || []) {
    for (const section of source.selected_sections || []) {
      for (const line of section.text.split(/\r?\n/)) {
        const row = parseConstraintTableRow(line);
        if (!row) continue;
        const id = row.id || nextConstraintId(existingIds, generated++);
        existingIds.add(id);
        constraints.push({
          id,
          title: row.title || "CR 回流约束",
          category: row.category || inferCategory(`${row.title} ${row.constraint}`),
          constraint: row.constraint,
          basis: row.basis || `${source.path} ${section.heading}`,
          evidence_level: row.evidence_level || "observed",
          evidence_refs: row.evidence_refs.length ? row.evidence_refs : [source.path],
          violation_check: row.violation_check || "",
          status: "proposed",
          source: "cr-derived",
          note: `由 ${source.type} 回流:${source.path}`,
        });
      }
    }
  }
  return constraints;
}

function parseConstraintTableRow(line) {
  if (!line.includes("|") || /---/.test(line)) return null;
  const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean);
  const idIndex = cells.findIndex((cell) => /^CON-\d{3,}$/.test(cell));
  if (idIndex === -1) return null;
  const [id, title, constraint, basis, violation, category] = cells.slice(idIndex);
  if (!constraint || /^约束$|^constraint$/i.test(constraint)) return null;
  return {
    id,
    title,
    constraint,
    basis,
    violation_check: violation,
    category,
    evidence_refs: extractEvidenceRefs(`${basis || ""} ${constraint || ""}`),
  };
}

function extractEvidenceRefs(text) {
  const refs = [];
  for (const match of text.matchAll(/[a-zA-Z0-9_.\/-]+\.[a-zA-Z0-9]+(?::\d+)?/g)) refs.push(normalizePath(match[0]));
  for (const match of text.matchAll(/[a-zA-Z0-9_.-]+::[a-zA-Z0-9_./:-]+/g)) refs.push(match[0]);
  return [...new Set(refs)];
}

export function mergeDecisionConstraints(options = {}) {
  const archDir = inferArchDir(options);
  const inputDoc = readJson(options.inputPath || join(archDir, "intermediate", "decision-extractor-input.json"), { sources: [] });
  const outputDoc = readJson(options.outputPath || join(archDir, "intermediate", "decision-extractor-output.json"), null);
  const fromStructured = extractStructuredConstraints(inputDoc, { archDir });
  const fromSubagent = (outputDoc?.constraints || outputDoc?.proposed_constraints || []).map((constraint) => ({
    ...constraint,
    status: "proposed",
    source: "cr-derived",
    evidence_level: constraint.evidence_level === "confirmed" ? "observed" : (constraint.evidence_level || "observed"),
  }));
  const byId = new Map();
  for (const constraint of [...fromStructured, ...fromSubagent]) byId.set(constraint.id, constraint);
  const constraints = [...byId.values()];

  const existing = readJson(join(archDir, "intermediate", "constraint-mine.json"), {});
  const merged = {
    constraints: dedupeById([...(existing.constraints || []), ...constraints]),
    suspicious_findings: existing.suspicious_findings || [],
    coding_conventions: existing.coding_conventions || [],
  };
  writeJson(join(archDir, "intermediate", "constraint-mine.json"), merged);
  if (options.writeConstraints !== false) {
    execFileSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "constraint-writer.mjs"), options.projectRoot || process.cwd()], {
      env: { ...process.env, ARCH_PROJECT_ROOT: archDir },
      stdio: ["ignore", "pipe", "pipe"],
    });
  }
  return { archDir, proposed_count: constraints.length, constraints, constraintMinePath: join(archDir, "intermediate", "constraint-mine.json") };
}

function dedupeById(items) {
  const byId = new Map();
  for (const item of items) byId.set(item.id, item);
  return [...byId.values()];
}

export function runDecisionExtractor(options = {}) {
  const collected = collectDecisionSources(options);
  const merged = mergeDecisionConstraints({ ...options, archDir: collected.archDir, inputPath: collected.inputPath });
  return { ...collected, ...merged };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command = "run", ...rest] = process.argv.slice(2);
  const args = Object.fromEntries(rest.map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.length ? value.join("=") : true];
  }));
  const options = {
    archDir: args["arch-dir"],
    projectRoot: args.workspace,
    projectId: args.project,
    since: args.since,
    outputPath: args.output,
    writeConstraints: args["no-write"] ? false : true,
  };
  const result = command === "collect"
    ? collectDecisionSources(options)
    : command === "merge"
      ? mergeDecisionConstraints(options)
      : runDecisionExtractor(options);
  console.log(JSON.stringify({
    archDir: result.archDir,
    inputPath: result.inputPath,
    constraintMinePath: result.constraintMinePath,
    source_count: result.sources?.length,
    proposed_count: result.proposed_count,
  }, null, 2));
}
