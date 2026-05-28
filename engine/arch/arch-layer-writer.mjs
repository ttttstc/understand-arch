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
  for (const capability of layer.capabilities) {
    if (!capability.confidence || !Array.isArray(capability.evidence_refs) || capability.evidence_refs.length === 0) {
      throw new Error(`capability ${capability.id || capability.name || "<unknown>"} missing confidence/evidence_refs`);
    }
  }
  for (const risk of layer.risks) {
    if (!risk.confidence || !Array.isArray(risk.evidence_refs) || risk.evidence_refs.length === 0) {
      throw new Error(`risk ${risk.id || risk.title || "<unknown>"} missing confidence/evidence_refs`);
    }
  }
  for (const qa of layer.quality_attributes) {
    if (!qa.confidence || !Array.isArray(qa.evidence_refs) || qa.evidence_refs.length === 0) {
      throw new Error(`quality attribute ${qa.id || qa.type || "<unknown>"} missing confidence/evidence_refs`);
    }
  }
  return layer;
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
    } else if (key === "project" || key === "freshness") {
      layer[key] = { ...layer[key], ...patch[key] };
    }
  }
  writeLayer(validateShape(layer));
  console.log(layerPath);
} else {
  throw new Error(`Unknown command: ${command}`);
}
