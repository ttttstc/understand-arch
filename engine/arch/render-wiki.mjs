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

function evidence(item) {
  const refs = item?.evidence_refs || item?.node_ids || item?.supporting_node_ids || [];
  if (!Array.isArray(refs) || refs.length === 0) return "[evidence: known_unknown]";
  return `[evidence: ${refs.join(", ")}]`;
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

function nodeType(type) {
  return graphs.flatMap(({ graph }) => graph.nodes || []).filter((node) => node.type === type);
}

function nodesOf(types) {
  const wanted = new Set(types);
  return graphs.flatMap(({ graph }) => graph.nodes || []).filter((node) => wanted.has(node.type));
}

function page(name, title, body) {
  writeDoc(join(wikiDir, name), h(title) + body);
}

function styleText() {
  const style = layer.architecture_style;
  if (!style) return "未能确定主架构风格；该不确定性应保留在 known_unknowns 中。[evidence: known_unknown]\n";
  return `当前判断为 **${style.primary}**。${style.rationale} ${evidence(style)}\n\n` +
    (style.tradeoffs?.length ? `主要取舍：${style.tradeoffs.join("；")}。 ${evidence(style)}\n` : "");
}

function componentBullets() {
  return list(layer.component_profiles, (c) =>
    `- **${c.name}** (${c.role}, complexity:${c.complexity}, change_risk:${c.change_risk})：${c.narrative} 责任边界：${(c.responsibilities || []).join("；")}。协作对象：${(c.collaborators || []).join(", ") || "未识别到显式协作者"}。 ${evidence(c)}`,
    "未识别到可独立成章的核心组件；若 graph 有 module/service 节点，这通常意味着 narrative phase 需要重跑。[evidence: known_unknown]",
  );
}

function techBullets() {
  return list(layer.tech_stack, (t) =>
    `- **${t.name}** (${t.category})：用于 ${t.purpose}。选型理由：${t.selection_rationale}。风险：${(t.risks || []).join("；") || "未识别到显式技术风险"}。 ${evidence(t)}`,
    "未识别到影响架构判断的技术栈条目；这通常只适用于非常小的仓库。[evidence: known_unknown]",
  );
}

function flowBullets() {
  return list(layer.flows, (flow) => {
    const steps = (flow.steps || []).map((s) => `${s.order}. ${s.description} (${(s.node_ids || []).join(", ")})`).join(" ");
    return `- **${flow.name}**：触发条件是 ${flow.trigger}，结果是 ${flow.outcome}。链路：${steps} ${evidence(flow)}`;
  }, "未识别到端到端业务链路；若存在 domain/flow/endpoint/call-chain 证据，capability phase 需要重跑。[evidence: known_unknown]");
}

function riskBullets() {
  const risks = list(layer.risks, (r) =>
    `- **${r.title}** (${r.category}, ${r.severity}/${r.likelihood})：${r.mitigation} ${evidence(r)}`,
    "未识别到明确风险；若系统真实存在关键能力，这个结果需要 senior review 复核。[evidence: known_unknown]",
  );
  const debt = list(layer.technical_debt, (d) =>
    `- **${d.title}** (${d.category}, ${d.severity})：${d.recommendation} ${evidence(d)}`,
    "未识别到明确技术债。[evidence: known_unknown]",
  );
  const hotspots = list(layer.complexity_hotspots, (h) =>
    `- **${h.title}** (${h.type}, ${h.severity})：${h.why_it_matters} ${evidence(h)}`,
    "未识别到复杂度热点。[evidence: known_unknown]",
  );
  const constraints = list(layer.extension_constraints, (c) =>
    `- **${c.title}** (${c.constraint_type}, impact:${c.impact})：${c.recommendation} ${evidence(c)}`,
    "未识别到明确扩展约束。[evidence: known_unknown]",
  );
  return section("风险", risks) + section("技术债", debt) + section("复杂度热点", hotspots) + section("扩展约束", constraints);
}

function capabilitiesText() {
  return list(layer.capabilities, (c) =>
    `- **${c.name}** (${c.maturity}, ${c.importance})：${c.description} 缺口：${(c.gaps || []).join("；") || "未识别到显式缺口"}。 ${evidence(c)}`,
    "未识别到业务或平台能力；真实应用不应出现空能力层。[evidence: known_unknown]",
  );
}

function qualityText() {
  return list(layer.quality_attributes, (q) =>
    `- **${q.type}** (${q.status})：${q.description} ${evidence(q)}`,
    "未识别到质量属性判断；真实应用不应出现空 NFR 层。[evidence: known_unknown]",
  );
}

function depsText() {
  return list(layer.external_dependencies, (d) =>
    `- **${d.name}** (${d.kind}, ${d.direction}, risk:${d.risk})：${d.purpose} ${evidence(d)}`,
    "未识别到外部依赖或集成点。[evidence: known_unknown]",
  );
}

function boundariesText() {
  return list(layer.boundaries, (b) =>
    `- **${b.name}** (${b.kind})：${b.description} 内部节点：${(b.inside_node_ids || []).join(", ") || "未识别到"}；外部：${(b.outside || []).join(", ") || "未识别到"}。 ${evidence(b)}`,
    "未识别到明确系统边界。[evidence: known_unknown]",
  );
}

function graphNodesText(types, empty) {
  const nodes = nodesOf(types);
  return list(nodes.slice(0, 60), (n) =>
    `- **${n.name || n.id}** (${n.type})：${n.summary || "graph 未提供摘要"} [evidence: ${n.id}]`,
    `${empty} [evidence: known_unknown]`,
  );
}

const overview =
  section("架构判断", styleText()) +
  section("项目范围", `项目 **${layer.project?.name || basename(archDir)}** 覆盖 ${(layer.project?.repos || []).length} 个仓库。架构白皮书以 arch-layer 叙事字段为主，代码 graph 为事实来源。[evidence: specs/repos.json, specs/arch-layer.json]`) +
  section("设计阅读顺序", list(layer.tour, (s) => `- ${s.order}. **${s.title}**：${s.description} [evidence: ${(s.nodeIds || []).join(", ")}]`, "未识别到架构导览步骤；可重跑 arch-enrich Phase 11。[evidence: known_unknown]")) +
  section("核心组件概览", componentBullets());

page("01-overview.md", "Overview", overview);
page("02-components.md", "Components", section("组件职责叙事", componentBullets()) + section("代码层组件证据", graphNodesText(["module", "service", "resource"], "未识别到 module/service/resource 节点。")));
page("03-interfaces.md", "Interfaces", section("接口与集成判断", depsText()) + section("接口节点证据", graphNodesText(["endpoint", "schema"], "未识别到 endpoint/schema 节点。")));
page("04-data-models.md", "Data Models", section("数据边界", boundariesText()) + section("数据节点证据", graphNodesText(["table", "schema"], "未识别到 table/schema 节点。")));
page("05-capabilities.md", "Capabilities", section("能力地图", capabilitiesText()) + section("能力链路", flowBullets()));
page("06-quality.md", "Quality", section("质量属性", qualityText()) + section("扩展约束", list(layer.extension_constraints, (c) => `- **${c.title}**：${c.recommendation} ${evidence(c)}`, "未识别到扩展约束。[evidence: known_unknown]")));
page("07-risks-and-debt.md", "Risks And Debt", riskBullets());
page("08-deployments.md", "Deployments", section("运行与部署边界", boundariesText()) + section("部署节点证据", graphNodesText(["resource", "pipeline", "config"], "未识别到 resource/pipeline/config 节点。")));
page("09-flows-and-scenarios.md", "Flows And Scenarios", section("端到端链路", flowBullets()) + section("Domain Flow 节点", graphNodesText(["domain", "flow", "step"], "未识别到 domain/flow/step 节点。")));
page("10-decisions.md", "Decisions", section("架构决策索引", list(layer.architecture_decisions, (a) => `- **${a.title}** (${a.status})：${a.path} [evidence: ${a.id}]`, "未识别到 ADR；如果项目还没有决策记录，这是合法空缺。[evidence: known_unknown]")));
page("11-changes.md", "Changes", section("变更请求索引", list(layer.change_requests, (c) => `- **${c.title}** (${c.status})：${c.path} [evidence: ${c.id}]`, "未识别到 CR；如果尚未进入方案设计流程，这是合法空缺。[evidence: known_unknown]")));
page("12-rules.md", "Rules", section("规则投影", renderRules()));
page("13-pending-changes.md", "Pending Changes", section("Known Unknowns", list(layer.known_unknowns, (u) => `- **${u.question}** (${u.status})：${u.reason} owner:${u.owner} [evidence: ${u.id}]`, "未识别到开放 known_unknowns。[evidence: specs/arch-layer.json]")));
page("14-diagrams.md", "Diagrams", section("上下文图", renderMermaid()));

const architecture =
  h("Architecture") +
  section("1. Executive Summary", `${styleText()}\n${capabilitiesText()}`) +
  section("2. System Shape", componentBullets()) +
  section("3. Technology And Boundaries", `${techBullets()}\n${boundariesText()}`) +
  section("4. Capabilities And Flows", `${capabilitiesText()}\n${flowBullets()}`) +
  section("5. Quality, Risk, And Change Constraints", `${qualityText()}\n${riskBullets()}`) +
  section("6. Decisions, Changes, And Unknowns", `${list(layer.architecture_decisions, (a) => `- ${a.title} (${a.status}) [evidence: ${a.id}]`, "未识别到 ADR。[evidence: known_unknown]")}\n${list(layer.change_requests, (c) => `- ${c.title} (${c.status}) [evidence: ${c.id}]`, "未识别到 CR。[evidence: known_unknown]")}\n${list(layer.known_unknowns, (u) => `- ${u.question}: ${u.reason} [evidence: ${u.id}]`, "未识别到开放 unknown。[evidence: specs/arch-layer.json]")}`);
writeDoc(join(wikiDir, "ARCHITECTURE.md"), architecture);

writeDoc(join(wikiDir, "README.md"), h("Wiki README") + [
  "- [ARCHITECTURE.md](ARCHITECTURE.md) 是主产物长文。",
  "- 01-14 是按主题切出的投影视图。",
  "- 所有判断应回链到 evidence。",
].join("\n"));

function writeDoc(path, content) {
  writeFileSync(path, `${content.trimEnd()}\n`, "utf-8");
}

function renderRules() {
  const rulesDir = join(archDir, "rules");
  if (!existsSync(rulesDir)) return "未识别到 rules 目录；团队约束不参与本次投影。[evidence: known_unknown]\n";
  const files = readdirSync(rulesDir).filter((f) => f.endsWith(".md"));
  return list(files, (f) => `- **${f}**：规则文件存在，设计评审时应纳入约束。[evidence: rules/${f}]`, "未识别到规则文件。[evidence: known_unknown]");
}

function renderMermaid() {
  const components = (layer.component_profiles || []).slice(0, 12);
  if (!components.length) return "未识别到可绘制的组件；diagram 保持诚实空缺。[evidence: known_unknown]\n";
  const lines = ["```mermaid", "flowchart LR"];
  for (const c of components) lines.push(`  ${safeId(c.id)}["${escapeLabel(c.name)}"]`);
  for (const flow of layer.flows || []) {
    const ids = (flow.node_ids || []).map((id) => components.find((c) => (c.node_ids || []).includes(id))?.id).filter(Boolean);
    for (let i = 0; i < ids.length - 1; i++) lines.push(`  ${safeId(ids[i])} --> ${safeId(ids[i + 1])}`);
  }
  lines.push("```");
  lines.push(`\n[evidence: ${(components.flatMap((c) => c.evidence_refs || [])).slice(0, 12).join(", ")}]`);
  return `${lines.join("\n")}\n`;
}

function safeId(id) {
  return String(id || "node").replace(/[^a-zA-Z0-9_]/g, "_");
}

function escapeLabel(label) {
  return String(label || "").replace(/"/g, "'");
}

console.log(JSON.stringify({ wikiDir, pages: 16, generatedAt, commit }, null, 2));
