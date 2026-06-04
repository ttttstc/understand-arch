import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveCards, CARD_TYPES } from "../cards-deriver.mjs";
import { checkCards } from "../cards-check.mjs";
import { writeFixture } from "./cards-fixture.mjs";

function readCards(archDir) {
  return JSON.parse(readFileSync(join(archDir, "cards", "agent-cards.json"), "utf-8")).cards;
}

describe("cards-deriver", () => {
  it("派生 8 类卡并生成反向索引", () => {
    const { archDir } = writeFixture();
    const result = deriveCards({ archDir });
    const cards = readCards(archDir);
    const types = new Set(cards.map((card) => card.type));

    for (const type of CARD_TYPES) expect(types.has(type)).toBe(true);
    expect(result.cardCount).toBe(cards.length);
    const index = JSON.parse(readFileSync(join(archDir, "cards", "index.json"), "utf-8"));
    expect(index["src/auth.ts"].card_ids).toContain("card:component:auth");
    expect(index["rules/constraints/CON-001-auth.md"].constraint_ids).toContain("CON-001");
    expect(cards.every((card) => String(card.focused_summary || "").trim())).toBe(true);
    expect(cards.flatMap((card) => card.anchors.file_paths).some((filePath) => filePath.includes("::"))).toBe(false);
    const check = checkCards({ archDir });
    expect(check.ok).toBe(true);
    expect(check.findings.some((finding) => finding.code === "missing_summary")).toBe(false);
  });

  it("pin 的卡片不被覆盖", () => {
    const { archDir } = writeFixture();
    deriveCards({ archDir });
    const cardsPath = join(archDir, "cards", "agent-cards.json");
    const doc = JSON.parse(readFileSync(cardsPath, "utf-8"));
    const pinned = doc.cards.find((card) => card.id === "card:component:auth");
    pinned.focused_summary = "人工维护的摘要";
    pinned.anchors = { graph_node_ids: [], file_paths: ["manual.md"], line_ranges: [] };
    writeFileSync(cardsPath, `${JSON.stringify(doc, null, 2)}\n`, "utf-8");
    writeFileSync(join(archDir, "cards", "pinned.json"), JSON.stringify([pinned.id], null, 2), "utf-8");

    const layerPath = join(archDir, "specs", "arch-layer.json");
    const layer = JSON.parse(readFileSync(layerPath, "utf-8"));
    layer.component_profiles[0].name = "Changed Auth Module";
    writeFileSync(layerPath, `${JSON.stringify(layer, null, 2)}\n`, "utf-8");

    deriveCards({ archDir });
    const after = readCards(archDir).find((card) => card.id === pinned.id);
    expect(after.focused_summary).toBe("人工维护的摘要");
    expect(after.anchors.file_paths).toEqual(["manual.md"]);
  });
});
