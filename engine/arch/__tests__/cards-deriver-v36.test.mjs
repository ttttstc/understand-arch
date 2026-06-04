import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveCards } from "../cards-deriver.mjs";
import { checkCards } from "../cards-check.mjs";
import { writeFixture } from "./cards-fixture.mjs";

function cardsByType(archDir, type) {
  const cards = JSON.parse(readFileSync(join(archDir, "cards", "agent-cards.json"), "utf-8")).cards;
  return cards.filter((card) => card.type === type);
}

describe("cards-deriver v3.6 technical cards", () => {
  it("派生 API / DB / Integration / ProjectContext 四类技术卡", () => {
    const { archDir } = writeFixture();
    deriveCards({ archDir });

    expect(cardsByType(archDir, "ApiContractCard")).toHaveLength(1);
    expect(cardsByType(archDir, "DbSchemaCard")).toHaveLength(1);
    expect(cardsByType(archDir, "IntegrationCard")).toHaveLength(1);
    expect(cardsByType(archDir, "ProjectContextCard")).toHaveLength(1);

    const apiCard = cardsByType(archDir, "ApiContractCard")[0];
    expect(apiCard.id).toBe("card:api-contract:sample::endpoint:login");
    expect(apiCard.anchors.graph_node_ids).toContain("sample::endpoint:login");

    const check = checkCards({ archDir });
    expect(check.ok).toBe(true);
  });
});
