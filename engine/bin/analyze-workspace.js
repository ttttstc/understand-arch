#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const {
  parseArgs,
  readJson,
  readReposYaml,
  sha256,
  writeJson
} = require("./_lib");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function safeRepoPath(workspace, repoPath) {
  return path.resolve(workspace, repoPath || ".");
}

function nowIso() {
  return new Date().toISOString();
}

function slug(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/^-|-$/g, "") || "root";
}

function repoNodeId(repoId, localId) {
  return `${repoId}::${localId}`;
}

function fileNodeId(repoId, filePath) {
  return repoNodeId(repoId, `${fileNodePrefix(filePath)}-${slug(filePath)}`);
}

function fileNodePrefix(filePath) {
  const lower = String(filePath).toLowerCase();
  if (/\.(md|mdx|rst|txt)$/.test(lower)) return "doc";
  if (/\.(ya?ml|jsonc?|toml|xml|env|ini|cfg|properties)$/.test(lower)) return "cfg";
  if (/\.(sql)$/.test(lower)) return "tbl";
  if (/\.(graphql|gql|proto|prisma)$/.test(lower)) return "schema";
  if (/\.(tf|tfvars)$/.test(lower)) return "res";
  if (/(^|\/)(dockerfile|docker-compose|compose\.ya?ml|\.github\/workflows\/|k8s\/|kubernetes\/)/i.test(lower)) return "svc";
  return "file";
}

function fileNodeType(file) {
  const category = file.fileCategory;
  const lower = String(file.path).toLowerCase();
  if (category === "docs") return "document";
  if (category === "config") return "config";
  if (category === "infra") return lower.includes("terraform") || lower.endsWith(".tf") ? "resource" : "service";
  if (category === "data") {
    if (/\.(graphql|gql|proto|prisma)$/.test(lower)) return "schema";
    if (/\.sql$/.test(lower)) return "table";
  }
  return "file";
}

function complexityFromLines(lines) {
  if (lines > 400) return "complex";
  if (lines > 120) return "moderate";
  return "simple";
}

function evidence(repoId, file, extractedAt, lineRange) {
  const ref = {
    repo_id: repoId,
    file,
    source: "engine",
    extracted_at: extractedAt
  };
  if (lineRange) ref.line_range = lineRange;
  return [ref];
}

function runNode(toolName, args, options = {}) {
  const tool = path.resolve(__dirname, "..", "upstream-tools", toolName);
  const child = spawnSync(process.execPath, [tool, ...args], {
    cwd: path.resolve(__dirname, "..", ".."),
    encoding: "utf8",
    ...options
  });
  if (child.status !== 0) {
    throw new Error(`${toolName} failed: ${(child.stderr || child.stdout || "").trim()}`);
  }
  return child;
}

function readSmallText(file) {
  try {
    const stat = fs.statSync(file);
    if (stat.size > 256 * 1024) return "";
    return fs.readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function enrichScanFiles(repoRoot, scanFiles) {
  return scanFiles.map((file) => {
    const full = path.join(repoRoot, file.path);
    const bytes = fs.existsSync(full) ? fs.readFileSync(full) : Buffer.from("");
    return {
      ...file,
      bytes: bytes.length,
      hash: sha256(bytes),
      text: bytes.length <= 256 * 1024 ? readSmallText(full) : ""
    };
  });
}

function buildStructure(repoRoot, files, importMap, intermediateDir, repoId) {
  const input = path.join(intermediateDir, `structure-input-${repoId}.json`);
  const output = path.join(intermediateDir, `structure-output-${repoId}.json`);
  fs.writeFileSync(input, `${JSON.stringify({
    projectRoot: repoRoot,
    batchFiles: files,
    batchImportData: importMap
  }, null, 2)}\n`);
  runNode("extract-structure.mjs", [input, output]);
  return readJson(output);
}

function buildImportMap(repoRoot, files, intermediateDir, repoId) {
  const input = path.join(intermediateDir, `import-input-${repoId}.json`);
  const output = path.join(intermediateDir, `import-output-${repoId}.json`);
  fs.writeFileSync(input, `${JSON.stringify({ projectRoot: repoRoot, files }, null, 2)}\n`);
  runNode("extract-import-map.mjs", [input, output]);
  return readJson(output).importMap ?? {};
}

function scanWithUpstream(repoRoot, intermediateDir, repoId) {
  const output = path.join(intermediateDir, `scan-result-${repoId}.json`);
  runNode("scan-project.mjs", [repoRoot, output]);
  return readJson(output);
}

function scanRepo(repo, workspace) {
  const repoRoot = safeRepoPath(workspace, repo.path);
  const intermediateDir = path.join(workspace, "intermediate");
  ensureDir(intermediateDir);
  const scan = scanWithUpstream(repoRoot, intermediateDir, repo.id);
  const files = enrichScanFiles(repoRoot, scan.files ?? []);
  const importMap = buildImportMap(repoRoot, files, intermediateDir, repo.id);
  const structure = buildStructure(repoRoot, files, importMap, intermediateDir, repo.id);
  const structureByPath = new Map((structure.results ?? []).map((result) => [result.path, result]));

  const languages = [...new Set(files.map((file) => file.language).filter((language) => language !== "unknown"))].sort();
  const extractedAt = nowIso();
  const nodes = [];
  const edges = [];
  const nodeIds = new Set();
  const edgeKeys = new Set();
  const pathToFileNode = new Map();
  const symbolToNode = new Map();

  function addNode(node) {
    if (nodeIds.has(node.id)) return node.id;
    nodeIds.add(node.id);
    nodes.push(node);
    return node.id;
  }

  function addEdge(edge) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) return;
    const key = `${edge.source}->${edge.target}->${edge.type}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push(edge);
  }

  for (const file of files) {
    const fileId = fileNodeId(repo.id, file.path);
    pathToFileNode.set(file.path, fileId);
    addNode({
      id: fileId,
      repo_id: repo.id,
      type: fileNodeType(file),
      name: file.path,
      filePath: file.path,
      summary: `由 Understand-Anything 确定性扫描发现的 ${file.language} ${file.fileCategory} 文件。`,
      tags: [file.language, file.fileCategory, "understand-anything"],
      complexity: complexityFromLines(file.sizeLines ?? 0),
      evidence_refs: evidence(repo.id, file.path, extractedAt),
      confidence: "high"
    });
  }

  for (const result of structure.results ?? []) {
    const fileId = pathToFileNode.get(result.path);
    if (!fileId) continue;
    const fileComplexity = complexityFromLines(result.totalLines ?? 0);
    for (const fn of result.functions ?? []) {
      const id = repoNodeId(repo.id, `func-${slug(result.path)}-${slug(fn.name)}`);
      addNode({
        id,
        repo_id: repo.id,
        type: "function",
        name: fn.name,
        filePath: result.path,
        lineRange: [fn.startLine, fn.endLine],
        summary: `函数 ${fn.name},由 Understand-Anything 结构抽取识别。`,
        tags: [result.language, "function", "understand-anything"],
        complexity: fileComplexity,
        evidence_refs: evidence(repo.id, result.path, extractedAt, [fn.startLine, fn.endLine]),
        confidence: "high"
      });
      symbolToNode.set(`${result.path}::${fn.name}`, id);
      if (!symbolToNode.has(fn.name)) symbolToNode.set(fn.name, id);
      addEdge({ source: fileId, target: id, type: "contains", direction: "forward", weight: 1 });
    }

    for (const cls of result.classes ?? []) {
      const id = repoNodeId(repo.id, `class-${slug(result.path)}-${slug(cls.name)}`);
      addNode({
        id,
        repo_id: repo.id,
        type: "class",
        name: cls.name,
        filePath: result.path,
        lineRange: [cls.startLine, cls.endLine],
        summary: `类或类型 ${cls.name},由 Understand-Anything 结构抽取识别。`,
        tags: [result.language, "class", "understand-anything"],
        complexity: fileComplexity,
        evidence_refs: evidence(repo.id, result.path, extractedAt, [cls.startLine, cls.endLine]),
        confidence: "high"
      });
      symbolToNode.set(`${result.path}::${cls.name}`, id);
      if (!symbolToNode.has(cls.name)) symbolToNode.set(cls.name, id);
      addEdge({ source: fileId, target: id, type: "contains", direction: "forward", weight: 1 });
    }

    for (const endpoint of result.endpoints ?? []) {
      const name = `${endpoint.method ?? ""} ${endpoint.path}`.trim();
      const id = repoNodeId(repo.id, `ep-${slug(result.path)}-${slug(name)}`);
      addNode({
        id,
        repo_id: repo.id,
        type: "endpoint",
        name,
        filePath: result.path,
        lineRange: [endpoint.startLine, endpoint.endLine],
        summary: `接口 ${name},由 Understand-Anything 结构抽取识别。`,
        tags: [result.language, "endpoint", "understand-anything"],
        complexity: fileComplexity,
        boundary: "public",
        communication: "sync",
        evidence_refs: evidence(repo.id, result.path, extractedAt, [endpoint.startLine, endpoint.endLine]),
        confidence: "high"
      });
      addEdge({ source: fileId, target: id, type: "contains", direction: "forward", weight: 1 });
    }

    for (const definition of result.definitions ?? []) {
      const type = ["table", "view", "index"].includes(definition.kind) ? "table" : "schema";
      const id = repoNodeId(repo.id, `${type === "table" ? "tbl" : "schema"}-${slug(result.path)}-${slug(definition.name)}`);
      addNode({
        id,
        repo_id: repo.id,
        type,
        name: definition.name,
        filePath: result.path,
        lineRange: [definition.startLine, definition.endLine],
        summary: `${definition.kind} ${definition.name},由 Understand-Anything 非代码解析器识别。`,
        tags: [result.language, definition.kind, "understand-anything"],
        complexity: fileComplexity,
        evidence_refs: evidence(repo.id, result.path, extractedAt, [definition.startLine, definition.endLine]),
        confidence: "high"
      });
      addEdge({ source: fileId, target: id, type: "contains", direction: "forward", weight: 1 });
    }

    for (const service of result.services ?? []) {
      const id = repoNodeId(repo.id, `svc-${slug(result.path)}-${slug(service.name)}`);
      addNode({
        id,
        repo_id: repo.id,
        type: "service",
        name: service.name,
        filePath: result.path,
        lineRange: service.startLine && service.endLine ? [service.startLine, service.endLine] : undefined,
        summary: `服务定义 ${service.name},由 Understand-Anything 非代码解析器识别。`,
        tags: [result.language, "service", "understand-anything"],
        complexity: fileComplexity,
        evidence_refs: evidence(repo.id, result.path, extractedAt, service.startLine && service.endLine ? [service.startLine, service.endLine] : undefined),
        confidence: "high"
      });
      addEdge({ source: fileId, target: id, type: "contains", direction: "forward", weight: 1 });
    }

    for (const resource of result.resources ?? []) {
      const id = repoNodeId(repo.id, `res-${slug(result.path)}-${slug(resource.name)}`);
      addNode({
        id,
        repo_id: repo.id,
        type: "resource",
        name: resource.name,
        filePath: result.path,
        lineRange: [resource.startLine, resource.endLine],
        summary: `基础设施资源 ${resource.name},由 Understand-Anything 非代码解析器识别。`,
        tags: [result.language, resource.kind, "understand-anything"],
        complexity: fileComplexity,
        evidence_refs: evidence(repo.id, result.path, extractedAt, [resource.startLine, resource.endLine]),
        confidence: "high"
      });
      addEdge({ source: fileId, target: id, type: "contains", direction: "forward", weight: 1 });
    }

    for (const step of result.steps ?? []) {
      const id = repoNodeId(repo.id, `step-${slug(result.path)}-${slug(step.name)}`);
      addNode({
        id,
        repo_id: repo.id,
        type: "step",
        name: step.name,
        filePath: result.path,
        lineRange: [step.startLine, step.endLine],
        summary: `流程步骤 ${step.name},由 Understand-Anything 非代码解析器识别。`,
        tags: [result.language, "step", "understand-anything"],
        complexity: fileComplexity,
        evidence_refs: evidence(repo.id, result.path, extractedAt, [step.startLine, step.endLine]),
        confidence: "high"
      });
      addEdge({ source: fileId, target: id, type: "contains", direction: "forward", weight: 1 });
    }
  }

  for (const [sourcePath, targets] of Object.entries(importMap)) {
    const source = pathToFileNode.get(sourcePath);
    if (!source) continue;
    for (const targetPath of targets ?? []) {
      const target = pathToFileNode.get(targetPath);
      if (!target) continue;
      addEdge({
        source,
        target,
        type: "imports",
        direction: "forward",
        description: `${sourcePath} imports ${targetPath}`,
        weight: 0.7
      });
    }
  }

  for (const result of structure.results ?? []) {
    for (const call of result.callGraph ?? []) {
      const source = symbolToNode.get(`${result.path}::${call.caller}`) || symbolToNode.get(call.caller);
      const target = symbolToNode.get(`${result.path}::${call.callee}`) || symbolToNode.get(call.callee);
      if (!source || !target || source === target) continue;
      addEdge({
        source,
        target,
        type: "calls",
        direction: "forward",
        description: `${call.caller} calls ${call.callee}`,
        weight: 0.8
      });
    }
  }

  const layerMap = new Map();
  for (const node of nodes) {
    if (node.type !== "file" && node.type !== "document" && node.type !== "config" && node.type !== "service" && node.type !== "table" && node.type !== "schema" && node.type !== "resource") continue;
    const key = node.tags?.[1] || node.type;
    if (!layerMap.has(key)) {
      layerMap.set(key, {
        id: `${repo.id}-layer-${slug(key)}`,
        name: key,
        description: `由 Understand-Anything fileCategory=${key} 归类的节点。`,
        node_ids: []
      });
    }
    layerMap.get(key).node_ids.push(node.id);
  }

  return {
    files,
    graph: {
      version: "2.0",
      kind: "codebase",
      repo_id: repo.id,
      repo_meta: {
        id: repo.id,
        path: repo.path || ".",
        git_remote: repo.git_remote || "",
        git_commit_hash: "unknown",
        languages,
        frameworks: [],
        primary_language: repo.primary_language || languages[0] || "unknown",
        description: repo.description || ""
      },
      nodes,
      edges,
      layers: [...layerMap.values()],
      tour: [],
      freshness: {
        status: "fresh",
        reason: "fingerprint generated from current scanned files"
      },
      scan_meta: {
        engine_version: "2.0.0-skeleton",
        based_on: "Understand-Anything scan-project/extract-import-map/extract-structure",
        scanned_at: extractedAt,
        files_scanned: files.length,
        languages_detected: languages,
        upstream_scan: {
          total_files: scan.totalFiles ?? files.length,
          filtered_by_ignore: scan.filteredByIgnore ?? 0,
          estimated_complexity: scan.estimatedComplexity ?? "unknown",
          import_edges: Object.values(importMap).reduce((sum, targets) => sum + (targets?.length ?? 0), 0),
          structure_files_analyzed: structure.filesAnalyzed ?? 0,
          structure_files_skipped: structure.filesSkipped ?? []
        }
      },
      known_unknowns_repo: []
    },
    fingerprint: {
      version: "2.0",
      repo_id: repo.id,
      generated_from: "analyze-workspace",
      files: Object.fromEntries(files.map((file) => [file.path, {
        hash: file.hash,
        bytes: file.bytes,
        language: file.language
      }]))
    }
  };
}

function targetAnchorNode(graph) {
  return (graph.nodes ?? []).find((node) => node.type === "document" && /readme/i.test(node.name))
    || (graph.nodes ?? [])[0];
}

function mentionsRepo(text, repo) {
  if (!text) return false;
  const escaped = repo.id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`['"]@?${escaped}[/:'"]`, "i"),
    new RegExp(`\\b${escaped}\\b`, "i")
  ];
  const remoteBase = String(repo.git_remote || "").split(/[\\/]/).pop()?.replace(/\.git$/, "");
  if (remoteBase && remoteBase !== repo.id) {
    const escapedRemote = remoteBase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    patterns.push(new RegExp(`\\b${escapedRemote}\\b`, "i"));
  }
  return patterns.some((pattern) => pattern.test(text));
}

function inferCrossEdges(repoResults) {
  const edges = [];
  const seen = new Set();
  for (const source of repoResults) {
    for (const target of repoResults) {
      if (source.repo.id === target.repo.id) continue;
      const targetNode = targetAnchorNode(target.graph);
      if (!targetNode) continue;
      for (const file of source.files) {
        if (!mentionsRepo(file.text, target.repo)) continue;
        const edge = {
          source: fileNodeId(source.repo.id, file.path),
          target: targetNode.id,
          type: "references",
          direction: "forward",
          description: `${source.repo.id}/${file.path} 明确引用 ${target.repo.id}`,
          weight: 0.6,
          cross_repo: true,
          evidence_refs: [
            {
              repo_id: source.repo.id,
              file: file.path,
              source: "engine",
              extracted_at: nowIso()
            }
          ]
        };
        const key = `${edge.source}->${edge.target}->${edge.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          edges.push(edge);
        }
      }
    }
  }
  return edges;
}

function main() {
  const args = parseArgs(process.argv);
  const workspace = path.resolve(args.workspace || args._[0] || process.cwd());
  const reposPath = args.repos || path.join(workspace, "specs", "repos.yaml");
  if (!fs.existsSync(reposPath)) {
    console.error(`repos.yaml not found: ${reposPath}`);
    process.exit(1);
  }

  const registry = readReposYaml(reposPath);
  const specsDir = path.join(workspace, "specs");
  ensureDir(path.join(workspace, "intermediate"));
  const repoResults = registry.repos.map((repo) => ({ repo, ...scanRepo(repo, workspace) }));

  for (const result of repoResults) {
    const repoOut = path.join(specsDir, "repos", result.repo.id);
    ensureDir(repoOut);
    fs.writeFileSync(path.join(repoOut, "knowledge-graph.json"), `${JSON.stringify(result.graph, null, 2)}\n`);
    fs.writeFileSync(path.join(repoOut, ".fingerprint.json"), `${JSON.stringify(result.fingerprint, null, 2)}\n`);
  }

  const analyzedAt = nowIso();
  const repos = repoResults.map((result) => result.graph.repo_meta);
  const languagesOverall = [...new Set(repos.flatMap((repo) => repo.languages || []))].sort();
  const crossEdges = inferCrossEdges(repoResults);
  const crossRepo = {
    version: "2.0",
    project: {
      name: path.basename(workspace),
      description: "",
      languages_overall: languagesOverall,
      frameworks_overall: [],
      analyzed_at: analyzedAt
    },
    repos,
    cross_edges: crossEdges,
    capabilities: [],
    architecture_decisions: [],
    change_requests: [],
    traceability: [],
    quality_attributes: [],
    risks: [],
    technical_debt: [],
    known_unknowns: []
  };

  fs.writeFileSync(path.join(specsDir, "cross-repo.json"), `${JSON.stringify(crossRepo, null, 2)}\n`);
  writeJson({
    phase: "analyze-workspace",
    status: "ok",
    workspace,
    repos: repos.map((repo) => repo.id),
    files_scanned: repoResults.reduce((sum, result) => sum + result.files.length, 0),
    cross_edges: crossEdges.length,
    outputs: [
      "specs/cross-repo.json",
      ...repos.flatMap((repo) => [
        `specs/repos/${repo.id}/knowledge-graph.json`,
        `specs/repos/${repo.id}/.fingerprint.json`
      ])
    ]
  });
}

main();
