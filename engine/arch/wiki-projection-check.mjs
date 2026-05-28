#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const archDir = resolve(process.argv[2] || ".");
const layerPath = process.argv[3] ? resolve(process.argv[3]) : join(archDir, "specs", "arch-layer.json");
const wikiDir = process.argv[4] ? resolve(process.argv[4]) : join(archDir, "wiki");

const placeholders = [/TODO/i, /待补充/, /placeholder/i, /lorem ipsum/i, /默认 Mermaid/, /TBD/i];
const layer = JSON.parse(readFileSync(layerPath, "utf-8"));
const findings = [];

function readWiki(name) {
  const path = join(wikiDir, name);
  return existsSync(path) ? readFileSync(path, "utf-8") : "";
}

function requireProjection(items, file, labelKey) {
  if (!Array.isArray(items) || items.length === 0) return;
  const text = readWiki(file);
  if (!text) {
    findings.push({ severity: "high", message: `${file} missing but ${items.length} items require projection` });
    return;
  }
  for (const item of items) {
    const label = item[labelKey] || item.title || item.type || item.id;
    if (label && !text.includes(label)) {
      findings.push({ severity: "medium", message: `${file} does not mention ${label}` });
    }
  }
}

for (const file of [
  "01-overview.md",
  "02-components.md",
  "03-interfaces.md",
  "04-data-models.md",
  "05-capabilities.md",
  "06-quality.md",
  "07-risks-and-debt.md",
  "08-deployments.md",
  "09-flows-and-scenarios.md",
  "10-decisions.md",
  "11-changes.md",
  "12-rules.md",
  "13-pending-changes.md",
  "14-diagrams.md",
]) {
  const text = readWiki(file);
  for (const pattern of placeholders) {
    if (pattern.test(text)) findings.push({ severity: "high", message: `${file} contains placeholder text matching ${pattern}` });
  }
}

requireProjection(layer.capabilities, "05-capabilities.md", "name");
requireProjection(layer.quality_attributes, "06-quality.md", "type");
requireProjection(layer.risks, "07-risks-and-debt.md", "title");
requireProjection(layer.technical_debt, "07-risks-and-debt.md", "title");
requireProjection(layer.architecture_decisions, "10-decisions.md", "title");
requireProjection(layer.change_requests, "11-changes.md", "title");

console.log(JSON.stringify({ ok: findings.length === 0, findings }, null, 2));
if (findings.length) process.exit(1);
