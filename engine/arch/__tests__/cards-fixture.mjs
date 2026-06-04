import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export function tempDir(name) {
  const dir = join(tmpdir(), `understand-arch-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function writeFixture() {
  const root = tempDir("cards");
  const repoRoot = join(root, "repo");
  const archDir = join(root, ".understand-arch", "sample");
  mkdirSync(join(repoRoot, "src"), { recursive: true });
  mkdirSync(join(archDir, "specs", "repos", "sample"), { recursive: true });
  mkdirSync(join(archDir, "rules", "constraints"), { recursive: true });
  mkdirSync(join(archDir, "decisions"), { recursive: true });

  writeFileSync(join(repoRoot, "src", "auth.ts"), "export function login() { return true; }\n", "utf-8");
  writeFileSync(join(repoRoot, "src", "user.ts"), "export interface User { id: string }\n", "utf-8");
  writeFileSync(join(repoRoot, "src", "api.ts"), "export const route = '/login';\n", "utf-8");
  writeFileSync(join(repoRoot, "src", "schema.sql"), "CREATE TABLE users (id uuid primary key, email text not null);\n", "utf-8");

  writeFileSync(join(archDir, "specs", "repos.json"), JSON.stringify({
    repos: [{
      repo_id: "sample",
      name: "sample",
      path: repoRoot,
      graph_path: join(archDir, "specs", "repos", "sample", "knowledge-graph.json")
    }]
  }, null, 2), "utf-8");

  writeFileSync(join(archDir, "specs", "repos", "sample", "knowledge-graph.json"), JSON.stringify({
    version: "3.0",
    nodes: [
      { id: "sample::module:auth", type: "module", name: "Auth Module", filePath: "src/auth.ts", summary: "认证模块", tags: ["auth"] },
      {
        id: "sample::endpoint:login",
        type: "endpoint",
        name: "POST /login",
        filePath: "src/api.ts",
        summary: "登录入口",
        tags: ["auth", "api"],
        attributes: {
          protocol: "http",
          http_method: "POST",
          path: "/login",
          request_params: [{ name: "email", in: "body", type: "string", required: true }],
          responses: { "200": { type: "LoginResult" } },
          auth_required: false
        }
      },
      {
        id: "sample::table:users",
        type: "table",
        name: "users",
        filePath: "src/schema.sql",
        summary: "用户表",
        tags: ["user"],
        attributes: {
          columns: [{ name: "id", type: "uuid", nullable: false }, { name: "email", type: "text", nullable: false }],
          primary_key: ["id"],
          indexes: [{ name: "idx_users_email", columns: ["email"], unique: true }],
          foreign_keys: []
        }
      },
      {
        id: "sample::resource:stripe",
        type: "resource",
        name: "stripe",
        filePath: "src/api.ts",
        summary: "支付服务",
        tags: ["payment"],
        attributes: {
          service_id: "stripe",
          service_kind: "payment",
          config_keys: ["STRIPE_API_KEY"],
          sdk_imports: ["stripe"],
          endpoints: ["https://api.stripe.com"]
        }
      },
      { id: "sample::data-model:user", type: "data-model", name: "User", filePath: "src/user.ts", summary: "用户实体", tags: ["user"] }
    ],
    edges: [
      { source: "sample::endpoint:login", target: "sample::module:auth", type: "calls" },
      { source: "sample::module:auth", target: "sample::data-model:user", type: "uses" }
    ],
    layers: []
  }, null, 2), "utf-8");

  writeFileSync(join(archDir, "specs", "arch-layer.json"), JSON.stringify({
    version: "3.0",
    project: {
      name: "sample",
      description: "测试项目",
      analyzed_at: "2026-06-03T00:00:00.000Z",
      repos: [{
        repo_id: "sample",
        name: "sample",
        path: repoRoot,
        graph_path: join(archDir, "specs", "repos", "sample", "knowledge-graph.json")
      }]
    },
    architecture_style: {
      primary: "modular-monolith",
      secondary: [],
      rationale: "模块边界清晰",
      tradeoffs: [],
      confidence: "medium",
      evidence_refs: ["sample::module:auth"]
    },
    component_profiles: [{
      id: "component:auth",
      name: "Auth Module",
      role: "domain",
      responsibilities: ["登录认证"],
      collaborators: ["sample::endpoint:login"],
      complexity: "medium",
      change_risk: "medium",
      narrative: "登录认证集中在 Auth Module。",
      node_ids: ["sample::module:auth"],
      confidence: "high",
      evidence_refs: ["sample::module:auth"]
    }],
    tech_stack: [],
    flows: [{
      id: "flow:login",
      name: "登录流程",
      trigger: "用户提交登录",
      steps: [{ order: 1, description: "入口调用认证模块", node_ids: ["sample::endpoint:login", "sample::module:auth"] }],
      outcome: "返回登录结果",
      node_ids: ["sample::endpoint:login", "sample::module:auth"],
      confidence: "high",
      evidence_refs: ["sample::endpoint:login", "sample::module:auth"]
    }],
    complexity_hotspots: [],
    extension_constraints: [],
    external_dependencies: [],
    boundaries: [],
    cross_edges: [],
    capabilities: [{
      id: "cap:auth",
      name: "用户认证",
      description: "支持登录能力",
      maturity: "stable",
      importance: "critical",
      supporting_node_ids: ["sample::module:auth"],
      gaps: [],
      confidence: "high",
      evidence_refs: ["sample::module:auth"]
    }],
    quality_attributes: [],
    risks: [{
      id: "risk:auth-central",
      title: "认证模块集中风险",
      category: "architecture",
      severity: "medium",
      likelihood: "medium",
      node_ids: ["sample::module:auth"],
      mitigation: "保持接口契约稳定",
      confidence: "medium",
      evidence_refs: ["sample::module:auth"]
    }],
    technical_debt: [],
    architecture_decisions: [{
      id: "ADR-001",
      title: "采用模块化单体",
      path: "decisions/ADR-001-modular.md",
      status: "accepted",
      node_ids: ["sample::module:auth"]
    }],
    change_requests: [],
    traceability: [],
    known_unknowns: [],
    freshness: { generated_at: "2026-06-03T00:00:00.000Z", repos: [] }
  }, null, 2), "utf-8");

  writeFileSync(join(archDir, "rules", "constraints", "CON-001-auth.md"), [
    "# CON-001 认证边界保持稳定",
    "状态: confirmed",
    "约束: 登录入口必须通过 Auth Module。",
    "依据: sample::module:auth"
  ].join("\n"), "utf-8");
  writeFileSync(join(archDir, "decisions", "ADR-001-modular.md"), [
    "# ADR-001 采用模块化单体",
    "状态: accepted",
    "背景: 小型系统优先保持部署简单。",
    "决策: 采用模块化单体。"
  ].join("\n"), "utf-8");

  return { root, repoRoot, archDir };
}
