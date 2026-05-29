#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const archDir = resolve(process.argv[2] || process.env.ARCH_PROJECT_ROOT || ".");
const wikiDir = process.argv[3] ? resolve(process.argv[3]) : join(archDir, "wiki");
const layerPath = join(archDir, "specs", "arch-layer.json");
const reposPath = join(archDir, "specs", "repos.json");
const generatedAt = new Date().toISOString();

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

const layer = readJson(layerPath, null);
if (!layer) throw new Error(`Missing arch-layer.json: ${layerPath}`);
const reposInput = readJson(reposPath, layer.project?.repos ?? []);
const repos = Array.isArray(reposInput) ? reposInput : reposInput.repos ?? [];
const graphs = readGraphs(repos);
const commit = resolveCommit(layer);
const sourceLine = `> 生成时间:${generatedAt}  ·  基于 commit:${commit}  ·  事实源:specs/repos/*/knowledge-graph.json + specs/arch-layer.json`;

mkdirSync(wikiDir, { recursive: true });

function readGraphs(repoList) {
  const result = [];
  for (const repo of Array.isArray(repoList) ? repoList : []) {
    const graphPath = repo.graph_path || join("specs", "repos", repo.repo_id || repo.id || repo.name, "knowledge-graph.json");
    const abs = resolveExisting(graphPath, repo);
    if (existsSync(abs)) result.push({ repo, graph: readJson(abs, { nodes: [], edges: [], layers: [], tour: [] }) });
  }
  return result;
}

function resolveExisting(pathValue, repo) {
  const candidates = [
    resolve(pathValue),
    resolve(archDir, pathValue),
    resolve(archDir, "specs", "repos", repo.repo_id || repo.id || repo.name, "knowledge-graph.json"),
  ];
  return candidates.find((candidate) => existsSync(candidate)) || candidates[0];
}

function resolveCommit(layer) {
  const commits = layer.freshness?.repos?.map((r) => r.git_commit).filter(Boolean);
  if (commits?.length) return commits.join(",");
  try {
    return execSync("git rev-parse HEAD", { cwd: process.cwd(), encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "unknown";
  }
}

function refsFor(item) {
  const raw = [
    ...(Array.isArray(item?.evidence_refs) ? item.evidence_refs : []),
    ...(Array.isArray(item?.node_ids) ? item.node_ids : []),
    ...(Array.isArray(item?.nodeIds) ? item.nodeIds : []),
    ...(Array.isArray(item?.supporting_node_ids) ? item.supporting_node_ids : []),
    ...(Array.isArray(item?.inside_node_ids) ? item.inside_node_ids : []),
  ].filter(Boolean);
  const unique = [...new Set(raw.map(String))];
  const codeRefs = unique.filter((ref) => !isInternalInferenceRef(ref));
  return codeRefs.length ? codeRefs : unique;
}

function isInternalInferenceRef(ref) {
  return /^(cap|risk|debt|qa|flow|component|tech|ext|boundary|hotspot):/.test(String(ref));
}

function h(title) {
  return `# ${title}\n\n${sourceLine}\n\n`;
}

function section(title, body) {
  return `## ${title}\n\n${body.trim()}\n\n`;
}

function list(items, render, empty) {
  if (!Array.isArray(items) || items.length === 0) return `${empty}\n`;
  return `${items.map(render).join("\n")}\n`;
}

function nodesOf(types) {
  const wanted = new Set(types);
  return graphs.flatMap(({ graph }) => graph.nodes || []).filter((node) => wanted.has(node.type));
}

function chapterEvidence(rows) {
  const normalized = rows
    .filter(Boolean)
    .map((row) => ({
      claim: row.claim,
      refs: Array.isArray(row.refs) ? row.refs.filter(Boolean) : [],
    }))
    .filter((row) => row.claim);
  if (!normalized.length) {
    normalized.push({ claim: "本章没有可投影的结构化判断", refs: ["specs/arch-layer.json"] });
  }
  return section("证据来源", [
    "| 判断 | 代码位置 |",
    "| --- | --- |",
    ...normalized.map((row) => `| ${escapeTable(row.claim)} | ${escapeTable(row.refs.length ? row.refs.join("<br>") : "未闭合 evidence_refs，请重跑对应 analyzer")} |`),
  ].join("\n"));
}

function escapeTable(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
}

function graphEvidenceRows(types, label, limit = 20) {
  return nodesOf(types).slice(0, limit).map((node) => ({
    claim: `${label}: ${node.name || node.id}`,
    refs: [node.id],
  }));
}

function rowsFrom(items, labelOf) {
  if (!Array.isArray(items)) return [];
  return items.map((item) => ({ claim: labelOf(item), refs: refsFor(item) }));
}

function styleText() {
  const style = layer.architecture_style;
  if (!style) return "未能确定主架构风格；该不确定性应保留在 known_unknowns 中。\n";
  return `当前判断为 **${style.primary}**。${style.rationale}\n\n` +
    (style.tradeoffs?.length ? `主要取舍：${style.tradeoffs.join("；")}。\n` : "");
}

function componentBullets() {
  return list(layer.component_profiles, (component) =>
    `- **${component.name}** (${component.role}, complexity:${component.complexity}, change_risk:${component.change_risk})：${component.narrative} 责任边界：${(component.responsibilities || []).join("；")}。协作对象：${(component.collaborators || []).join(", ") || "未识别到显式协作者"}。`,
    "未识别到可独立成章的核心组件；若 graph 有 module/service 节点，这通常意味着 narrative phase 需要重跑。",
  );
}

function techBullets() {
  return list(layer.tech_stack, (tech) =>
    `- **${tech.name}** (${tech.category})：用于 ${tech.purpose}。选型理由：${tech.selection_rationale}。风险：${(tech.risks || []).join("；") || "未识别到显式技术风险"}。`,
    "未识别到影响架构判断的技术栈条目；这通常只适用于非常小的仓库。",
  );
}

function flowBullets() {
  return list(layer.flows, (flow) => {
    const steps = (flow.steps || []).map((step) => `${step.order}. ${step.description} (${(step.node_ids || []).join(", ")})`).join(" ");
    return `- **${flow.name}**：触发条件是 ${flow.trigger}，结果是 ${flow.outcome}。链路：${steps}`;
  }, "未识别到端到端业务链路；若存在 domain/flow/endpoint/call-chain 证据，capability phase 需要重跑。");
}

function capabilitiesText() {
  return list(layer.capabilities, (capability) =>
    `- **${capability.name}** (${capability.maturity}, ${capability.importance})：${capability.description} 缺口：${(capability.gaps || []).join("；") || "未识别到显式缺口"}。`,
    "未识别到业务或平台能力；真实应用不应出现空能力层。",
  );
}

function qualityText() {
  return list(layer.quality_attributes, (quality) =>
    `- **${quality.type}** (${quality.status})：${quality.description}`,
    "未识别到质量属性判断；真实应用不应出现空 NFR 层。",
  );
}

function depsText() {
  return list(layer.external_dependencies, (dependency) =>
    `- **${dependency.name}** (${dependency.kind}, ${dependency.direction}, risk:${dependency.risk})：${dependency.purpose}`,
    "未识别到外部依赖或集成点。",
  );
}

function boundariesText() {
  return list(layer.boundaries, (boundary) =>
    `- **${boundary.name}** (${boundary.kind})：${boundary.description} 内部节点：${(boundary.inside_node_ids || []).join(", ") || "未识别到"}；外部：${(boundary.outside || []).join(", ") || "未识别到"}。`,
    "未识别到明确系统边界。",
  );
}

function riskText() {
  const risks = section("风险", list(layer.risks, (risk) =>
    `- **${risk.title}** (${risk.category}, ${risk.severity}/${risk.likelihood})：${risk.mitigation}`,
    "未识别到明确风险；若系统真实存在关键能力，这个结果需要 senior review 复核。",
  ));
  const debt = section("技术债", list(layer.technical_debt, (debt) =>
    `- **${debt.title}** (${debt.category}, ${debt.severity})：${debt.recommendation}`,
    "未识别到明确技术债。",
  ));
  const hotspots = section("复杂度热点", list(layer.complexity_hotspots, (hotspot) =>
    `- **${hotspot.title}** (${hotspot.type}, ${hotspot.severity})：${hotspot.why_it_matters}`,
    "未识别到复杂度热点。",
  ));
  const constraints = section("扩展约束", list(layer.extension_constraints, (constraint) =>
    `- **${constraint.title}** (${constraint.constraint_type}, impact:${constraint.impact})：${constraint.recommendation}`,
    "未识别到明确扩展约束。",
  ));
  return risks + debt + hotspots + constraints;
}

function graphNodesText(types, empty) {
  const nodes = nodesOf(types);
  return list(nodes.slice(0, 60), (node) =>
    `- **${node.name || node.id}** (${node.type})：${node.summary || "graph 未提供摘要"}`,
    empty,
  );
}

function renderRules() {
  const rulesDir = join(archDir, "rules");
  if (!existsSync(rulesDir)) return "未识别到 rules 目录；团队约束不参与本次投影。\n";
  const files = readdirSync(rulesDir).filter((file) => file.endsWith(".md"));
  return list(files, (file) => `- **${file}**：规则文件存在，设计评审时应纳入约束。`, "未识别到规则文件。");
}

function renderMermaid() {
  const components = (layer.component_profiles || []).slice(0, 12);
  if (!components.length) return "未识别到可绘制的组件；diagram 保持诚实空缺。\n";
  const lines = ["```mermaid", "flowchart LR"];
  for (const component of components) lines.push(`  ${safeId(component.id)}["${escapeLabel(component.name)}"]`);
  for (const flow of layer.flows || []) {
    const ids = (flow.node_ids || [])
      .map((id) => components.find((component) => (component.node_ids || []).includes(id))?.id)
      .filter(Boolean);
    for (let index = 0; index < ids.length - 1; index++) lines.push(`  ${safeId(ids[index])} --> ${safeId(ids[index + 1])}`);
  }
  lines.push("```");
  return `${lines.join("\n")}\n`;
}

function safeId(id) {
  return String(id || "node").replace(/[^a-zA-Z0-9_]/g, "_");
}

function escapeLabel(label) {
  return String(label || "").replace(/"/g, "'");
}

const chapters = [
  {
    file: "01-overview.md",
    title: "01 总览",
    content: () => section("架构判断", styleText()) +
      section("项目范围", `项目 **${layer.project?.name || basename(archDir)}** 覆盖 ${(layer.project?.repos || []).length} 个仓库。架构白皮书以 arch-layer 叙事字段为主，代码 graph 为事实来源。`) +
      section("设计阅读顺序", list(layer.tour, (step) => `- ${step.order}. **${step.title}**：${step.description}`, "未识别到架构导览步骤；可重跑 arch-enrich Phase 11。")) +
      section("核心组件概览", componentBullets()),
    evidence: () => [
      { claim: "项目范围与事实源", refs: ["specs/repos.json", "specs/arch-layer.json"] },
      ...(layer.architecture_style ? rowsFrom([layer.architecture_style], () => "架构风格判断") : []),
      ...rowsFrom(layer.component_profiles, (component) => `核心组件: ${component.name}`),
      ...rowsFrom(layer.tour, (step) => `导览步骤: ${step.title}`),
    ],
  },
  {
    file: "02-components.md",
    title: "02 组件职责与模块",
    content: () => section("组件职责叙事", componentBullets()) + section("代码层组件证据", graphNodesText(["module", "service", "resource"], "未识别到 module/service/resource 节点。")),
    evidence: () => [...rowsFrom(layer.component_profiles, (component) => `组件职责: ${component.name}`), ...graphEvidenceRows(["module", "service", "resource"], "代码层组件")],
  },
  {
    file: "03-interfaces.md",
    title: "03 接口与集成",
    content: () => section("技术栈判断", techBullets()) + section("接口与集成判断", depsText()) + section("接口节点证据", graphNodesText(["endpoint", "schema"], "未识别到 endpoint/schema 节点。")),
    evidence: () => [...rowsFrom(layer.tech_stack, (tech) => `技术栈: ${tech.name}`), ...rowsFrom(layer.external_dependencies, (dependency) => `外部依赖: ${dependency.name}`), ...graphEvidenceRows(["endpoint", "schema"], "接口节点")],
  },
  {
    file: "04-data-models.md",
    title: "04 数据模型与边界",
    content: () => section("数据边界", boundariesText()) + section("数据节点证据", graphNodesText(["table", "schema"], "未识别到 table/schema 节点。")),
    evidence: () => [...rowsFrom(layer.boundaries, (boundary) => `边界: ${boundary.name}`), ...graphEvidenceRows(["table", "schema"], "数据节点")],
  },
  {
    file: "05-capabilities.md",
    title: "05 能力地图",
    content: () => section("能力地图", capabilitiesText()) + section("能力链路", flowBullets()),
    evidence: () => [...rowsFrom(layer.capabilities, (capability) => `能力: ${capability.name}`), ...rowsFrom(layer.flows, (flow) => `能力链路: ${flow.name}`)],
  },
  {
    file: "06-quality.md",
    title: "06 质量属性",
    content: () => section("质量属性", qualityText()) + section("扩展约束", list(layer.extension_constraints, (constraint) => `- **${constraint.title}**：${constraint.recommendation}`, "未识别到扩展约束。")),
    evidence: () => [...rowsFrom(layer.quality_attributes, (quality) => `质量属性: ${quality.type}`), ...rowsFrom(layer.extension_constraints, (constraint) => `扩展约束: ${constraint.title}`)],
  },
  {
    file: "07-risks-and-debt.md",
    title: "07 风险与技术债",
    content: () => riskText(),
    evidence: () => [
      ...rowsFrom(layer.risks, (risk) => `风险: ${risk.title}`),
      ...rowsFrom(layer.technical_debt, (debt) => `技术债: ${debt.title}`),
      ...rowsFrom(layer.complexity_hotspots, (hotspot) => `复杂度热点: ${hotspot.title}`),
      ...rowsFrom(layer.extension_constraints, (constraint) => `扩展约束: ${constraint.title}`),
    ],
  },
  {
    file: "08-deployments.md",
    title: "08 运行与部署",
    content: () => section("运行与部署边界", boundariesText()) + section("部署节点证据", graphNodesText(["resource", "pipeline", "config"], "未识别到 resource/pipeline/config 节点。")),
    evidence: () => [...rowsFrom(layer.boundaries, (boundary) => `运行边界: ${boundary.name}`), ...graphEvidenceRows(["resource", "pipeline", "config"], "部署节点")],
  },
  {
    file: "09-flows-and-scenarios.md",
    title: "09 流程与场景",
    content: () => section("端到端链路", flowBullets()) + section("Domain Flow 节点", graphNodesText(["domain", "flow", "step"], "未识别到 domain/flow/step 节点。")),
    evidence: () => [...rowsFrom(layer.flows, (flow) => `端到端链路: ${flow.name}`), ...graphEvidenceRows(["domain", "flow", "step"], "Domain Flow 节点")],
  },
  {
    file: "10-decisions.md",
    title: "10 架构决策",
    content: () => section("架构决策索引", list(layer.architecture_decisions, (decision) => `- **${decision.title}** (${decision.status})：${decision.path}`, "未识别到 ADR；如果项目还没有决策记录，这是合法空缺。")),
    evidence: () => rowsFrom(layer.architecture_decisions, (decision) => `架构决策: ${decision.title}`),
  },
  {
    file: "11-changes.md",
    title: "11 变更记录",
    content: () => section("变更请求索引", list(layer.change_requests, (change) => `- **${change.title}** (${change.status})：${change.path}`, "未识别到 CR；如果尚未进入方案设计流程，这是合法空缺。")),
    evidence: () => rowsFrom(layer.change_requests, (change) => `变更请求: ${change.title}`),
  },
  {
    file: "12-rules.md",
    title: "12 规则与约束",
    content: () => section("规则投影", renderRules()),
    evidence: () => {
      const rulesDir = join(archDir, "rules");
      if (!existsSync(rulesDir)) return [{ claim: "规则目录不存在", refs: ["specs/arch-layer.json"] }];
      return readdirSync(rulesDir).filter((file) => file.endsWith(".md")).map((file) => ({ claim: `规则文件: ${file}`, refs: [`rules/${file}`] }));
    },
  },
  {
    file: "13-pending-changes.md",
    title: "13 待确认事项",
    content: () => section("Known Unknowns", list(layer.known_unknowns, (unknown) => typeof unknown === "string"
      ? `- ${unknown}`
      : `- **${unknown.question}** (${unknown.status})：${unknown.reason} owner:${unknown.owner}`,
    "未识别到开放 known_unknowns。")),
    evidence: () => [{ claim: "待确认事项来自 arch-layer known_unknowns", refs: ["specs/arch-layer.json#known_unknowns"] }],
  },
  {
    file: "14-diagrams.md",
    title: "14 图示",
    content: () => section("上下文图", renderMermaid()),
    evidence: () => [...rowsFrom(layer.component_profiles, (component) => `图示组件: ${component.name}`), ...rowsFrom(layer.flows, (flow) => `图示链路: ${flow.name}`)],
  },
];

const renderedChapters = chapters.map((chapter) => ({
  ...chapter,
  bodyMarkdown: `${chapter.content().trim()}\n\n${chapterEvidence(chapter.evidence()).trim()}\n`,
}));

for (const chapter of renderedChapters) {
  writeDoc(join(wikiDir, chapter.file), h(chapter.title) + chapter.bodyMarkdown);
}

const toc = [
  "## 目录",
  "",
  ...renderedChapters.map((chapter) => `- [${chapter.title}](#${slug(chapter.title)})`),
  "",
].join("\n");

const architecture = h(`${layer.project?.name || basename(archDir)} 架构全景`) + toc + renderedChapters.map((chapter) => `# ${chapter.title}\n\n${chapter.bodyMarkdown}`).join("\n");
writeDoc(join(wikiDir, "ARCHITECTURE.md"), architecture);

writeDoc(join(wikiDir, "README.md"), h("Wiki README") + [
  "- [ARCHITECTURE.md](ARCHITECTURE.md) 是主产物长文，按 01-14 顺序完整拼接全部切片章节。",
  "- 01-14 是同源章节的单页切片，供 dashboard、局部刷新和精读使用。",
  "- 正文不内联 evidence；每章末尾的 `## 证据来源` 表格集中列出判断和代码位置。",
].join("\n"));

function slug(title) {
  return title.toLowerCase().replace(/[^\p{Letter}\p{Number}\s-]/gu, "").trim().replace(/\s+/g, "-");
}

function writeDoc(path, content) {
  writeFileSync(path, `${content.trimEnd()}\n`, "utf-8");
}

console.log(JSON.stringify({ wikiDir, pages: 16, generatedAt, commit }, null, 2));
