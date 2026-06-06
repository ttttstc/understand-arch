#!/usr/bin/env node
// constraint-check.mjs — v3.1 约束层验收(确定性,无 LLM)。
// 校验 rules/constraints/ 下条目结构、证据回链、状态合法、ai-mined 不得 confirmed。
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { inferArchDir, resolveWorkspaceRoot } from "./project-paths.mjs";

const projectRoot = resolveWorkspaceRoot(process.argv[2] || ".");
const projectId = process.env.ARCH_PROJECT_ID || basename(projectRoot);
const archDir = inferArchDir({ projectRoot, projectId });
const conDir = join(archDir, "rules", "constraints");

const VALID_LEVEL = new Set(["confirmed", "observed", "inferred", "uncertain", "conflicted"]);
const VALID_STATUS = new Set(["proposed", "confirmed", "rejected", "adjusted"]);
const VALID_SOURCE = new Set(["ai-mined", "interview", "human", "cr-derived"]);
const INTERNAL_ID = /^(risk|qa|debt|cap):/;

const findings = [];
function fail(id, msg) { findings.push({ id, severity: "high", msg }); }
function warn(id, msg) { findings.push({ id, severity: "low", msg }); }

function field(block, name) {
  const m = block.match(new RegExp(`${name}[:：]\\s*(.+)`));
  return m ? m[1].trim() : null;
}

function checkConstraintFile(file) {
  const text = readFileSync(join(conDir, file), "utf8");
  for (const block of text.split(/\n(?=### )/)) {
    const idm = block.match(/###\s+(CON-\d+)/);
    if (!idm) continue;
    const id = idm[1];
    const level = field(block, "证据等级");
    const status = field(block, "状态");
    const source = field(block, "来源");
    const evidence = field(block, "证据");
    const check = field(block, "违反检测");
    if (!level || !VALID_LEVEL.has(level)) fail(id, `证据等级非法或缺失: ${level}`);
    if (!status || !VALID_STATUS.has(status)) fail(id, `状态非法或缺失: ${status}`);
    if (!source || !VALID_SOURCE.has(source)) fail(id, `来源非法或缺失: ${source}`);
    if ((source === "ai-mined" || source === "cr-derived") && level === "confirmed") fail(id, `${source} 不得自标 confirmed`);
    if ((source === "ai-mined" || source === "cr-derived") && status === "confirmed") fail(id, `${source} 状态只能保持 proposed,等待人工确认后改写来源`);
    if (evidence && INTERNAL_ID.test(evidence)) fail(id, `证据为内部 id(${evidence}),必须回链代码`);
    if (status === "confirmed" && (!check || check === "")) warn(id, "confirmed 约束缺违反检测命令");
    if (file !== "coding-conventions.md" && !evidence && level !== "uncertain") warn(id, "缺证据回链");
  }
}

function checkFindings() {
  const path = join(conDir, "suspicious-findings.md");
  if (!existsSync(path)) { warn("SF", "无 suspicious-findings.md(onboard 未产侦查结果)"); return; }
  const text = readFileSync(path, "utf8");
  let count = 0;
  for (const block of text.split(/\n(?=### )/)) {
    const idm = block.match(/###\s+(SF-\d+)/);
    if (!idm) continue;
    count++;
    const id = idm[1];
    if (!field(block, "可疑度")) warn(id, "缺可疑度评分");
    if (!field(block, "位置")) fail(id, "缺位置");
    if (!field(block, "怀疑理由")) fail(id, "缺怀疑理由");
  }
  if (count === 0) warn("SF", "suspicious-findings.md 为空");
}

function main() {
  if (!existsSync(conDir)) {
    process.stdout.write(JSON.stringify({ ok: true, skipped: true, reason: "无 rules/constraints/(尚未跑约束考古)" }, null, 2) + "\n");
    return;
  }
  for (const f of readdirSync(conDir).filter((f) => f.endsWith(".md") && f !== "suspicious-findings.md")) {
    checkConstraintFile(f);
  }
  checkFindings();
  const high = findings.filter((f) => f.severity === "high");
  process.stdout.write(JSON.stringify({
    ok: high.length === 0,
    verdict: high.length === 0 ? "pass" : "fail",
    high_count: high.length,
    findings,
  }, null, 2) + "\n");
  if (high.length) process.exitCode = 1;
}

main();
