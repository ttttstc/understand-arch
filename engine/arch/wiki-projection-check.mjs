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
const inlineEvidencePattern = /\[evidence:\s*[^\]]+\]/i;
const evidenceHeadingPattern = /^##\s+证据来源\s*$/m;

const sliceFiles = [
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
];

const chapterTitles = [
  "01 总览",
  "02 组件职责与模块",
  "03 接口与集成",
  "04 数据模型与边界",
  "05 能力地图",
  "06 质量属性",
  "07 风险与技术债",
  "08 运行与部署",
  "09 流程与场景",
  "10 架构决策",
  "11 变更记录",
  "12 规则与约束",
  "13 待确认事项",
  "14 图示",
];

function readWiki(name) {
  const path = join(wikiDir, name);
  return existsSync(path) ? readFileSync(path, "utf-8") : "";
}

function sizeOf(name) {
  const text = readWiki(name);
  return Buffer.byteLength(text, "utf-8");
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
      findings.push({ severity: "medium", code: "F6", message: `${file} does not mention ${label}` });
    }
  }
}

function checkFile(file) {
  const text = readWiki(file);
  if (!text) {
    findings.push({ severity: "high", code: "F1", message: `${file} missing` });
    return;
  }
  if (!timestampPattern.test(text)) {
    findings.push({ severity: "high", code: "F2", message: `${file} missing timestamp/source line` });
  }
  for (const pattern of placeholders) {
    if (pattern.test(text)) findings.push({ severity: "high", code: "F5", message: `${file} contains placeholder text matching ${pattern}` });
  }
  if (inlineEvidencePattern.test(text)) {
    findings.push({ severity: "high", code: "F3", message: `${file} contains inline [evidence:] text; wiki must not render evidence` });
  }
  if (evidenceHeadingPattern.test(text)) {
    findings.push({ severity: "high", code: "F3", message: `${file} contains ## 证据来源; wiki must not render evidence tables` });
  }
}

checkFile("ARCHITECTURE.md");
for (const file of sliceFiles) checkFile(file);

const architecture = readWiki("ARCHITECTURE.md");
for (const title of chapterTitles) {
  if (!architecture.includes(`# ${title}`)) {
    findings.push({ severity: "high", code: "F7", message: `ARCHITECTURE.md missing chapter ${title}` });
  }
}
if (!/##\s+目录/.test(architecture)) {
  findings.push({ severity: "high", code: "F7", message: "ARCHITECTURE.md missing table of contents" });
}
if (/Executive Summary|Architecture Style|Tech Stack|System Shape|Decisions, Changes/i.test(architecture)) {
  findings.push({ severity: "medium", code: "P0-1", message: "ARCHITECTURE.md still contains English summary chapter titles" });
}

const architectureSize = sizeOf("ARCHITECTURE.md");
const sliceSize = sliceFiles.reduce((total, file) => total + sizeOf(file), 0);
if (sliceSize > 0 && architectureSize < sliceSize * 0.75) {
  findings.push({
    severity: "high",
    code: "F7",
    message: `ARCHITECTURE.md is too thin: ${architectureSize} bytes vs ${sliceSize} bytes in slices`,
  });
}

requireProjection(layer.component_profiles, "02-components.md", "name");
requireProjection(layer.component_profiles, "ARCHITECTURE.md", "name");
if (layer.architecture_style?.primary && !architecture.includes(layer.architecture_style.primary)) {
  findings.push({ severity: "medium", code: "F6", message: `ARCHITECTURE.md does not mention architecture style ${layer.architecture_style.primary}` });
}
requireProjection(layer.tech_stack, "ARCHITECTURE.md", "name");
requireProjection(layer.external_dependencies, "03-interfaces.md", "name");
requireProjection(layer.boundaries, "04-data-models.md", "name");
requireProjection(layer.capabilities, "05-capabilities.md", "name");
requireProjection(layer.capabilities, "ARCHITECTURE.md", "name");
requireProjection(layer.flows, "09-flows-and-scenarios.md", "name");
requireProjection(layer.quality_attributes, "06-quality.md", "type");
requireProjection(layer.risks, "07-risks-and-debt.md", "title");
requireProjection(layer.technical_debt, "07-risks-and-debt.md", "title");
requireProjection(layer.complexity_hotspots, "07-risks-and-debt.md", "title");
requireProjection(layer.extension_constraints, "06-quality.md", "title");
requireProjection(layer.architecture_decisions, "10-decisions.md", "title");
requireProjection(layer.change_requests, "11-changes.md", "title");

for (const item of [...(layer.quality_attributes || []), ...(layer.risks || []), ...(layer.technical_debt || [])]) {
  const refs = Array.isArray(item.evidence_refs) ? item.evidence_refs.map(String) : [];
  if (refs.length === 0) {
    findings.push({ severity: "high", code: "F3", message: `${item.id || item.title || item.type} missing arch-layer evidence_refs` });
    continue;
  }
  if (refs.some((ref) => /^(risk|qa|debt):/.test(ref))) {
    findings.push({ severity: "high", code: "F3", message: `${item.id || item.title || item.type} evidence_refs contains internal ids` });
  }
  if (!refs.some((ref) => /^[^:]+::(file|function|class|module|service|endpoint|schema|table|resource|document):/.test(ref) || /\.(?:[cm]?[jt]sx?|tsx?|vue|svelte|css|scss|html|json|ya?ml|toml|md|py|go|rs|java|kt|cs|cpp|c|h)(?::\d+)?$/i.test(ref))) {
    findings.push({ severity: "high", code: "F3", message: `${item.id || item.title || item.type} evidence_refs must include code graph node id or source file path` });
  }
}

console.log(JSON.stringify({
  ok: findings.length === 0,
  architecture_bytes: architectureSize,
  slice_bytes: sliceSize,
  ratio: sliceSize === 0 ? 0 : Math.round((architectureSize / sliceSize) * 1000) / 1000,
  findings,
}, null, 2));
if (findings.length) process.exit(1);
