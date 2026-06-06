#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { inferArchDir, resolveWorkspaceRoot } from "./project-paths.mjs";

const command = process.argv[2] || "init";
const projectRoot = resolveWorkspaceRoot(process.argv[3] || ".");
const projectId = process.env.ARCH_PROJECT_ID || basename(projectRoot);
const archDir = inferArchDir({ projectRoot, projectId });
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
  ensureTour(layer);
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

function ensureTour(layer) {
  if (Array.isArray(layer.tour) && layer.tour.length > 0) return;
  const steps = [];
  const styleRefs = asArray(layer.architecture_style?.evidence_refs);
  if (layer.architecture_style?.primary) {
    steps.push({
      order: steps.length + 1,
      title: "架构风格与边界",
      description: `从 ${layer.architecture_style.primary} 的判断进入系统，先理解主要组件如何组织以及当前取舍。`,
      nodeIds: unique([...styleRefs, ...itemRefs(layer.component_profiles).slice(0, 5)]),
    });
  }
  if (asArray(layer.capabilities).length > 0) {
    steps.push({
      order: steps.length + 1,
      title: "核心能力链路",
      description: "沿能力地图查看系统为用户提供的主要价值，以及每项能力背后的支撑节点。",
      nodeIds: unique([...layer.capabilities.slice(0, 6).map((item) => item.id), ...itemRefs(layer.capabilities).slice(0, 8)]),
    });
  }
  if (asArray(layer.flows).length > 0) {
    steps.push({
      order: steps.length + 1,
      title: "关键流程",
      description: "按运行流程理解组件协作、输入输出和容易受变更影响的路径。",
      nodeIds: unique([...layer.flows.slice(0, 4).map((item) => item.id), ...itemRefs(layer.flows).slice(0, 8)]),
    });
  }
  if (asArray(layer.risks).length > 0 || asArray(layer.technical_debt).length > 0) {
    steps.push({
      order: steps.length + 1,
      title: "风险与演进约束",
      description: "最后聚焦风险、技术债和扩展约束，判断后续设计需要优先保护的边界。",
      nodeIds: unique([
        ...layer.risks.slice(0, 4).map((item) => item.id),
        ...layer.technical_debt.slice(0, 4).map((item) => item.id),
        ...itemRefs(layer.risks).slice(0, 6),
        ...itemRefs(layer.technical_debt).slice(0, 6),
      ]),
    });
  }
  layer.tour = steps.filter((step) => step.nodeIds.length > 0);
}

function itemRefs(items) {
  return asArray(items).flatMap((item) => itemNodeIds(item));
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value).trim() !== "").map(String))];
}

function writeLayer(layer) {
  mkdirSync(dirname(layerPath), { recursive: true });
  writeFileSync(layerPath, `${JSON.stringify(layer, null, 2)}\n`, "utf-8");
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function itemNodeIds(item) {
  return [
    ...asArray(item.node_ids),
    ...asArray(item.nodeIds),
    ...asArray(item.supporting_node_ids),
    ...asArray(item.inside_node_ids),
    ...asArray(item.evidence_refs).filter((ref) => typeof ref === "string" && ref.includes("::")),
    ...asArray(item.steps).flatMap((step) => [...asArray(step.node_ids), ...asArray(step.nodeIds)]),
  ];
}

function touchesSubset(item, subsetIds) {
  if (!subsetIds || subsetIds.size === 0) return true;
  return itemNodeIds(item).some((id) => subsetIds.has(id));
}

export function mergeLayerPatch(layer, patch) {
  const subsetMode = Boolean(patch.subset_mode);
  const subsetIds = new Set(asArray(patch.subset_arch_node_ids));
  const payload = patch.patch && typeof patch.patch === "object" ? patch.patch : patch;

  for (const key of Object.keys(payload)) {
    if (key === "subset_mode" || key === "subset_arch_node_ids" || key === "previous_arch_layer" || key === "patch") continue;
    if (Array.isArray(layer[key]) && Array.isArray(payload[key])) {
      const incoming = subsetMode ? payload[key].filter((item) => touchesSubset(item, subsetIds)) : payload[key];
      const byId = new Map(layer[key].map((item) => [item.id || JSON.stringify(item), item]));
      for (const item of incoming) byId.set(item.id || JSON.stringify(item), item);
      layer[key] = [...byId.values()];
    } else if (key === "architecture_style" && payload[key] && typeof payload[key] === "object") {
      layer[key] = { ...layer[key], ...payload[key] };
    } else if (key === "project" || key === "freshness") {
      layer[key] = { ...layer[key], ...payload[key] };
    }
  }
  return layer;
}

if (command === "init") {
  const layer = readJson(layerPath, emptyLayer());
  writeLayer(validateShape(layer));
  console.log(layerPath);
} else if (command === "validate") {
  validateShape(readJson(layerPath));
  console.log("arch-layer ok");
} else if (command === "repair") {
  const layer = validateShape(readJson(layerPath));
  writeLayer(layer);
  console.log(layerPath);
} else if (command === "merge") {
  const patchPath = process.argv[5] ? resolve(process.argv[5]) : null;
  if (!patchPath) throw new Error("merge requires a patch JSON path");
  const layer = readJson(layerPath, emptyLayer());
  const patch = readJson(patchPath, {});
  mergeLayerPatch(layer, patch);
  writeLayer(validateShape(layer));
  console.log(layerPath);
} else {
  throw new Error(`Unknown command: ${command}`);
}
