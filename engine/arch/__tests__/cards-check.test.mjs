import { rmSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveCards } from "../cards-deriver.mjs";
import { checkCards } from "../cards-check.mjs";
import { writeFixture } from "./cards-fixture.mjs";

describe("cards-check", () => {
  it("断开的文件 anchor 会被准确报错", () => {
    const { archDir, repoRoot } = writeFixture();
    deriveCards({ archDir });

    rmSync(join(repoRoot, "src", "auth.ts"));
    const result = checkCards({ archDir });

    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.code === "broken_file_anchor" && finding.anchor === "src/auth.ts")).toBe(true);
  });

  it("源材料变化会标记 stale source_hash", () => {
    const { archDir } = writeFixture();
    deriveCards({ archDir });
    const layerPath = join(archDir, "specs", "arch-layer.json");
    const layer = JSON.parse(readFileSync(layerPath, "utf-8"));
    layer.capabilities[0].description = "支持登录和会话续期";
    writeFileSync(layerPath, `${JSON.stringify(layer, null, 2)}\n`, "utf-8");

    const result = checkCards({ archDir });

    expect(result.ok).toBe(true);
    expect(result.stale_card_ids).toContain("card:capability:auth");
    expect(result.findings.some((finding) => finding.code === "stale_source_hash")).toBe(true);
  });
});
