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
  const commits = layer.freshness?.repos?.map((repo) => repo.git_commit).filter(Boolean);
  if (commits?.length) return commits.join(",");
  try {
    return execSync("git rev-parse HEAD", { cwd: process.cwd(), encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "unknown";
  }
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

function projectName() {
  return layer.project?.name || basename(archDir);
}

function label(value, labels = {}) {
  return labels[value] || value || "未明确";
}

function cleanText(value) {
  return String(value ?? "")
    .replace(/未在 graph 中形成实现节点/g, "尚未形成实现节点")
    .replace(/尚未进入 graph/g, "尚未形成运行时实现")
    .replace(/graph 中/g, "当前架构资料中")
    .replace(/graph 未提供摘要/g, "暂无摘要")
    .replace(/\bgraph\b/gi, "当前架构资料")
    .replace(/\barch-layer\b/gi, "架构资料")
    .replace(/\barch-enrich\b/gi, "架构分析")
    .replace(/\bPhase\s*\d+\b/gi, "分析阶段")
    .replace(/\s+/g, " ")
    .trim();
}

function sentence(value) {
  const text = cleanText(value);
  if (!text) return "";
  return /[。.!！?？]$/.test(text) ? text : `${text}。`;
}

const roleLabels = {
  entrypoint: "入口",
  ui: "界面",
  api: "接口",
  domain: "领域",
  application: "应用编排",
  data: "数据",
  integration: "集成",
  infrastructure: "基础设施",
  platform: "平台",
  tooling: "工具链",
  unknown: "未明确",
};

const levelLabels = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "关键",
  unknown: "未明确",
};

const maturityLabels = {
  nascent: "早期",
  growing: "成长中",
  stable: "稳定",
  optimized: "优化成熟",
  legacy: "遗留",
};

const importanceLabels = {
  low: "低",
  medium: "中",
  high: "高",
  critical: "关键",
};

const statusLabels = {
  strong: "强",
  adequate: "基本充分",
  weak: "薄弱",
  unknown: "未明确",
  inadequate: "不足",
};

const nodeTypeLabels = {
  module: "模块",
  service: "服务",
  resource: "资源",
  endpoint: "接口",
  schema: "结构定义",
  table: "数据表",
  pipeline: "流水线",
  config: "配置",
  domain: "领域",
  flow: "流程",
  step: "步骤",
};

function styleText() {
  const style = layer.architecture_style;
  if (!style) return "未能确定主架构风格；该不确定性应保留在 known_unknowns 中。\n";
  return `当前判断为 **${style.primary}**。${cleanText(style.rationale)}\n\n` +
    (style.tradeoffs?.length ? `主要取舍：${style.tradeoffs.map(cleanText).join("；")}。\n` : "");
}

function componentBullets() {
  return list(layer.component_profiles, (component) =>
    `- **${component.name}**：${cleanText(component.narrative)} 职责类型：${label(component.role, roleLabels)}；复杂度：${label(component.complexity, levelLabels)}；变更风险：${label(component.change_risk, levelLabels)}。责任边界：${(component.responsibilities || []).map(cleanText).join("；")}。协作对象：${collaboratorNames(component).join("、") || "未明确"}。`,
    "当前架构资料中没有形成明确的核心组件划分。",
  );
}

function techBullets() {
  return list(layer.tech_stack, (tech) =>
    `- **${tech.name}** (${tech.category})：用途：${sentence(tech.purpose)}选型理由：${sentence(tech.selection_rationale)}风险：${(tech.risks || []).map(cleanText).join("；") || "未识别到显式技术风险"}。`,
    "当前架构资料中没有明确影响架构判断的技术栈条目。",
  );
}

function flowBullets() {
  return list(layer.flows, (flow) => {
    const steps = (flow.steps || []).map((step) => `${step.order}. ${cleanText(step.description)}`).join(" ");
    return `- **${flow.name}**：触发条件是 ${cleanText(flow.trigger)}，结果是 ${cleanText(flow.outcome)}。链路：${steps}`;
  }, "本项目没有形成独立的端到端服务链路。");
}

function capabilitiesText() {
  return list(layer.capabilities, (capability) =>
    `- **${capability.name}**：${cleanText(capability.description)} 成熟度：${label(capability.maturity, maturityLabels)}；重要性：${label(capability.importance, importanceLabels)}。缺口：${(capability.gaps || []).map(cleanText).join("；") || "未明确"}。`,
    "当前架构资料中没有明确的业务或平台能力条目。",
  );
}

function qualityText() {
  return list(layer.quality_attributes, (quality) =>
    `- **${quality.type}**：${cleanText(quality.description)} 当前状态：${label(quality.status, statusLabels)}。`,
    "当前架构资料中没有明确的质量属性判断。",
  );
}

function depsText() {
  return list(layer.external_dependencies, (dependency) =>
    `- **${dependency.name}**：${cleanText(dependency.purpose)} 类型：${dependency.kind || "未明确"}；方向：${dependency.direction || "未明确"}；风险：${label(dependency.risk, levelLabels)}。`,
    "本项目没有明确的外部服务依赖。",
  );
}

function boundariesText() {
  return list(layer.boundaries, (boundary) =>
    `- **${boundary.name}**：${cleanText(boundary.description)} 边界类型：${boundary.kind || "未明确"}；内部范围：${(boundary.inside_node_ids || []).map(nodeDisplayName).join("、") || "未明确"}；外部对象：${(boundary.outside || []).map(cleanText).join("、") || "未明确"}。`,
    "当前架构资料中没有明确的系统边界划分。",
  );
}

function riskText() {
  const risks = section("风险", list(layer.risks, (risk) =>
    `- **${risk.title}**：${cleanText(risk.mitigation)} 类别：${risk.category || "未明确"}；严重度：${label(risk.severity, levelLabels)}；可能性：${label(risk.likelihood, levelLabels)}。`,
    "当前架构资料中没有明确风险条目。",
  ));
  const debt = section("技术债", list(layer.technical_debt, (debt) =>
    `- **${debt.title}**：${cleanText(debt.recommendation)} 类别：${debt.category || "未明确"}；严重度：${label(debt.severity, levelLabels)}。`,
    "当前架构资料中没有明确技术债条目。",
  ));
  const hotspots = section("复杂度热点", list(layer.complexity_hotspots, (hotspot) =>
    `- **${hotspot.title}**：${cleanText(hotspot.why_it_matters)} 类型：${hotspot.type || "未明确"}；严重度：${label(hotspot.severity, levelLabels)}。`,
    "当前架构资料中没有明确复杂度热点。",
  ));
  const constraints = section("扩展约束", list(layer.extension_constraints, (constraint) =>
    `- **${constraint.title}**：${cleanText(constraint.recommendation)} 约束类型：${constraint.constraint_type || "未明确"}；影响：${label(constraint.impact, levelLabels)}。`,
    "当前架构资料中没有明确扩展约束。",
  ));
  return risks + debt + hotspots + constraints;
}

function graphNodesText(types, empty) {
  const nodes = nodesOf(types);
  return list(nodes.slice(0, 60), (node) =>
    `- **${node.name || nodeDisplayName(node.id)}**（${label(node.type, nodeTypeLabels)}）：${cleanText(node.summary || "暂无摘要")}`,
    empty,
  );
}

function collaboratorNames(component) {
  return (component.collaborators || []).map((id) => {
    const profile = (layer.component_profiles || []).find((candidate) => candidate.id === id);
    return profile?.name || nodeDisplayName(id);
  });
}

function nodeDisplayName(id) {
  const raw = String(id || "");
  const node = graphs.flatMap(({ graph }) => graph.nodes || []).find((candidate) => candidate.id === raw);
  if (node?.name) return node.name;
  const withoutRepo = raw.includes("::") ? raw.split("::").slice(1).join("::") : raw;
  const parts = withoutRepo.split(":");
  return parts[parts.length - 1] || withoutRepo || "未明确";
}

function renderRules() {
  const rulesDir = join(archDir, "rules");
  if (!existsSync(rulesDir)) return "本项目没有提供架构规则文档。\n";
  const files = readdirSync(rulesDir).filter((file) => file.endsWith(".md"));
  return list(files, (file) => `- **${file}**：该规则会影响架构设计和评审。`, "本项目没有提供架构规则文档。");
}

function renderMermaid() {
  const components = (layer.component_profiles || []).slice(0, 12);
  if (!components.length) return "当前架构资料中没有足够组件关系生成上下文图。\n";
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
    content: () => section("项目定位", `**${projectName()}** 是${sentence(layer.project?.description || "一个需要结合代码结构和架构判断理解的工程项目")}系统的主要架构信息集中在能力、组件、边界、质量属性和风险约束上。`) +
      section("架构判断", styleText()) +
      section("核心组件概览", componentBullets()),
  },
  {
    file: "02-components.md",
    title: "02 组件职责与模块",
    content: () => section("组件职责", componentBullets()) + section("模块结构", graphNodesText(["module", "service", "resource"], "当前架构资料中没有明确的模块或服务划分。")),
  },
  {
    file: "03-interfaces.md",
    title: "03 接口与集成",
    content: () => section("技术栈与选型", techBullets()) + section("外部依赖与集成", depsText()) + section("服务接口", graphNodesText(["endpoint", "schema"], "本项目没有独立的后端服务接口。")),
  },
  {
    file: "04-data-models.md",
    title: "04 数据模型与边界",
    content: () => section("系统边界", boundariesText()) + section("数据模型", graphNodesText(["table", "schema"], "本项目没有独立的数据表或后端 schema。")),
  },
  {
    file: "05-capabilities.md",
    title: "05 能力地图",
    content: () => section("能力地图", capabilitiesText()) + section("能力链路", flowBullets()),
  },
  {
    file: "06-quality.md",
    title: "06 质量属性",
    content: () => section("质量属性", qualityText()) + section("扩展约束", list(layer.extension_constraints, (constraint) => `- **${constraint.title}**：${constraint.recommendation}`, "当前架构资料中没有明确扩展约束。")),
  },
  {
    file: "07-risks-and-debt.md",
    title: "07 风险与技术债",
    content: () => riskText(),
  },
  {
    file: "08-deployments.md",
    title: "08 运行与部署",
    content: () => section("运行与部署边界", boundariesText()) + section("部署资源", graphNodesText(["resource", "pipeline", "config"], "当前架构资料中没有明确的部署资源或流水线。")),
  },
  {
    file: "09-flows-and-scenarios.md",
    title: "09 流程与场景",
    content: () => section("端到端链路", flowBullets()) + section("业务流程", graphNodesText(["domain", "flow", "step"], "本项目没有独立的后端业务流程编排。")),
  },
  {
    file: "10-decisions.md",
    title: "10 架构决策",
    content: () => section("架构决策索引", list(layer.architecture_decisions, (decision) => `- **${decision.title}** (${decision.status})：${decision.path}`, "未识别到 ADR；如果项目还没有决策记录，这是合法空缺。")),
  },
  {
    file: "11-changes.md",
    title: "11 变更记录",
    content: () => section("变更请求索引", list(layer.change_requests, (change) => `- **${change.title}** (${change.status})：${change.path}`, "未识别到 CR；如果尚未进入方案设计流程，这是合法空缺。")),
  },
  {
    file: "12-rules.md",
    title: "12 规则与约束",
    content: () => section("规则投影", renderRules()),
  },
  {
    file: "13-pending-changes.md",
    title: "13 待确认事项",
    content: () => section("待确认事项", list(layer.known_unknowns, (unknown) => typeof unknown === "string"
      ? `- ${unknown}`
      : `- **${unknown.question}**：${unknown.reason} 状态：${unknown.status || "未明确"}；负责人：${unknown.owner || "未明确"}。`,
    "当前没有明确的待确认架构事项。")),
  },
  {
    file: "14-diagrams.md",
    title: "14 图示",
    content: () => section("上下文图", renderMermaid()),
  },
];

const renderedChapters = chapters.map((chapter) => ({
  ...chapter,
  bodyMarkdown: `${chapter.content().trim()}\n`,
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
  "- 01-14 是同源章节的单页切片，可按具体主题单独查阅。",
  "- 结构化来源保存在项目规格文件中，正文只呈现架构事实、判断和取舍。",
].join("\n"));

function slug(title) {
  return title.toLowerCase().replace(/[^\p{Letter}\p{Number}\s-]/gu, "").trim().replace(/\s+/g, "-");
}

function writeDoc(path, content) {
  writeFileSync(path, `${content.trimEnd()}\n`, "utf-8");
}

console.log(JSON.stringify({ wikiDir, pages: 16, generatedAt, commit }, null, 2));
