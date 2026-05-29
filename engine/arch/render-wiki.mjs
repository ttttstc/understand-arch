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

function subsection(title, body) {
  return `### ${title}\n\n${body.trim()}\n\n`;
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

function onboardingPath() {
  const style = layer.architecture_style?.primary || "尚未判定";
  const components = (layer.component_profiles || []).slice(0, 5).map((component) => component.name).join("、") || "核心组件尚未识别";
  const capabilities = (layer.capabilities || []).slice(0, 5).map((capability) => capability.name).join("、") || "核心能力尚未识别";
  const topRisks = (layer.risks || []).slice(0, 3).map((risk) => risk.title).join("、") || "风险层尚未识别";
  return [
    `第一次读这个系统时，先把它当成一个 **${style}** 来理解：先看用户能力，再看支撑这些能力的组件，最后再进入接口、质量和风险。`,
    `建议阅读顺序是：先读本章建立全局地图；再读 05 能力地图理解产品能做什么；然后读 02 组件职责与模块，把能力落到代码组织；接着读 09 流程与场景，确认运行时怎么串起来；最后读 06 和 07，判断哪些地方会影响后续改动。`,
    `当前最值得先记住的组件是：${components}。当前最值得先记住的能力是：${capabilities}。当前最需要带着问题意识阅读的是：${topRisks}。`,
  ].join("\n\n");
}

function mentalModelText() {
  const repoCount = (layer.project?.repos || []).length;
  const moduleCount = nodesOf(["module"]).length;
  const serviceCount = nodesOf(["service"]).length;
  const capabilityCount = (layer.capabilities || []).length;
  const riskCount = (layer.risks || []).length;
  return [
    `${projectName()} 可以先用三层心智模型理解：第一层是用户能力，回答“这个系统对外提供什么价值”；第二层是组件和边界，回答“这些能力由哪些代码区域负责”；第三层是质量、风险和约束，回答“下一次改动最容易碰到什么代价”。`,
    `本次扫描覆盖 ${repoCount} 个仓库，识别到 ${moduleCount} 个 module、${serviceCount} 个 service、${capabilityCount} 个能力项和 ${riskCount} 个风险项。这个数字不是结论本身，而是帮助新架构师判断阅读深度：能力和风险非空时，应优先从业务路径读到代码边界；module/service 较少时，则要特别注意是否仍停留在前端单体或早期项目形态。`,
  ].join("\n\n");
}

function glossaryText() {
  return [
    "- **能力**：用户或平台可感知的一组价值输出，不等同于单个文件。",
    "- **组件**：承担稳定职责的代码区域或运行时边界，可以由 module、service、resource 或关键文件支撑。",
    "- **边界**：改动、运行时、数据或团队责任的分界线。边界清楚，变更成本就更可控。",
    "- **质量属性**：性能、安全、可靠性、可维护性等非功能要求，用来判断架构是否支撑长期演进。",
    "- **风险**：如果不处理，可能影响交付、运行、安全或架构演进的结构性问题。",
    "- **技术债**：已经存在的实现代价，通常不会立刻阻断系统，但会放大后续修改成本。",
    "- **复杂度热点**：理解或修改成本明显集中的区域，适合作为重构、测试和设计评审的重点。",
  ].join("\n");
}

function componentIntro() {
  const roles = new Map();
  for (const component of layer.component_profiles || []) {
    const key = component.role || "unknown";
    roles.set(key, (roles.get(key) || 0) + 1);
  }
  const roleSummary = [...roles.entries()].map(([role, count]) => `${role}:${count}`).join("，") || "尚未形成角色分布";
  return [
    `读组件时，不要从文件名开始背。先按职责分组：谁负责应用编排，谁负责用户界面，谁负责领域处理，谁负责外部集成。这样后续看到具体文件时，才知道它在架构里承担什么角色。`,
    `当前组件角色分布是：${roleSummary}。下面先给职责叙事，再给代码层事实，方便从架构语言落到实际模块。`,
  ].join("\n\n");
}

function interfaceIntro() {
  return [
    "接口与集成章节先回答两个问题：系统依赖哪些外部运行时或库，以及哪些接口边界会限制未来扩展。",
    "如果 endpoint/schema 节点为空，不代表系统没有接口，而是说明本次代码事实层没有识别出显式 HTTP/API/schema 边界。桌面应用和前端单体常见的关键接口会体现在 IPC、插件栈或运行时依赖上。",
  ].join("\n\n");
}

function boundaryIntro() {
  return [
    "数据模型与边界章节不是只找数据库表。对桌面应用、前端单体或工具型项目，运行时边界、模块边界、文件系统边界同样重要。",
    "新架构师读这一章时，应重点看“内部节点”和“外部对象”的分界：这决定了新增能力时应该改 UI、改领域库、改 IPC，还是补运行时实现。",
  ].join("\n\n");
}

function capabilityIntro() {
  const critical = (layer.capabilities || []).filter((capability) => capability.importance === "critical").map((capability) => capability.name);
  return [
    "能力地图是最适合新人起步的一章。它从用户或平台价值出发，而不是从目录结构出发。",
    `优先看 importance=critical 的能力：${critical.join("、") || "当前未标出 critical 能力"}。成熟度不是好坏评价，而是提示你这项能力在“可用、稳定、可扩展”之间处于什么阶段。`,
  ].join("\n\n");
}

function qualityIntro() {
  return [
    "质量属性用来回答“这个系统能不能长期改、稳定跑、安全扩”。阅读时先看 status，再看它关联到哪些能力和边界。",
    "status 的含义可以这样理解：strong 表示已有多重支撑；adequate 表示当前够用但仍有缺口；weak 表示证据显示短板；unknown 表示不能捏造，需要后续补事实。",
  ].join("\n\n");
}

function riskIntro() {
  return [
    "风险与技术债不是问题清单，而是改动路线图。风险告诉你什么会阻断目标，技术债告诉你什么会放大修改成本，复杂度热点告诉你哪里最需要测试和设计评审保护。",
    "新人读这一章时，建议先看 critical/high 风险，再回到 02、05、09 找对应组件和流程。这样能把“为什么危险”和“改哪里”连起来。",
  ].join("\n\n");
}

function deploymentIntro() {
  return [
    "运行与部署章节关注系统实际在哪里运行、哪些配置或资源影响启动和发布。对桌面应用来说，渲染进程、主进程、preload、文件系统权限和构建打包链路，通常比传统服务部署更关键。",
    "如果资源或 pipeline 节点为空，应把它视为一个需要补充的事实空缺，而不是默认系统没有发布约束。",
  ].join("\n\n");
}

function flowIntro() {
  return [
    "流程章节把能力串成运行时故事。它适合用来回答：用户触发什么、系统经过哪些组件、最后得到什么结果。",
    "当你要改一个功能时，先找对应流程，再沿着步骤回到组件和风险章节，比直接搜索文件更稳。",
  ].join("\n\n");
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
    content: () => section("给新架构师的阅读路径", onboardingPath()) +
      section("一分钟心智模型", mentalModelText()) +
      section("术语速查", glossaryText()) +
      section("架构判断", styleText()) +
      section("项目范围", `项目 **${layer.project?.name || basename(archDir)}** 覆盖 ${(layer.project?.repos || []).length} 个仓库。架构白皮书以 arch-layer 叙事字段为主，代码 graph 为事实来源。`) +
      section("设计阅读顺序", list(layer.tour, (step) => `- ${step.order}. **${step.title}**：${step.description}`, "未识别到架构导览步骤；可重跑 arch-enrich Phase 11。")) +
      section("核心组件概览", componentBullets()),
  },
  {
    file: "02-components.md",
    title: "02 组件职责与模块",
    content: () => section("先按职责理解组件", componentIntro()) + section("组件职责叙事", componentBullets()) + section("代码层组件事实", graphNodesText(["module", "service", "resource"], "未识别到 module/service/resource 节点。")),
  },
  {
    file: "03-interfaces.md",
    title: "03 接口与集成",
    content: () => section("先分清依赖和边界", interfaceIntro()) + section("技术栈判断", techBullets()) + section("接口与集成判断", depsText()) + section("接口节点事实", graphNodesText(["endpoint", "schema"], "未识别到 endpoint/schema 节点。")),
  },
  {
    file: "04-data-models.md",
    title: "04 数据模型与边界",
    content: () => section("先看边界，再看数据", boundaryIntro()) + section("数据边界", boundariesText()) + section("数据节点事实", graphNodesText(["table", "schema"], "未识别到 table/schema 节点。")),
  },
  {
    file: "05-capabilities.md",
    title: "05 能力地图",
    content: () => section("从用户价值开始", capabilityIntro()) + section("能力地图", capabilitiesText()) + section("能力链路", flowBullets()),
  },
  {
    file: "06-quality.md",
    title: "06 质量属性",
    content: () => section("先理解状态含义", qualityIntro()) + section("质量属性", qualityText()) + section("扩展约束", list(layer.extension_constraints, (constraint) => `- **${constraint.title}**：${constraint.recommendation}`, "未识别到扩展约束。")),
  },
  {
    file: "07-risks-and-debt.md",
    title: "07 风险与技术债",
    content: () => section("先把风险读成改动路线图", riskIntro()) + riskText(),
  },
  {
    file: "08-deployments.md",
    title: "08 运行与部署",
    content: () => section("先确认系统在哪里运行", deploymentIntro()) + section("运行与部署边界", boundariesText()) + section("部署节点事实", graphNodesText(["resource", "pipeline", "config"], "未识别到 resource/pipeline/config 节点。")),
  },
  {
    file: "09-flows-and-scenarios.md",
    title: "09 流程与场景",
    content: () => section("先读用户故事，再追代码路径", flowIntro()) + section("端到端链路", flowBullets()) + section("Domain Flow 节点", graphNodesText(["domain", "flow", "step"], "未识别到 domain/flow/step 节点。")),
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
    content: () => section("Known Unknowns", list(layer.known_unknowns, (unknown) => typeof unknown === "string"
      ? `- ${unknown}`
      : `- **${unknown.question}** (${unknown.status})：${unknown.reason} owner:${unknown.owner}`,
    "未识别到开放 known_unknowns。")),
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
  "- 01-14 是同源章节的单页切片，供 dashboard、局部刷新和精读使用。",
  "- 审计回链保留在结构化 JSON 中，阅读文档只呈现架构叙事。",
].join("\n"));

function slug(title) {
  return title.toLowerCase().replace(/[^\p{Letter}\p{Number}\s-]/gu, "").trim().replace(/\s+/g, "-");
}

function writeDoc(path, content) {
  writeFileSync(path, `${content.trimEnd()}\n`, "utf-8");
}

console.log(JSON.stringify({ wikiDir, pages: 16, generatedAt, commit }, null, 2));
