#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { inferArchDir } from "./project-paths.mjs";

function readJson(path, fallback = undefined) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function mergeCardSummaries(options = {}) {
  const archDir = inferArchDir(options);
  const cardsPath = options.cardsPath || join(archDir, "cards", "agent-cards.json");
  const summariesPath = options.summariesPath || join(archDir, "intermediate", "card-summaries.json");
  const cardsDoc = readJson(cardsPath, { version: "3.4", cards: [] });
  const summaryDoc = readJson(summariesPath, { summaries: [] });
  const summaries = new Map((summaryDoc.summaries || []).map((item) => [item.card_id, String(item.focused_summary || "").trim()]));
  let updated = 0;

  for (const card of cardsDoc.cards || []) {
    if (!summaries.has(card.id)) continue;
    const summary = summaries.get(card.id);
    if (!summary) throw new Error(`summary for ${card.id} is empty`);
    if ([...summary].length > 200) throw new Error(`summary for ${card.id} exceeds 200 characters`);
    card.focused_summary = summary;
    updated += 1;
  }

  mkdirSync(dirname(cardsPath), { recursive: true });
  writeFileSync(cardsPath, `${JSON.stringify(cardsDoc, null, 2)}\n`, "utf-8");
  return { cardsPath, summariesPath, updated };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.length ? rest.join("=") : true];
  }));
  const result = mergeCardSummaries({
    archDir: args["arch-dir"],
    projectRoot: args.workspace,
    projectId: args.project,
    summariesPath: args.summaries,
  });
  console.log(JSON.stringify(result, null, 2));
}
