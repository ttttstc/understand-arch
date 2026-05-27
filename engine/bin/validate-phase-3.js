#!/usr/bin/env node
"use strict";
const { parseArgs, readJson, writeJson } = require("./_lib");

const args = parseArgs(process.argv);
const input = args.input || args._[0];
if (!input) {
  console.error("usage: validate-phase-3.js --input assembled-graph.json");
  process.exit(1);
}

const graph = readJson(input);
const findings = [];
const repoId = graph.repo_id;
const nodeIds = new Set((graph.nodes ?? []).map((node) => node.id));
if (graph.version !== "2.0") findings.push("graph.version must be 2.0");
if (graph.kind !== "codebase") findings.push("graph.kind must be codebase");
if (!repoId) findings.push("missing repo_id");
if (!Array.isArray(graph.nodes)) findings.push("nodes must be an array");
if (!Array.isArray(graph.edges)) findings.push("edges must be an array");
if (!Array.isArray(graph.layers)) findings.push("layers must be an array");
if (!graph.repo_meta?.id || graph.repo_meta.id !== repoId) findings.push("repo_meta.id must equal repo_id");
for (const node of graph.nodes ?? []) {
  if (!node.id?.startsWith(`${repoId}::`)) findings.push(`node ${node.id} missing repo prefix`);
  if (node.repo_id !== repoId) findings.push(`node ${node.id} repo_id must equal ${repoId}`);
  if (!node.type || !node.name || !node.summary || !Array.isArray(node.tags)) {
    findings.push(`node ${node.id} missing required descriptive fields`);
  }
  if (!["simple", "moderate", "complex"].includes(node.complexity)) {
    findings.push(`node ${node.id} invalid complexity`);
  }
  for (const ref of node.evidence_refs ?? []) {
    if (ref.repo_id !== repoId || !ref.file || !ref.source || !ref.extracted_at) {
      findings.push(`node ${node.id} has invalid evidence_ref`);
    }
  }
}
for (const edge of graph.edges ?? []) {
  if (!edge.source?.startsWith(`${repoId}::`) || !edge.target?.startsWith(`${repoId}::`)) {
    findings.push(`repo graph edge crosses repo boundary: ${edge.source} -> ${edge.target}`);
  }
  if (!nodeIds.has(edge.source)) findings.push(`edge source missing node: ${edge.source}`);
  if (!nodeIds.has(edge.target)) findings.push(`edge target missing node: ${edge.target}`);
  if (!edge.type || !edge.direction || typeof edge.weight !== "number") {
    findings.push(`edge missing required fields: ${edge.source} -> ${edge.target}`);
  }
}
for (const layer of graph.layers ?? []) {
  const refs = layer.node_ids ?? layer.nodeIds ?? [];
  if (!layer.id || !layer.name || !Array.isArray(refs)) findings.push(`layer ${layer.id ?? "<missing>"} invalid shape`);
  for (const id of refs) {
    if (!nodeIds.has(id)) findings.push(`layer ${layer.id} references missing node ${id}`);
  }
}
writeJson({ phase: "validate-phase-3", status: findings.length ? "fail" : "pass", findings });
if (findings.length) process.exitCode = 1;
