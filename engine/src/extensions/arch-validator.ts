import type { CrossRepoGraph, RepoKnowledgeGraph } from "./arch-schema";

export function repoPrefix(repoId: string): string {
  return `${repoId}::`;
}

export function validateRepoGraph(graph: RepoKnowledgeGraph): string[] {
  const errors: string[] = [];
  const prefix = repoPrefix(graph.repo_id);
  const nodeIds = new Set(graph.nodes.map((node) => node.id));

  for (const node of graph.nodes) {
    if (node.repo_id !== graph.repo_id) {
      errors.push(`node ${node.id} repo_id must equal ${graph.repo_id}`);
    }
    if (!node.id.startsWith(prefix)) {
      errors.push(`node ${node.id} must start with ${prefix}`);
    }
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      errors.push(`edge ${edge.source} -> ${edge.target} references missing node`);
    }
    if (!edge.source.startsWith(prefix) || !edge.target.startsWith(prefix)) {
      errors.push(`repo graph edge ${edge.source} -> ${edge.target} crosses repo boundary`);
    }
  }

  return errors;
}

export function validateCrossRepoGraph(graph: CrossRepoGraph, repoGraphs: RepoKnowledgeGraph[]): string[] {
  const errors: string[] = [];
  const nodeIds = new Set(repoGraphs.flatMap((repo) => repo.nodes.map((node) => node.id)));

  for (const edge of graph.cross_edges ?? []) {
    const sourceRepo = edge.source.split("::")[0];
    const targetRepo = edge.target.split("::")[0];
    if (sourceRepo === targetRepo) {
      errors.push(`cross edge ${edge.source} -> ${edge.target} is not cross-repo`);
    }
    if (!edge.cross_repo) {
      errors.push(`cross edge ${edge.source} -> ${edge.target} must set cross_repo=true`);
    }
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      errors.push(`cross edge ${edge.source} -> ${edge.target} references missing node`);
    }
  }

  return errors;
}

