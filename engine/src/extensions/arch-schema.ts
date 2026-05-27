export type Confidence = "high" | "medium" | "low";

export interface EvidenceRef {
  repo_id: string;
  file: string;
  line_range?: [number, number];
  source: "engine" | "llm" | "human";
  extracted_at: string;
}

export interface GraphNode {
  id: string;
  repo_id: string;
  type: string;
  name: string;
  summary: string;
  tags: string[];
  complexity: "simple" | "moderate" | "complex";
  confidence?: Confidence;
  evidence_refs?: EvidenceRef[];
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  direction: "forward" | "backward" | "bidirectional";
  weight: number;
  cross_repo?: boolean;
}

export interface RepoKnowledgeGraph {
  version: "2.0";
  kind: "codebase";
  repo_id: string;
  repo_meta: Record<string, unknown>;
  nodes: GraphNode[];
  edges: GraphEdge[];
  layers: unknown[];
  tour?: unknown[];
  freshness: Record<string, unknown>;
  scan_meta: Record<string, unknown>;
  known_unknowns_repo?: unknown[];
}

export interface CrossRepoGraph {
  version: "2.0";
  project: Record<string, unknown>;
  repos: Record<string, unknown>[];
  cross_edges?: GraphEdge[];
  capabilities?: unknown[];
  architecture_decisions?: unknown[];
  change_requests?: unknown[];
  traceability?: unknown[];
  quality_attributes?: unknown[];
  risks?: unknown[];
  technical_debt?: unknown[];
  known_unknowns?: unknown[];
}

