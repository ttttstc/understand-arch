#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const command = process.argv[2] || "init";
const projectRoot = resolve(process.argv[3] || ".");
const projectId = process.env.ARCH_PROJECT_ID || basename(projectRoot);
const archDir = process.env.ARCH_PROJECT_ROOT || join(projectRoot, ".understand-arch", projectId);
const layerPath = process.argv[4] ? resolve(process.argv[4]) : join(archDir, "specs", "arch-layer.json");

function emptyLayer() {
  const now = new Date().toISOString();
  return {
    version: "3.0",
    project: {
      name: projectId,
      description: "",
      analyzed_at: now,
      repos: [
        {
          repo_id: projectId,
          name: projectId,
          path: projectRoot,
          graph_path: join(archDir, "specs", "repos", projectId, "knowledge-graph.json"),
        },
      ],
    },
    architecture_style: {
      primary: "unknown",
      secondary: [],
      rationale: "Architecture style has not been inferred yet.",
      tradeoffs: [],
      confidence: "low",
      evidence_refs: [`repo:${projectId}`],
    },
    component_profiles: [],
    tech_stack: [],
    flows: [],
    complexity_hotspots: [],
    extension_constraints: [],
    external_dependencies: [],
    boundaries: [],
    cross_edges: [],
    capabilities: [],
    quality_attributes: [],
    risks: [],
    technical_debt: [],
    architecture_decisions: [],
    change_requests: [],
    traceability: [],
    known_unknowns: [],
    tour: [],
    freshness: {
      generated_at: now,
      repos: [
        {
          repo_id: projectId,
          fingerprint_path: join(archDir, "specs", "repos", projectId, ".fingerprint.json"),
        },
      ],
    },
  };
}

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function requireArray(layer, key) {
  if (!Array.isArray(layer[key])) throw new Error(`${key} must be an array`);
}

function validateShape(layer) {
  if (layer.version !== "3.0") throw new Error('version must be "3.0"');
  if (!layer.project || typeof layer.project !== "object") throw new Error("project is required");
  for (const key of [
    "component_profiles",
    "tech_stack",
    "flows",
    "complexity_hotspots",
    "extension_constraints",
    "external_dependencies",
    "boundaries",
    "cross_edges",
    "capabilities",
    "quality_attributes",
    "risks",
    "technical_debt",
    "architecture_decisions",
    "change_requests",
    "traceability",
    "known_unknowns",
  ]) {
    requireArray(layer, key);
  }
  if (!layer.architecture_style || typeof layer.architecture_style !== "object") {
    throw new Error("architecture_style is required");
  }
  requireInference(layer.architecture_style, "architecture_style");
  for (const capability of layer.capabilities) {
    requireInference(capability, `capability ${capability.id || capability.name || "<unknown>"}`);
  }
  for (const risk of layer.risks) {
    requireInference(risk, `risk ${risk.id || risk.title || "<unknown>"}`);
    requireCodeEvidence(risk, `risk ${risk.id || risk.title || "<unknown>"}`);
  }
  for (const qa of layer.quality_attributes) {
    requireInference(qa, `quality attribute ${qa.id || qa.type || "<unknown>"}`);
    requireCodeEvidence(qa, `quality attribute ${qa.id || qa.type || "<unknown>"}`);
  }
  for (const key of [
    "component_profiles",
    "tech_stack",
    "flows",
    "complexity_hotspots",
    "extension_constraints",
    "external_dependencies",
    "boundaries",
  ]) {
    for (const item of layer[key]) requireInference(item, `${key} ${item.id || item.name || item.title || "<unknown>"}`);
  }
  for (const debt of layer.technical_debt) {
    requireInference(debt, `technical debt ${debt.id || debt.title || "<unknown>"}`);
    requireCodeEvidence(debt, `technical debt ${debt.id || debt.title || "<unknown>"}`);
  }
  return layer;
}

function requireInference(item, label) {
  if (!item.confidence || !Array.isArray(item.evidence_refs) || item.evidence_refs.length === 0) {
    throw new Error(`${label} missing confidence/evidence_refs`);
  }
}

function requireCodeEvidence(item, label) {
  const refs = Array.isArray(item.evidence_refs) ? item.evidence_refs.map(String) : [];
  if (refs.some((ref) => /^(risk|qa|debt):/.test(ref))) {
    throw new Error(`${label} evidence_refs must not use arch-layer internal ids`);
  }
  if (!refs.some(isCodeEvidenceRef)) {
    throw new Error(`${label} evidence_refs must include code graph node id or source file path`);
  }
}

function isCodeEvidenceRef(ref) {
  if (/^[^:]+::(file|function|class|module|service|endpoint|schema|table|resource|document):/.test(ref)) return true;
  if (/\.(?:[cm]?[jt]sx?|tsx?|vue|svelte|css|scss|html|json|ya?ml|toml|md|py|go|rs|java|kt|cs|cpp|c|h)(?::\d+)?$/i.test(ref)) return true;
  return false;
}

function writeLayer(layer) {
  mkdirSync(dirname(layerPath), { recursive: true });
  writeFileSync(layerPath, `${JSON.stringify(layer, null, 2)}\n`, "utf-8");
}

if (command === "init") {
  const layer = readJson(layerPath, emptyLayer());
  writeLayer(validateShape(layer));
  console.log(layerPath);
} else if (command === "validate") {
  validateShape(readJson(layerPath));
  console.log("arch-layer ok");
} else if (command === "merge") {
  const patchPath = process.argv[5] ? resolve(process.argv[5]) : null;
  if (!patchPath) throw new Error("merge requires a patch JSON path");
  const layer = readJson(layerPath, emptyLayer());
  const patch = readJson(patchPath, {});
  for (const key of Object.keys(patch)) {
    if (Array.isArray(layer[key]) && Array.isArray(patch[key])) {
      const byId = new Map(layer[key].map((item) => [item.id || JSON.stringify(item), item]));
      for (const item of patch[key]) byId.set(item.id || JSON.stringify(item), item);
      layer[key] = [...byId.values()];
    } else if (key === "architecture_style" && patch[key] && typeof patch[key] === "object") {
      layer[key] = { ...layer[key], ...patch[key] };
    } else if (key === "project" || key === "freshness") {
      layer[key] = { ...layer[key], ...patch[key] };
    }
  }
  writeLayer(validateShape(layer));
  console.log(layerPath);
} else {
  throw new Error(`Unknown command: ${command}`);
}
