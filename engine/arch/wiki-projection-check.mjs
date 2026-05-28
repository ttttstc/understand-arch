#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const archDir = resolve(process.argv[2] || ".");
const layerPath = process.argv[3] ? resolve(process.argv[3]) : join(archDir, "specs", "arch-layer.json");
const wikiDir = process.argv[4] ? resolve(process.argv[4]) : join(archDir, "wiki");

const placeholders = [/TODO/i, /待补充/, /占位/, /placeholder/i, /lorem ipsum/i, /默认 Mermaid/, /TBD/i];
const layer = JSON.parse(readFileSync(layerPath, "utf-8"));
const findings = [];
const timestampPattern = />\s*生成时间:.+基于 commit:.+事实源:/;

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
  "ARCHITECTURE.md",
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
  if (!text) {
    findings.push({ severity: "high", code: "F1", message: `${file} missing` });
    continue;
  }
  if (!timestampPattern.test(text)) {
    findings.push({ severity: "high", code: "F2", message: `${file} missing timestamp/source line` });
  }
  for (const pattern of placeholders) {
    if (pattern.test(text)) findings.push({ severity: "high", code: "F5", message: `${file} contains placeholder text matching ${pattern}` });
  }
  if (!/\[evidence:\s*[^\]]+\]/.test(text)) {
    findings.push({ severity: "medium", code: "F3", message: `${file} has no evidence refs` });
  }
}

if (!/## 1\. Executive Summary/.test(readWiki("ARCHITECTURE.md")) || !/## 5\. Quality, Risk, And Change Constraints/.test(readWiki("ARCHITECTURE.md"))) {
  findings.push({ severity: "high", code: "F7", message: "ARCHITECTURE.md missing required long-form chapters" });
}

requireProjection(layer.component_profiles, "02-components.md", "name");
requireProjection(layer.component_profiles, "ARCHITECTURE.md", "name");
if (layer.architecture_style?.primary && !readWiki("ARCHITECTURE.md").includes(layer.architecture_style.primary)) {
  findings.push({ severity: "medium", code: "F6", message: `ARCHITECTURE.md does not mention architecture style ${layer.architecture_style.primary}` });
}
requireProjection(layer.tech_stack, "ARCHITECTURE.md", "name");
requireProjection(layer.external_dependencies, "03-interfaces.md", "name");
requireProjection(layer.boundaries, "04-data-models.md", "name");
requireProjection(layer.capabilities, "05-capabilities.md", "name");
requireProjection(layer.flows, "09-flows-and-scenarios.md", "name");
requireProjection(layer.quality_attributes, "06-quality.md", "type");
requireProjection(layer.risks, "07-risks-and-debt.md", "title");
requireProjection(layer.technical_debt, "07-risks-and-debt.md", "title");
requireProjection(layer.complexity_hotspots, "07-risks-and-debt.md", "title");
requireProjection(layer.extension_constraints, "06-quality.md", "title");
requireProjection(layer.architecture_decisions, "10-decisions.md", "title");
requireProjection(layer.change_requests, "11-changes.md", "title");

console.log(JSON.stringify({ ok: findings.length === 0, findings }, null, 2));
if (findings.length) process.exit(1);
