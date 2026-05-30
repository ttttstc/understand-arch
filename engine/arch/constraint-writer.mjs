#!/usr/bin/env node
// constraint-writer.mjs — 把 arch-constraint-miner 的三产出确定性写入 rules/constraints/。
// 铁律:不做任何 LLM 推断,只做结构化读写 + 合并保护。
// 合并保护:已 confirmed/adjusted/rejected 的人工决策条目永不被覆盖。
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const projectRoot = resolve(process.argv[2] || ".");
const projectId = process.env.ARCH_PROJECT_ID || basename(projectRoot);
const archDir = process.env.ARCH_PROJECT_ROOT || join(projectRoot, ".understand-arch", projectId);
const interDir = join(archDir, "intermediate");
const conDir = join(archDir, "rules", "constraints");

const CATEGORY_FILE = {
  "system-charter": "system-charter.md",
  "domain-invariant": "domain-invariants.md",
  "dependency-rule": "dependency-rules.md",
  "api-contract": "api-contracts.md",
  "risk-register": "risk-register.md",
  "test-coverage-gap": "test-coverage-gaps.md",
  unknown: "domain-invariants.md",
};
const PROTECTED = new Set(["confirmed", "adjusted", "rejected"]);

function readJson(p, fallback) {
  try { return JSON.parse(readFileSync(p, "utf8")); } catch { return fallback; }
}
function ensureDir(p) { if (!existsSync(p)) mkdirSync(p, { recursive: true }); }

// 从已存在的 md 解析出 “已被人处理过的条目 id”(出现 `状态:confirmed/adjusted/rejected`)。
// 解析是宽松的:扫 `### CON-xxx` 标题 + 紧随的 `状态:` 行。
function protectedIds(mdPath) {
  if (!existsSync(mdPath)) return new Set();
  const text = readFileSync(mdPath, "utf8");
  const ids = new Set();
  const blocks = text.split(/\n(?=### )/);
  for (const b of blocks) {
    const idm = b.match(/###\s+(CON-\d+)/);
    if (!idm) continue;
    const stm = b.match(/状态[:：]\s*([a-z]+)/);
    if (stm && PROTECTED.has(stm[1])) ids.add(idm[1]);
  }
  return ids;
}

function renderConstraint(c) {
  const lines = [`### ${c.id}:${c.title || ""}`];
  if (c.constraint) lines.push(`- 约束:${c.constraint}`);
  if (c.basis) lines.push(`- 依据:${c.basis}`);
  lines.push(`- 证据等级:${c.evidence_level || "uncertain"}`);
  if (Array.isArray(c.evidence_refs) && c.evidence_refs.length) lines.push(`- 证据:${c.evidence_refs.join(", ")}`);
  lines.push(`- 违反检测:${c.violation_check || ""}`);
  lines.push(`- 状态:${c.status || "proposed"}`);
  lines.push(`- 来源:${c.source || "ai-mined"}`);
  if (c.consistency) {
    lines.push(`- 一致度:${c.consistency.match_rate}`);
    if (Array.isArray(c.consistency.exceptions) && c.consistency.exceptions.length) lines.push(`- 例外:${c.consistency.exceptions.join(", ")}`);
  }
  if (c.note) lines.push(`- 备注:${c.note}`);
  return lines.join("\n");
}

function renderFinding(f) {
  const lines = [`### ${f.id}:${f.title || ""}`];
  lines.push(`- 类型:${f.anomaly_type}`);
  lines.push(`- 位置:${(f.location || []).join(", ")}`);
  lines.push(`- 怀疑理由:${f.suspicion_reason || ""}`);
  if (f.guess) lines.push(`- 推测:${f.guess}`);
  lines.push(`- 可疑度:${f.suspicion_score}`);
  lines.push(`- 影响面:${f.impact}`);
  lines.push(`- 状态:${f.status || "pending-interview"}`);
  if (f.answered_by) lines.push(`- 解答:${f.answered_by}`);
  if (f.resolved_constraint_id) lines.push(`- 关联约束:${f.resolved_constraint_id}`);
  return lines.join("\n");
}

function writeCategoryFile(file, header, entries, isFinding) {
  const path = join(conDir, file);
  const keep = protectedIds(path); // 受保护的人工条目 id
  // 受保护条目:从旧文件原样保留
  let preserved = "";
  if (keep.size && existsSync(path)) {
    const old = readFileSync(path, "utf8");
    const blocks = old.split(/\n(?=### )/);
    preserved = blocks.filter((b) => { const m = b.match(/###\s+(CON-\d+|SF-\d+)/); return m && keep.has(m[1]); }).join("\n\n");
  }
  const fresh = entries
    .filter((e) => !keep.has(e.id)) // 不覆盖受保护 id
    .map(isFinding ? renderFinding : renderConstraint)
    .join("\n\n");
  const body = [header.trimEnd(), "", preserved, fresh].filter(Boolean).join("\n\n");
  writeFileSync(path, body.trimEnd() + "\n", "utf8");
  return { file, written: entries.length, preserved: keep.size };
}

function main() {
  ensureDir(conDir);
  ensureDir(join(conDir, "interview"));
  const out = readJson(join(interDir, "constraint-mine.json"), null)
    || { constraints: readJson(join(interDir, "constraints.json"), []).constraints || [], suspicious_findings: [], coding_conventions: [] };

  const constraints = out.constraints || [];
  const findings = out.suspicious_findings || [];
  const conventions = out.coding_conventions || [];

  const byCat = {};
  for (const c of constraints) {
    const file = CATEGORY_FILE[c.category] || CATEGORY_FILE.unknown;
    (byCat[file] ||= []).push(c);
  }

  const report = [];
  for (const [file, entries] of Object.entries(byCat)) {
    const title = file.replace(".md", "");
    report.push(writeCategoryFile(file, `# 约束:${title}\n\n> AI 考古产出(proposed)。人确认后状态升 confirmed。本文档默认中文。`, entries, false));
  }
  report.push(writeCategoryFile("suspicious-findings.md", `# 反常点清单(Suspicious Findings)\n\n> onboard 自动侦查。埋雷预警 + /arch-interview 访谈来源。按可疑度×影响面排序。`, findings, true));
  report.push(writeCategoryFile("coding-conventions.md", `# 编码风格约定(Coding Conventions)\n\n> 从代码统计的团队约定(proposed)。人确认后升级进规范层。`, conventions, false));

  process.stdout.write(JSON.stringify({ ok: true, dir: conDir, report }, null, 2) + "\n");
}

main();
