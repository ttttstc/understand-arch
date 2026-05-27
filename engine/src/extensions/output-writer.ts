import type { CrossRepoGraph, RepoKnowledgeGraph } from "./arch-schema";

export interface GraphOutputPlan {
  repoGraphs: Array<{ repo_id: string; path: string; graph: RepoKnowledgeGraph }>;
  crossRepo: { path: string; graph: CrossRepoGraph };
}

export function createGraphOutputPlan(workspaceDir: string, repoGraphs: RepoKnowledgeGraph[], crossRepo: CrossRepoGraph): GraphOutputPlan {
  return {
    repoGraphs: repoGraphs.map((graph) => ({
      repo_id: graph.repo_id,
      path: `${workspaceDir}/specs/repos/${graph.repo_id}/knowledge-graph.json`,
      graph
    })),
    crossRepo: {
      path: `${workspaceDir}/specs/cross-repo.json`,
      graph: crossRepo
    }
  };
}

