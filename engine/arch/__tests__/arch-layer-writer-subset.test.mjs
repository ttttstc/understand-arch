import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { tempDir } from "./cards-fixture.mjs";

describe("arch-layer-writer subset_mode", () => {
  it("只按 subset 节点替换对应条目,其他条目保留", () => {
    const root = tempDir("writer-subset");
    const archDir = join(root, ".understand-arch", "sample");
    mkdirSync(join(archDir, "specs"), { recursive: true });
    const layerPath = join(archDir, "specs", "arch-layer.json");
    const patchPath = join(root, "patch.json");
    writeFileSync(layerPath, `${JSON.stringify(validLayer(), null, 2)}\n`, "utf-8");
    writeFileSync(patchPath, `${JSON.stringify({
      subset_mode: true,
      subset_arch_node_ids: ["sample::module:auth"],
      patch: {
        component_profiles: [
          component("component:auth", "Auth v2", "sample::module:auth"),
          component("component:billing", "Billing v2", "sample::module:billing")
        ],
        capabilities: [
          capability("cap:auth", "认证 v2", "sample::module:auth"),
          capability("cap:billing", "计费 v2", "sample::module:billing")
        ]
      }
    }, null, 2)}\n`, "utf-8");

    execFileSync("node", ["engine/arch/arch-layer-writer.mjs", "merge", root, layerPath, patchPath], {
      cwd: process.cwd(),
      env: { ...process.env, ARCH_PROJECT_ROOT: archDir },
      encoding: "utf-8",
    });

    const layer = JSON.parse(readFileSync(layerPath, "utf-8"));
    expect(layer.component_profiles.find((item) => item.id === "component:auth").name).toBe("Auth v2");
    expect(layer.component_profiles.find((item) => item.id === "component:billing").name).toBe("Billing");
    expect(layer.capabilities.find((item) => item.id === "cap:auth").name).toBe("认证 v2");
    expect(layer.capabilities.find((item) => item.id === "cap:billing").name).toBe("计费");
  });
});

function validLayer() {
  return {
    version: "3.0",
    project: { name: "sample", description: "", analyzed_at: "now", repos: [{ repo_id: "sample", name: "sample", path: ".", graph_path: "graph.json" }] },
    architecture_style: { primary: "unknown", secondary: [], rationale: "unknown", tradeoffs: [], confidence: "low", evidence_refs: ["sample::module:auth"] },
    component_profiles: [
      component("component:auth", "Auth", "sample::module:auth"),
      component("component:billing", "Billing", "sample::module:billing")
    ],
    tech_stack: [],
    flows: [],
    complexity_hotspots: [],
    extension_constraints: [],
    external_dependencies: [],
    boundaries: [],
    cross_edges: [],
    capabilities: [
      capability("cap:auth", "认证", "sample::module:auth"),
      capability("cap:billing", "计费", "sample::module:billing")
    ],
    quality_attributes: [],
    risks: [],
    technical_debt: [],
    architecture_decisions: [],
    change_requests: [],
    traceability: [],
    known_unknowns: [],
    freshness: { generated_at: "now", repos: [] }
  };
}

function component(id, name, nodeId) {
  return {
    id,
    name,
    role: "domain",
    responsibilities: ["职责"],
    collaborators: [],
    complexity: "medium",
    change_risk: "medium",
    narrative: "叙事",
    node_ids: [nodeId],
    confidence: "high",
    evidence_refs: [nodeId],
  };
}

function capability(id, name, nodeId) {
  return {
    id,
    name,
    description: "能力",
    maturity: "stable",
    importance: "high",
    supporting_node_ids: [nodeId],
    gaps: [],
    confidence: "high",
    evidence_refs: [nodeId],
  };
}
