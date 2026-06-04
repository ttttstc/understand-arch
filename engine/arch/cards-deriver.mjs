#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const CARD_TYPES = [
  "ComponentCard",
  "CapabilityCard",
  "InterfaceCard",
  "DataModelCard",
  "FlowCard",
  "RiskCard",
  "ConstraintCard",
  "DecisionCard",
  "ApiContractCard",
  "DbSchemaCard",
  "IntegrationCard",
  "ProjectContextCard",
];

const CARD_SCHEMA = "internal/schemas/agent-card.schema.json";
const COMPONENT_NODE_TYPES = new Set(["component", "module", "service", "package", "layer"]);
const INTERFACE_NODE_TYPES = new Set(["interface", "endpoint", "api", "route"]);
const DATA_NODE_TYPES = new Set(["data-model", "schema", "table", "entity", "model"]);
const INTEGRATION_NODE_TYPES = new Set(["service", "resource", "config"]);

function readJson(path, fallback = undefined) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function hashValue(value) {
  const stable = typeof value === "string" ? value : JSON.stringify(sortKeys(value));
  return `sha256:${createHash("sha256").update(stable).digest("hex")}`;
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]));
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value).trim() !== "").map(String))];
}

function slug(value) {
  const text = String(value || "unknown")
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase()
    .replace(/[^a-z0-9_.:-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return text || "unknown";
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function inferArchDir(options = {}) {
  if (options.archDir) return resolve(options.archDir);
  if (process.env.ARCH_PROJECT_ROOT) return resolve(process.env.ARCH_PROJECT_ROOT);
  const projectRoot = resolve(options.projectRoot || process.cwd());
  const projectId = options.projectId || process.env.ARCH_PROJECT_ID || basename(projectRoot);
  return join(projectRoot, ".understand-arch", projectId);
}

function loadGraphs(archDir, archLayer) {
  const reposPath = join(archDir, "specs", "repos.json");
  const reposDoc = readJson(reposPath, null);
  const reposFromDoc = Array.isArray(reposDoc) ? reposDoc : asArray(reposDoc?.repos);
  const reposFromLayer = asArray(archLayer?.project?.repos);
  const repos = reposFromDoc.length > 0 ? reposFromDoc : reposFromLayer;
  const graphByRepo = new Map();
  const nodesById = new Map();
  const repoRoots = [];

  for (const repo of repos) {
    const repoId = repo.repo_id || repo.id || repo.name || basename(repo.path || "");
    const repoRoot = resolveMaybe(archDir, repo.path || repo.root || ".");
    const graphPath = repo.graph_path
      ? resolveMaybe(archDir, repo.graph_path)
      : join(archDir, "specs", "repos", repoId, "knowledge-graph.json");
    if (!existsSync(graphPath)) continue;
    const graph = readJson(graphPath, { nodes: [], edges: [] });
    graphByRepo.set(repoId, { repoId, repoRoot, graphPath, graph });
    repoRoots.push({ repoId, repoRoot });
    for (const node of asArray(graph.nodes)) nodesById.set(node.id, { ...node, repoId, repoRoot });
  }

  if (graphByRepo.size === 0) {
    const reposRoot = join(archDir, "specs", "repos");
    if (existsSync(reposRoot)) {
      for (const entry of readdirSync(reposRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const graphPath = join(reposRoot, entry.name, "knowledge-graph.json");
        if (!existsSync(graphPath)) continue;
        const graph = readJson(graphPath, { nodes: [], edges: [] });
        const repoRoot = resolveMaybe(archDir, graph.project?.root || ".");
        graphByRepo.set(entry.name, { repoId: entry.name, repoRoot, graphPath, graph });
        repoRoots.push({ repoId: entry.name, repoRoot });
        for (const node of asArray(graph.nodes)) nodesById.set(node.id, { ...node, repoId: entry.name, repoRoot });
      }
    }
  }

  return { graphByRepo, nodesById, repoRoots };
}

function resolveMaybe(base, value) {
  if (!value) return base;
  return resolve(String(value).replace(/\\/g, "/").match(/^[a-zA-Z]:\//) ? String(value) : join(base, String(value)));
}

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function nodeFiles(nodeIds, nodesById) {
  return unique(nodeIds.map((id) => normalizePath(nodesById.get(id)?.filePath || nodesById.get(id)?.path)));
}

function evidenceFilePath(ref, nodesById) {
  const value = normalizePath(ref);
  if (!value || nodesById.has(value)) return null;
  if (/^[^/\\:]+::/.test(value)) return null;
  if (/^(risk|qa|debt|cap|component|flow|constraint|adr):/i.test(value)) return null;
  if (!value.includes("/") && !value.includes("\\")) return null;
  return value.replace(/:(\d+)(?::\d+)?$/, "");
}

function evidenceNodeIds(item, nodesById) {
  const direct = [
    ...asArray(item.node_ids),
    ...asArray(item.nodeIds),
    ...asArray(item.supporting_node_ids),
    ...asArray(item.inside_node_ids),
  ];
  for (const ref of asArray(item.evidence_refs)) {
    if (nodesById.has(ref)) direct.push(ref);
  }
  for (const step of asArray(item.steps)) direct.push(...asArray(step.node_ids), ...asArray(step.nodeIds));
  return unique(direct);
}

function anchorsFor(item, nodesById) {
  const graphNodeIds = evidenceNodeIds(item, nodesById);
  const filePaths = unique([
    ...nodeFiles(graphNodeIds, nodesById),
    ...asArray(item.file_paths).map(normalizePath),
    ...asArray(item.files).map(normalizePath),
    ...asArray(item.evidence_refs).map((ref) => evidenceFilePath(ref, nodesById)),
  ]);
  const lineRanges = asArray(item.line_ranges).filter((range) => Array.isArray(range) && range.length === 2);
  return {
    graph_node_ids: graphNodeIds,
    file_paths: filePaths,
    line_ranges: lineRanges,
  };
}

function evidenceLevel(item, fallback = "observed") {
  const level = item.evidence_level || item.evidenceLevel;
  if (["confirmed", "observed", "inferred", "uncertain", "conflicted"].includes(level)) return level;
  if (item.confidence === "high") return "inferred";
  if (item.confidence === "low") return "uncertain";
  return fallback;
}

function card(kind, source, fields) {
  const stableId = normalizeCardLocalId(kind, fields.stableId || source.id || fields.title);
  const summary = fields.focused_summary || focusedSummary(kind, source, fields);
  return {
    $schema: CARD_SCHEMA,
    id: `card:${kind}:${stableId}`,
    type: fields.type,
    title: fields.title || source.name || source.title || source.id,
    focused_summary: summary,
    anchors: fields.anchors || { graph_node_ids: [], file_paths: [], line_ranges: [] },
    semantic_tags: unique(fields.semantic_tags || []),
    related_card_ids: unique(fields.related_card_ids || []),
    evidence_level: fields.evidence_level || evidenceLevel(source),
    source_artifact: fields.source_artifact,
    source_hash: hashValue(source),
  };
}

function focusedSummary(kind, source, fields) {
  const title = fields.title || source.name || source.title || source.id || kind;
  const text = firstSummaryText([
    source.focused_summary,
    source.summary,
    source.description,
    source.narrative,
    source.rationale,
    source.purpose,
    source.selection_rationale,
    source.constraint,
    source.mitigation,
    source.outcome,
    source.reason,
    asArray(source.responsibilities).join("; "),
    asArray(source.tradeoffs).join("; "),
    asArray(source.risks).join("; "),
    asArray(source.gaps).join("; "),
    asArray(source.steps).map((step) => step.description).join("; "),
  ]);
  const base = text ? `${title}: ${text}` : `${title}: ${kind} derived from ${fields.source_artifact || "project evidence"}.`;
  return truncate(base, 200);
}

function firstSummaryText(values) {
  return values.map((value) => String(value || "").trim()).find(Boolean) || "";
}

function truncate(value, maxLength) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1)}…`;
}

function normalizeCardLocalId(kind, value) {
  let local = slug(value);
  const aliases = {
    component: ["component"],
    capability: ["capability", "cap"],
    interface: ["interface"],
    "data-model": ["data-model", "data", "model"],
    flow: ["flow"],
    risk: ["risk", "debt"],
    constraint: ["constraint", "con"],
    decision: ["decision", "adr"],
    "api-contract": ["api-contract", "api", "endpoint"],
    "db-schema": ["db-schema", "db", "table", "schema"],
    integration: ["integration", "external", "service"],
    "project-context": ["project-context", "project"],
  }[kind] || [kind];
  for (const alias of aliases) {
    const prefix = `${alias}:`;
    if (local.startsWith(prefix)) return local.slice(prefix.length) || "unknown";
  }
  return local;
}

function deriveComponentCards(layer, nodesById) {
  const profileByNode = new Map();
  for (const profile of asArray(layer.component_profiles)) {
    for (const nodeId of evidenceNodeIds(profile, nodesById)) profileByNode.set(nodeId, profile);
  }
  const graphComponents = [...nodesById.values()].filter((node) => COMPONENT_NODE_TYPES.has(node.type));
  const cards = graphComponents.map((node) => {
    const profile = profileByNode.get(node.id) || {};
    return card("component", node, {
      type: "ComponentCard",
      title: profile.name || node.name || node.id,
      stableId: profile.id || node.id,
      anchors: anchorsFor({ ...profile, node_ids: unique([node.id, ...evidenceNodeIds(profile, nodesById)]) }, nodesById),
      semantic_tags: ["component", node.type, ...(node.tags || []), profile.role].filter(Boolean),
      source_artifact: `graph:${node.id}`,
      evidence_level: evidenceLevel(profile, "observed"),
    });
  });

  for (const profile of asArray(layer.component_profiles)) {
    const ids = evidenceNodeIds(profile, nodesById);
    if (ids.some((id) => profileByNode.get(id) && nodesById.has(id))) continue;
    cards.push(card("component", profile, {
      type: "ComponentCard",
      title: profile.name || profile.id,
      stableId: profile.id,
      anchors: anchorsFor(profile, nodesById),
      semantic_tags: ["component", profile.role, profile.complexity, profile.change_risk],
      source_artifact: `arch-layer:component_profiles:${profile.id || profile.name}`,
    }));
  }
  return cards;
}

function deriveCapabilityCards(layer, nodesById) {
  return asArray(layer.capabilities).map((capability) => card("capability", capability, {
    type: "CapabilityCard",
    title: capability.name || capability.id,
    stableId: capability.id,
    anchors: anchorsFor(capability, nodesById),
    semantic_tags: ["capability", capability.maturity, capability.importance],
    source_artifact: `arch-layer:capabilities:${capability.id || capability.name}`,
  }));
}

function deriveInterfaceCards(nodesById) {
  return [...nodesById.values()]
    .filter((node) => INTERFACE_NODE_TYPES.has(node.type))
    .map((node) => card("interface", node, {
      type: "InterfaceCard",
      title: node.name || node.id,
      stableId: node.id,
      anchors: anchorsFor({ node_ids: [node.id] }, nodesById),
      semantic_tags: ["interface", node.type, ...(node.tags || [])],
      source_artifact: `graph:${node.id}`,
      evidence_level: "observed",
    }));
}

function deriveDataModelCards(nodesById) {
  return [...nodesById.values()]
    .filter((node) => DATA_NODE_TYPES.has(node.type))
    .map((node) => card("data-model", node, {
      type: "DataModelCard",
      title: node.name || node.id,
      stableId: node.id,
      anchors: anchorsFor({ node_ids: [node.id] }, nodesById),
      semantic_tags: ["data-model", node.type, ...(node.tags || [])],
      source_artifact: `graph:${node.id}`,
      evidence_level: "observed",
    }));
}

function deriveFlowCards(layer, nodesById) {
  return asArray(layer.flows).map((flow) => card("flow", flow, {
    type: "FlowCard",
    title: flow.name || flow.id,
    stableId: flow.id,
    anchors: anchorsFor(flow, nodesById),
    semantic_tags: ["flow", flow.trigger, flow.outcome],
    source_artifact: `arch-layer:flows:${flow.id || flow.name}`,
  }));
}

function deriveRiskCards(layer, nodesById) {
  const risks = asArray(layer.risks).map((risk) => card("risk", risk, {
    type: "RiskCard",
    title: risk.title || risk.id,
    stableId: risk.id,
    anchors: anchorsFor(risk, nodesById),
    semantic_tags: ["risk", risk.category, risk.severity, risk.likelihood],
    source_artifact: `arch-layer:risks:${risk.id || risk.title}`,
  }));
  const debts = asArray(layer.technical_debt).map((debt) => card("risk", debt, {
    type: "RiskCard",
    title: debt.title || debt.id,
    stableId: debt.id,
    anchors: anchorsFor(debt, nodesById),
    semantic_tags: ["technical-debt", debt.category, debt.severity],
    source_artifact: `arch-layer:technical_debt:${debt.id || debt.title}`,
  }));
  return [...risks, ...debts];
}

function readMarkdownFiles(dir) {
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

function parseConstraints(archDir) {
  const constraintsDir = join(archDir, "rules", "constraints");
  return readMarkdownFiles(constraintsDir)
    .map((path) => {
      const text = readFileSync(path, "utf-8");
      const id = firstMatch(text, /\b(CON-\d{3,})\b/) || basename(path, ".md").toUpperCase();
      const status = firstMatch(text, /(?:状态|status)\s*[:：]\s*([a-zA-Z\u4e00-\u9fa5-]+)/i) || "";
      const title = firstMatch(text, /^#\s+(.+)$/m) || id;
      return {
        id,
        title: title.replace(new RegExp(`^${id}\\s*[-:：]?\\s*`), ""),
        status: normalizeConstraintStatus(status),
        path: normalizePath(relative(archDir, path)),
        text,
      };
    })
    .filter((entry) => entry.status === "confirmed");
}

function normalizeConstraintStatus(status) {
  const lower = String(status || "").trim().toLowerCase();
  if (lower === "confirmed" || lower === "已确认") return "confirmed";
  if (lower === "adjusted" || lower === "已调整") return "adjusted";
  if (lower === "rejected" || lower === "已拒绝") return "rejected";
  if (lower === "proposed" || lower === "待确认") return "proposed";
  return lower;
}

function firstMatch(text, pattern) {
  return text.match(pattern)?.[1]?.trim();
}

function deriveConstraintCards(archDir) {
  return parseConstraints(archDir).map((constraint) => card("constraint", constraint, {
    type: "ConstraintCard",
    title: constraint.title || constraint.id,
    stableId: constraint.id,
    anchors: {
      graph_node_ids: [],
      file_paths: [constraint.path],
      line_ranges: [],
    },
    semantic_tags: ["constraint", "confirmed", constraint.id],
    source_artifact: `constraint:${constraint.id}`,
    evidence_level: "confirmed",
  }));
}

function deriveDecisionCards(archDir, layer, nodesById) {
  const decisionsDir = join(archDir, "decisions");
  const fromFiles = readMarkdownFiles(decisionsDir).map((path) => {
    const text = readFileSync(path, "utf-8");
    const id = firstMatch(text, /\b(ADR-\d{3,})\b/i) || basename(path, ".md");
    const title = firstMatch(text, /^#\s+(.+)$/m) || id;
    return { id, title, path: normalizePath(relative(archDir, path)), text };
  });
  const fromLayer = asArray(layer.architecture_decisions).map((decision) => ({ ...decision, text: JSON.stringify(decision) }));
  const byId = new Map();
  for (const item of [...fromLayer, ...fromFiles]) byId.set(item.id || item.path || item.title, item);
  return [...byId.values()].map((decision) => card("decision", decision, {
    type: "DecisionCard",
    title: decision.title || decision.id,
    stableId: decision.id || decision.path || decision.title,
    anchors: decision.path
      ? { graph_node_ids: asArray(decision.node_ids), file_paths: [normalizePath(decision.path)], line_ranges: [] }
      : anchorsFor(decision, nodesById),
    semantic_tags: ["decision", decision.status, decision.id],
    source_artifact: decision.path ? `decision:${decision.path}` : `arch-layer:architecture_decisions:${decision.id || decision.title}`,
    evidence_level: decision.status === "accepted" ? "confirmed" : "observed",
  }));
}

function hasApiAttributes(node) {
  const attrs = node.attributes || {};
  return node.type === "endpoint" && (attrs.http_method || attrs.path || attrs.request_params || attrs.responses || attrs.protocol);
}

function deriveApiContractCards(nodesById) {
  return [...nodesById.values()]
    .filter(hasApiAttributes)
    .map((node) => {
      const attrs = node.attributes || {};
      const method = attrs.http_method || node.name?.split(" ")[0] || "API";
      const path = attrs.path || node.name || node.id;
      return card("api-contract", node, {
        type: "ApiContractCard",
        title: `${method} ${path}`.trim(),
        stableId: node.id,
        anchors: anchorsFor({ node_ids: [node.id] }, nodesById),
        semantic_tags: ["api-contract", "api", String(attrs.protocol || "unknown"), String(method).toLowerCase(), ...(node.tags || [])],
        source_artifact: `graph:${node.id}`,
        evidence_level: "observed",
      });
    });
}

function hasDbAttributes(node) {
  const attrs = node.attributes || {};
  return node.type === "table" && (attrs.columns || attrs.primary_key || attrs.foreign_keys || attrs.indexes || attrs.sql_kind);
}

function deriveDbSchemaCards(nodesById) {
  return [...nodesById.values()]
    .filter(hasDbAttributes)
    .map((node) => card("db-schema", node, {
      type: "DbSchemaCard",
      title: node.name || node.id,
      stableId: node.id,
      anchors: anchorsFor({ node_ids: [node.id] }, nodesById),
      semantic_tags: ["db-schema", "database", node.type, ...(node.tags || [])],
      source_artifact: `graph:${node.id}`,
      evidence_level: "observed",
    }));
}

function isIntegrationNode(node) {
  const attrs = node.attributes || {};
  return INTEGRATION_NODE_TYPES.has(node.type) && (attrs.service_id || attrs.service_kind || attrs.config_keys || attrs.sdk_imports || attrs.endpoints);
}

function deriveIntegrationCards(nodesById) {
  return [...nodesById.values()]
    .filter(isIntegrationNode)
    .map((node) => {
      const attrs = node.attributes || {};
      return card("integration", node, {
        type: "IntegrationCard",
        title: attrs.service_id || node.name || node.id,
        stableId: node.id,
        anchors: anchorsFor({ node_ids: [node.id] }, nodesById),
        semantic_tags: ["integration", "external-service", attrs.service_kind, ...(node.tags || [])],
        source_artifact: `graph:${node.id}`,
        evidence_level: "observed",
      });
    });
}

function deriveProjectContextCards(layer, graphByRepo, nodesById) {
  const cards = [];
  for (const [repoId, { graph }] of graphByRepo.entries()) {
    const source = projectContextSource(repoId, graph, layer);
    cards.push(card("project-context", source, {
      type: "ProjectContextCard",
      title: `${source.name} 项目上下文`,
      stableId: source.id,
      anchors: { graph_node_ids: [], file_paths: [], line_ranges: [] },
      semantic_tags: ["project-context", "overview", ...asArray(source.languages), ...asArray(source.frameworks)],
      source_artifact: `graph:${repoId}:project`,
      evidence_level: "observed",
    }));
  }
  if (cards.length === 0) {
    const source = { id: `project-context:${layer.project?.name || "project"}`, name: layer.project?.name || "project", summary: layer.project?.description || "" };
    cards.push(card("project-context", source, {
      type: "ProjectContextCard",
      title: `${source.name} 项目上下文`,
      stableId: source.id,
      anchors: { graph_node_ids: [], file_paths: [], line_ranges: [] },
      semantic_tags: ["project-context", "overview"],
      source_artifact: "arch-layer:project",
      evidence_level: "observed",
    }));
  }
  return cards;
}

function projectContextSource(repoId, graph, layer) {
  return {
    id: `project-context:${repoId}`,
    name: graph.project?.name || layer.project?.name || repoId,
    summary: layer.project?.description || graph.project?.description || "",
    languages: graph.project?.languages || [],
    frameworks: graph.project?.frameworks || [],
    node_ids: asArray(graph.nodes).slice(0, 50).map((node) => node.id),
  };
}

export function deriveCards(options = {}) {
  const archDir = inferArchDir(options);
  const cardsDir = join(archDir, "cards");
  const layerPath = options.layerPath ? resolve(options.layerPath) : join(archDir, "specs", "arch-layer.json");
  const archLayer = readJson(layerPath, { component_profiles: [], capabilities: [], flows: [], risks: [], technical_debt: [], architecture_decisions: [] });
  const { graphByRepo, nodesById } = loadGraphs(archDir, archLayer);
  const existingDoc = readJson(join(cardsDir, "agent-cards.json"), { cards: [] });
  const existingById = new Map(asArray(existingDoc.cards).map((cardEntry) => [cardEntry.id, cardEntry]));
  const pinnedIds = new Set(readJson(join(cardsDir, "pinned.json"), []));

  const derived = [
    ...deriveComponentCards(archLayer, nodesById),
    ...deriveCapabilityCards(archLayer, nodesById),
    ...deriveInterfaceCards(nodesById),
    ...deriveDataModelCards(nodesById),
    ...deriveFlowCards(archLayer, nodesById),
    ...deriveRiskCards(archLayer, nodesById),
    ...deriveConstraintCards(archDir),
    ...deriveDecisionCards(archDir, archLayer, nodesById),
    ...deriveApiContractCards(nodesById),
    ...deriveDbSchemaCards(nodesById),
    ...deriveIntegrationCards(nodesById),
    ...deriveProjectContextCards(archLayer, graphByRepo, nodesById),
  ];

  const byId = new Map();
  for (const cardEntry of derived) {
    if (pinnedIds.has(cardEntry.id) && existingById.has(cardEntry.id)) byId.set(cardEntry.id, existingById.get(cardEntry.id));
    else {
      const existing = existingById.get(cardEntry.id);
      const focused_summary = existing?.source_hash === cardEntry.source_hash
        ? existing.focused_summary || cardEntry.focused_summary || ""
        : cardEntry.focused_summary || "";
      byId.set(cardEntry.id, { ...cardEntry, focused_summary, related_card_ids: [] });
    }
  }
  for (const pinnedId of pinnedIds) {
    if (existingById.has(pinnedId) && !byId.has(pinnedId)) byId.set(pinnedId, existingById.get(pinnedId));
  }

  const cards = relateCards([...byId.values()]).sort((a, b) => a.id.localeCompare(b.id));
  const doc = { version: "3.4", generated_at: new Date().toISOString(), cards };
  const index = buildIndex(cards);

  mkdirSync(cardsDir, { recursive: true });
  if (!existsSync(join(cardsDir, "pinned.json"))) writeJson(join(cardsDir, "pinned.json"), []);
  writeJson(join(cardsDir, "agent-cards.json"), doc);
  writeJson(join(cardsDir, "index.json"), index);
  return { archDir, cardsPath: join(cardsDir, "agent-cards.json"), indexPath: join(cardsDir, "index.json"), cardCount: cards.length, cards, index };
}

function relateCards(cards) {
  const byNode = new Map();
  const byTag = new Map();
  for (const cardEntry of cards) {
    for (const nodeId of cardEntry.anchors.graph_node_ids) addToSet(byNode, nodeId, cardEntry.id);
    for (const tag of cardEntry.semantic_tags) addToSet(byTag, tag, cardEntry.id);
  }
  return cards.map((cardEntry) => {
    const related = new Set(cardEntry.related_card_ids || []);
    for (const nodeId of cardEntry.anchors.graph_node_ids) for (const id of byNode.get(nodeId) || []) related.add(id);
    for (const tag of cardEntry.semantic_tags) for (const id of byTag.get(tag) || []) related.add(id);
    related.delete(cardEntry.id);
    return { ...cardEntry, related_card_ids: [...related].sort() };
  });
}

function addToSet(map, key, value) {
  if (!key) return;
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(value);
}

function buildIndex(cards) {
  const index = {};
  for (const cardEntry of cards) {
    for (const filePath of cardEntry.anchors.file_paths) {
      if (!index[filePath]) index[filePath] = { card_ids: [], arch_node_ids: [], constraint_ids: [] };
      index[filePath].card_ids.push(cardEntry.id);
      index[filePath].arch_node_ids.push(...cardEntry.anchors.graph_node_ids);
      if (cardEntry.type === "ConstraintCard") {
        const id = cardEntry.source_artifact.replace(/^constraint:/, "");
        index[filePath].constraint_ids.push(id);
      }
    }
  }
  for (const value of Object.values(index)) {
    value.card_ids = unique(value.card_ids).sort();
    value.arch_node_ids = unique(value.arch_node_ids).sort();
    value.constraint_ids = unique(value.constraint_ids).sort();
  }
  return Object.fromEntries(Object.entries(index).sort(([a], [b]) => a.localeCompare(b)));
}

export function sourceHashForCard(cardEntry, options = {}) {
  const archDir = inferArchDir(options);
  const layer = readJson(join(archDir, "specs", "arch-layer.json"), {});
  const { nodesById } = loadGraphs(archDir, layer);
  if (cardEntry.source_artifact.startsWith("graph:")) {
    const nodeId = cardEntry.source_artifact.slice("graph:".length);
    if (nodeId.endsWith(":project")) {
      const repoId = nodeId.slice(0, -":project".length);
      const { graphByRepo } = loadGraphs(archDir, layer);
      const graph = graphByRepo.get(repoId)?.graph;
      return graph ? hashValue(projectContextSource(repoId, graph, layer)) : null;
    }
    return nodesById.has(nodeId) ? hashValue(nodesById.get(nodeId)) : null;
  }
  if (cardEntry.source_artifact === "arch-layer:project") return hashValue(layer.project || {});
  if (cardEntry.source_artifact.startsWith("arch-layer:")) {
    return hashArchLayerSource(cardEntry.source_artifact, layer);
  }
  if (cardEntry.source_artifact.startsWith("constraint:")) {
    const id = cardEntry.source_artifact.slice("constraint:".length);
    const source = parseConstraints(archDir).find((entry) => entry.id === id);
    return source ? hashValue(source) : null;
  }
  if (cardEntry.source_artifact.startsWith("decision:")) {
    const relPath = cardEntry.source_artifact.slice("decision:".length);
    const path = join(archDir, relPath);
    if (!existsSync(path)) return null;
    return hashValue({ id: cardEntry.id, title: cardEntry.title, path: relPath, text: readFileSync(path, "utf-8") });
  }
  return null;
}

function hashArchLayerSource(sourceArtifact, layer) {
  const [, key, ...idParts] = sourceArtifact.split(":");
  const id = idParts.join(":");
  const collection = asArray(layer[key]);
  const source = collection.find((item) => item.id === id || item.name === id || item.title === id);
  return source ? hashValue(source) : null;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.length ? rest.join("=") : true];
  }));
  const result = deriveCards({ archDir: args["arch-dir"], projectRoot: args.workspace, projectId: args.project });
  console.log(JSON.stringify({ cardsPath: result.cardsPath, indexPath: result.indexPath, cardCount: result.cardCount }, null, 2));
}
