#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { parseArgs, readJson, writeJson } = require("./_lib");

const WIKI_PAGES = [
  ["01-overview.md", "Overview"],
  ["02-components.md", "Components"],
  ["03-interfaces.md", "Interfaces"],
  ["04-data-models.md", "Data Models"],
  ["05-capabilities.md", "Capabilities"],
  ["06-quality.md", "Quality"],
  ["07-risks-and-debt.md", "Risks And Debt"],
  ["08-deployments.md", "Deployments"],
  ["09-flows-and-scenarios.md", "Flows And Scenarios"],
  ["10-decisions.md", "Decisions"],
  ["11-changes.md", "Changes"],
  ["12-rules.md", "Rules"],
  ["13-pending-changes.md", "Pending Changes"],
  ["14-diagrams.md", "Diagrams"]
];

function loadWorkspace(workspace) {
  const specs = path.join(workspace, "specs");
  const crossRepo = readJson(path.join(specs, "cross-repo.json"));
  const repoGraphs = [];
  for (const repo of crossRepo.repos ?? []) {
    const graphPath = path.join(specs, "repos", repo.id, "knowledge-graph.json");
    if (fs.existsSync(graphPath)) repoGraphs.push(readJson(graphPath));
  }
  return { crossRepo, repoGraphs };
}

function allNodes(repoGraphs) {
  return repoGraphs.flatMap((graph) => graph.nodes ?? []);
}

function nodeList(nodes, limit = 50) {
  if (!nodes.length) return "暂无。";
  return nodes.slice(0, limit).map((node) => `- \`${node.id}\` ${node.name}: ${node.summary}`).join("\n");
}

function evidenceLine(node) {
  const evidence = node.evidence_refs?.[0];
  if (!evidence) return `证据:${node.id}`;
  return `证据:${node.id} -> ${evidence.repo_id}/${evidence.file}`;
}

function writePage(wikiDir, file, title, body) {
  fs.writeFileSync(path.join(wikiDir, file), `# ${title}\n\n${body.trim()}\n`);
}

function renderRules(workspace) {
  const rulesDir = path.join(workspace, "rules");
  if (!fs.existsSync(rulesDir)) return "暂无 rules/*.md。";
  const files = fs.readdirSync(rulesDir).filter((name) => name.endsWith(".md")).sort();
  if (!files.length) return "暂无 rules/*.md。";
  return files.map((name) => `- \`rules/${name}\``).join("\n");
}

function repoSummary(crossRepo, repoGraphs) {
  return (crossRepo.repos ?? []).map((repo) => {
    const graph = repoGraphs.find((item) => item.repo_id === repo.id);
    const nodes = graph?.nodes ?? [];
    const edges = graph?.edges ?? [];
    return {
      repo,
      nodes,
      edges,
      nodeTypes: countBy(nodes, "type"),
      edgeTypes: countBy(edges, "type")
    };
  });
}

function countBy(items, key) {
  const out = {};
  for (const item of items) {
    const value = item[key] ?? "unknown";
    out[value] = (out[value] ?? 0) + 1;
  }
  return out;
}

function tableFromCounts(counts) {
  const entries = Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
  if (!entries.length) return "| 类型 | 数量 |\n|---|---:|\n| 暂无 | 0 |";
  return ["| 类型 | 数量 |", "|---|---:|", ...entries.map(([name, count]) => `| ${name} | ${count} |`)].join("\n");
}

function richOverview(crossRepo, repoGraphs) {
  const repos = repoSummary(crossRepo, repoGraphs);
  const allNodes = repos.flatMap((item) => item.nodes);
  const allEdges = repos.flatMap((item) => item.edges);
  const crossEdges = crossRepo.cross_edges ?? [];
  const lines = [
    `项目:${crossRepo.project?.name ?? "unknown"}`,
    `描述:${crossRepo.project?.description || "暂无项目描述。"}`,
    `仓库数:${repos.length}`,
    `节点总数:${allNodes.length}`,
    `仓内边总数:${allEdges.length}`,
    `跨仓边总数:${crossEdges.length}`,
    "",
    "## 1. 基线可信度",
    "",
    "本页由 graph 确定性事实渲染,不是新的事实源。每个结论都应能回链到 repo graph、cross-repo graph、ADR、CR 或 rules。",
    "如果本页与 graph 冲突,以 graph 为准,并应重新运行 arch-analyze 或 arch-wiki。",
    "",
    "## 2. 仓库总览",
    "",
    "| 仓库 | 主语言 | 本地路径 | 节点 | 仓内边 | 描述 |",
    "|---|---|---|---:|---:|---|",
    ...repos.map(({ repo, nodes, edges }) => `| ${repo.id} | ${repo.primary_language || "unknown"} | ${repo.path || "."} | ${nodes.length} | ${edges.length} | ${repo.description || "暂无"} |`),
    "",
    "## 3. 节点类型分布",
    "",
    tableFromCounts(countBy(allNodes, "type")),
    "",
    "## 4. 边类型分布",
    "",
    tableFromCounts(countBy(allEdges, "type")),
    "",
    "## 5. 跨仓关系",
    "",
    crossEdges.length ? crossEdges.map((edge) => `- \`${edge.source}\` -> \`${edge.target}\` (${edge.type}, weight=${edge.weight})`).join("\n") : "暂无跨仓边。N=1 单仓项目这是正常结果。",
    "",
    "## 6. 关键证据样本",
    ""
  ];
  for (const node of allNodes.slice(0, 20)) {
    const ref = node.evidence_refs?.[0];
    lines.push(`- \`${node.id}\` ${node.name}: ${ref ? `${ref.repo_id}/${ref.file}` : "暂无 evidence_ref"}`);
  }
  lines.push(
    "",
    "## 7. 设计阅读顺序",
    "",
    "1. 先读 `02-components.md`,确认组件、文件、服务和配置的边界。",
    "2. 再读 `03-interfaces.md`,确认 endpoint/schema 是否足够支撑方案设计。",
    "3. 接着读 `06-quality.md` 与 `07-risks-and-debt.md`,识别 NFR、风险和技术债是否已补齐。",
    "4. 最后读 `13-pending-changes.md`,确认 CR 状态和未完成事项。",
    "",
    "## 8. 架构判断边界",
    "",
    "当前 v2.0 确定性扫描能可靠覆盖文件、函数、类、配置、文档、基础设施线索、仓内 import 边和保守跨仓引用边。",
    "业务能力、NFR、风险、技术债属于 LLM 推断层,必须由对应 subagent 产出 confidence 与 evidence_refs 后才能进入 cross-repo.json。",
    "当 graph 中缺少接口、数据模型或部署事实时,wiki 不得自行补事实,只能在已知局限中指出缺口。",
    "",
    "## 9. 后续维护",
    "",
    "每次代码结构变化后,应先用 fingerprint 判断 freshness,再决定是否跑增量 arch-analyze。",
    "CR 和 ADR 写入后,应同步 cross-repo.json 的 change_requests、architecture_decisions 与 traceability。",
    "wiki 只是人类视图,不得绕过 graph 直接承载新事实。",
    "",
    "## 10. 本页生成协议",
    "",
    "渲染器优先按 LLM wiki prompt 的章节协议组织内容;在没有运行时 LLM 的环境中,使用 graph 证据执行确定性兜底渲染。",
    "兜底渲染仍需满足:内容充分、引用 graph node id、保留已知局限、不制造新事实。",
    "本页至少包含仓库、节点、边、跨仓关系、证据样本、阅读顺序、判断边界和维护协议。"
  );
  return lines.join("\n");
}

function pageBody(title, nodes, extra = []) {
  return [
    `本页主题:${title}`,
    "事实来源:repo graph / cross-repo graph / rules / ADR / CR。",
    "",
    "## 事实清单",
    nodeList(nodes),
    "",
    "## 说明",
    nodes.length ? "上述条目均来自 graph 节点或跨仓索引。缺失项必须回写 graph 或 known_unknowns,不得在 wiki 中凭空补充。" : "当前 graph 没有提供该类节点。若项目实际存在此类事实,请重新运行 arch-analyze 或补充对应 subagent 推断结果。",
    ...extra
  ].join("\n");
}

function renderWiki(workspace) {
  const { crossRepo, repoGraphs } = loadWorkspace(workspace);
  const nodes = allNodes(repoGraphs);
  const wikiDir = path.join(workspace, "wiki");
  fs.mkdirSync(wikiDir, { recursive: true });

  const byType = (types) => nodes.filter((node) => types.includes(node.type));
  const files = byType(["file", "document", "module", "service"]);
  const interfaces = byType(["endpoint", "schema"]);
  const data = byType(["table", "schema", "entity"]);
  const deployments = byType(["resource", "pipeline", "config"]);
  const flows = byType(["flow", "step"]);
  const evidence = nodes.slice(0, 10).map(evidenceLine).join("\n") || "暂无 evidence。";

  const index = WIKI_PAGES.map(([file, title]) => `- [${title}](./${file})`).join("\n");
  fs.writeFileSync(path.join(wikiDir, "README.md"), `# ${crossRepo.project?.name ?? path.basename(workspace)} 架构 wiki\n\n${index}\n`);

  writePage(wikiDir, "01-overview.md", "01 Overview", richOverview(crossRepo, repoGraphs));

  writePage(wikiDir, "02-components.md", "02 Components", pageBody("组件与代码结构", files));
  writePage(wikiDir, "03-interfaces.md", "03 Interfaces", [
    pageBody("接口与契约", interfaces),
    "",
    "## 已知局限",
    "",
    "本页只呈现 graph 中已识别的 endpoint/schema 节点;缺失项必须回写 graph 或 known_unknowns。",
    "如果代码中存在动态路由、运行时注册、外部 API 网关或未被解析器覆盖的协议,这里可能低估接口数量。",
    "任何没有 evidence_refs 的接口判断都不能作为架构决策依据。"
  ].join("\n"));
  writePage(wikiDir, "04-data-models.md", "04 Data Models", pageBody("数据模型", data));
  writePage(wikiDir, "05-capabilities.md", "05 Capabilities", pageBody("业务能力", crossRepo.capabilities ?? []));
  writePage(wikiDir, "06-quality.md", "06 Quality", pageBody("质量属性", crossRepo.quality_attributes ?? []));
  writePage(wikiDir, "07-risks-and-debt.md", "07 Risks And Debt", [
    "## Risks",
    nodeList(crossRepo.risks ?? []),
    "",
    "## Technical Debt",
    nodeList(crossRepo.technical_debt ?? [])
  ].join("\n"));
  writePage(wikiDir, "08-deployments.md", "08 Deployments", nodeList(deployments));
  writePage(wikiDir, "09-flows-and-scenarios.md", "09 Flows And Scenarios", nodeList(flows));
  writePage(wikiDir, "10-decisions.md", "10 Decisions", nodeList(crossRepo.architecture_decisions ?? []));
  writePage(wikiDir, "11-changes.md", "11 Changes", nodeList(crossRepo.change_requests ?? []));
  writePage(wikiDir, "12-rules.md", "12 Rules", renderRules(workspace));
  writePage(wikiDir, "13-pending-changes.md", "13 Pending Changes", nodeList((crossRepo.change_requests ?? []).filter((cr) => ["draft", "in_review", "ready"].includes(cr.status))));
  writePage(wikiDir, "14-diagrams.md", "14 Diagrams", [
    "v2.0 保留 4+1 / C4 视图占位,图片生成留给 v2.1。",
    "",
    "## Mermaid 占位",
    "",
    "```mermaid",
    "flowchart LR",
    ...((crossRepo.repos ?? []).map((repo) => `  ${repo.id}[${repo.id}]`)),
    "```"
  ].join("\n"));

  return { wikiDir, pages: WIKI_PAGES.length + 1 };
}

function main() {
  const args = parseArgs(process.argv);
  const workspace = path.resolve(args.workspace || args._[0] || process.cwd());
  const result = renderWiki(workspace);
  writeJson({ status: "ok", ...result });
}

module.exports = { WIKI_PAGES, renderWiki };

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
