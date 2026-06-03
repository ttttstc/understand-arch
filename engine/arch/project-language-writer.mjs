#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return {};
  }
}

export function table(headers, rows, pick) {
  const sep = `|${headers.map(() => "---").join("|")}|`;
  const head = `|${headers.join("|")}|`;
  const body = rows.length
    ? rows.map((row) => `|${pick(row).map((value) => String(value || "").replace(/\|/g, "\\|")).join("|")}|`).join("\n")
    : `|${headers.map(() => "未识别").join("|")}|`;
  return [head, sep, body].join("\n");
}

export function renderProjectLanguage(data) {
  const domainTerms = Array.isArray(data.domain_terms) ? data.domain_terms : [];
  const roles = Array.isArray(data.roles) ? data.roles : [];
  const statesEvents = Array.isArray(data.states_events) ? data.states_events : [];
  const components = Array.isArray(data.components) ? data.components : [];
  const forbiddenMixups = Array.isArray(data.forbidden_mixups) ? data.forbidden_mixups : [];

  const md = `# Project Language

> 本文件是项目语言表,用于统一 wiki、CR、diagram 和 review 的表达。AI 可生成初稿,人确认后作为团队共同语言使用。

## 领域词
${table(["术语", "含义", "推荐用法", "禁用/避免", "证据"], domainTerms, (row) => [
  row.term,
  row.meaning,
  row.recommended_usage,
  row.avoid,
  Array.isArray(row.evidence_refs) ? row.evidence_refs.join(", ") : row.evidence_refs,
])}

## 用户与角色
${table(["角色", "含义", "来源"], roles, (row) => [row.role, row.meaning, row.source])}

## 状态与事件
${table(["状态/事件", "含义", "所属流程", "来源"], statesEvents, (row) => [row.name, row.meaning, row.flow, row.source])}

## 组件命名
${table(["组件", "推荐中文名", "代码标识符", "说明"], components, (row) => [
  row.component,
  row.recommended_chinese_name,
  row.code_identifier,
  row.description,
])}

## 禁止混用
${table(["不推荐", "推荐", "原因"], forbiddenMixups, (row) => [row.avoid, row.recommended, row.reason])}
`;

  return {
    markdown: md.trimEnd() + "\n",
    counts: {
      domain_terms: domainTerms.length,
      roles: roles.length,
      states_events: statesEvents.length,
      components: components.length,
      forbidden_mixups: forbiddenMixups.length,
    },
  };
}

function main() {
  const projectRoot = resolve(process.argv[2] || ".");
  const projectId = process.env.ARCH_PROJECT_ID || basename(projectRoot);
  const archDir = process.env.ARCH_PROJECT_ROOT || join(projectRoot, ".understand-arch", projectId);
  const interDir = join(archDir, "intermediate");
  const rulesDir = join(archDir, "rules");
  const outputPath = join(rulesDir, "project-language.md");
  const inputPath = join(interDir, "project-language.json");

  if (!existsSync(rulesDir)) mkdirSync(rulesDir, { recursive: true });
  const data = readJson(inputPath);
  const rendered = renderProjectLanguage(data);

  writeFileSync(outputPath, rendered.markdown, "utf-8");
  process.stdout.write(JSON.stringify({
    ok: true,
    file: outputPath,
    counts: rendered.counts,
  }, null, 2) + "\n");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
