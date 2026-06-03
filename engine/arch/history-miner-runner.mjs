#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function readJson(path, fallback = undefined) {
  if (!existsSync(path)) return fallback;
  return JSON.parse(readFileSync(path, "utf-8"));
}

function writeJson(path, value) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf-8");
}

function inferArchDir(options = {}) {
  if (options.archDir) return resolve(options.archDir);
  if (process.env.ARCH_PROJECT_ROOT) return resolve(process.env.ARCH_PROJECT_ROOT);
  const projectRoot = resolve(options.projectRoot || process.cwd());
  const projectId = options.projectId || process.env.ARCH_PROJECT_ID || basename(projectRoot);
  return join(projectRoot, ".understand-arch", projectId);
}

function normalizePath(value) {
  return String(value || "").replace(/\\/g, "/").replace(/^\.\//, "");
}

function parseGitLog(text) {
  const commits = [];
  let current = null;
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("\u001e")) {
      if (current) commits.push(current);
      const [, hash, timestamp, subject] = line.split("\u001f");
      current = { hash, timestamp, subject, files: [] };
    } else if (current && line.trim()) {
      const parts = line.split(/\t/);
      const file = normalizePath(parts[2] || parts[0]);
      if (file && !file.includes(".understand-arch/")) current.files.push(file);
    }
  }
  if (current) commits.push(current);
  return commits;
}

function readHistory(repoRoot, weeks = 26) {
  try {
    const since = `${weeks} weeks ago`;
    const output = execFileSync("git", ["log", `--since=${since}`, "--numstat", "--format=\u001e%H\u001f%ct\u001f%s"], {
      cwd: repoRoot,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return parseGitLog(output);
  } catch {
    return [];
  }
}

function temporalCouplings(commits) {
  const pairs = new Map();
  for (const commit of commits) {
    const files = [...new Set(commit.files)].sort();
    for (let i = 0; i < files.length; i += 1) {
      for (let j = i + 1; j < files.length; j += 1) {
        const key = `${files[i]}\u0000${files[j]}`;
        const entry = pairs.get(key) || { files: [files[i], files[j]], commits: [] };
        entry.commits.push(commit.hash);
        pairs.set(key, entry);
      }
    }
  }
  return [...pairs.values()]
    .filter((entry) => entry.commits.length >= 2)
    .sort((a, b) => b.commits.length - a.commits.length)
    .slice(0, 20);
}

function hotspots(commits) {
  const counts = new Map();
  for (const commit of commits) {
    for (const file of new Set(commit.files)) counts.set(file, (counts.get(file) || 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([file, change_count]) => ({ file, change_count }));
}

function revertPatterns(commits) {
  return commits
    .filter((commit) => /\b(revert|rollback|hotfix|紧急|回滚)\b/i.test(commit.subject || ""))
    .map((commit) => ({ hash: commit.hash, subject: commit.subject, files: commit.files }))
    .slice(0, 20);
}

export function collectHistorySignals(options = {}) {
  const archDir = inferArchDir(options);
  const reposDoc = readJson(join(archDir, "specs", "repos.json"), { repos: [] });
  const repos = (Array.isArray(reposDoc) ? reposDoc : reposDoc.repos || []).map((repo) => ({
    repo_id: repo.repo_id || repo.id || repo.name,
    path: resolve(String(repo.path || "."))
  }));
  const repoSignals = [];
  for (const repo of repos) {
    const commits = options.fixtureCommitsByRepo?.[repo.repo_id] || readHistory(repo.path, options.weeks || 26);
    repoSignals.push({
      repo_id: repo.repo_id,
      commit_count: commits.length,
      temporal_couplings: temporalCouplings(commits),
      hotspots: hotspots(commits),
      revert_patterns: revertPatterns(commits),
    });
  }
  const doc = { version: "3.4", generated_at: new Date().toISOString(), repos: repoSignals };
  writeJson(join(archDir, "intermediate", "history-miner-input.json"), doc);
  return { archDir, inputPath: join(archDir, "intermediate", "history-miner-input.json"), repos: repoSignals };
}

export function mergeHistoryMining(options = {}) {
  const archDir = inferArchDir(options);
  const input = readJson(options.inputPath || join(archDir, "intermediate", "history-miner-input.json"), { repos: [] });
  const output = readJson(options.outputPath || join(archDir, "intermediate", "history-miner-output.json"), null);
  const generated = output || deterministicHistoryOutput(input);
  const existing = readJson(join(archDir, "intermediate", "constraint-mine.json"), {});
  const merged = {
    constraints: dedupeById([...(existing.constraints || []), ...(generated.constraints || [])]),
    suspicious_findings: dedupeById([...(existing.suspicious_findings || []), ...(generated.suspicious_findings || [])]),
    coding_conventions: existing.coding_conventions || [],
  };
  writeJson(join(archDir, "intermediate", "constraint-mine.json"), merged);
  if (options.writeConstraints !== false) {
    execFileSync(process.execPath, [join(dirname(fileURLToPath(import.meta.url)), "constraint-writer.mjs"), options.projectRoot || process.cwd()], {
      env: { ...process.env, ARCH_PROJECT_ROOT: archDir },
      stdio: ["ignore", "pipe", "pipe"],
    });
  }
  return {
    archDir,
    temporal_coupling_count: input.repos.reduce((sum, repo) => sum + (repo.temporal_couplings || []).length, 0),
    hotspot_count: input.repos.reduce((sum, repo) => sum + (repo.hotspots || []).length, 0),
    constraintMinePath: join(archDir, "intermediate", "constraint-mine.json"),
  };
}

function deterministicHistoryOutput(input) {
  const constraints = [];
  const suspicious_findings = [];
  let con = 800;
  let sf = 800;
  for (const repo of input.repos || []) {
    for (const coupling of repo.temporal_couplings || []) {
      constraints.push({
        id: `CON-${con++}`,
        title: "历史同改耦合",
        category: "dependency-rule",
        constraint: `${coupling.files.join(" 与 ")} 在历史中多次同改,修改时需要同步评估。`,
        basis: `${repo.repo_id} commits:${coupling.commits.slice(0, 3).join(",")}`,
        evidence_level: "observed",
        evidence_refs: coupling.files,
        violation_check: "评审时检查同改文件是否被同步考虑",
        status: "proposed",
        source: "ai-mined",
        note: "由 git history temporal coupling 信号生成",
      });
    }
    for (const hotspot of repo.hotspots || []) {
      suspicious_findings.push({
        id: `SF-${sf++}`,
        title: "历史高频变更热点",
        anomaly_type: "hotspot",
        location: [hotspot.file],
        suspicion_reason: `${hotspot.file} 在统计窗口内变更 ${hotspot.change_count} 次,可能承载过多变化压力。`,
        suspicion_score: Math.min(1, hotspot.change_count / 10),
        impact: "medium",
        status: "pending-interview",
      });
    }
    for (const revert of repo.revert_patterns || []) {
      constraints.push({
        id: `CON-${con++}`,
        title: "历史回滚敏感区",
        category: "risk-register",
        constraint: `${revert.files.slice(0, 3).join(", ")} 曾出现在回滚或紧急修复提交中,修改需额外复核。`,
        basis: `${repo.repo_id} commit:${revert.hash} ${revert.subject}`,
        evidence_level: "observed",
        evidence_refs: revert.files,
        violation_check: "评审时确认风险缓解和回滚预案",
        status: "proposed",
        source: "ai-mined",
        note: "由 git history revert pattern 信号生成",
      });
    }
  }
  return { constraints, suspicious_findings };
}

function dedupeById(items) {
  const byId = new Map();
  for (const item of items) byId.set(item.id, item);
  return [...byId.values()];
}

export function runHistoryMiner(options = {}) {
  const collected = collectHistorySignals(options);
  const merged = mergeHistoryMining({ ...options, archDir: collected.archDir, inputPath: collected.inputPath });
  return { ...collected, ...merged };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [command = "run", ...rest] = process.argv.slice(2);
  const args = Object.fromEntries(rest.map((arg) => {
    const [key, ...value] = arg.replace(/^--/, "").split("=");
    return [key, value.length ? value.join("=") : true];
  }));
  const options = {
    archDir: args["arch-dir"],
    projectRoot: args.workspace,
    projectId: args.project,
    weeks: args.weeks ? Number(args.weeks) : undefined,
    outputPath: args.output,
    writeConstraints: args["no-write"] ? false : true,
  };
  const result = command === "collect"
    ? collectHistorySignals(options)
    : command === "merge"
      ? mergeHistoryMining(options)
      : runHistoryMiner(options);
  console.log(JSON.stringify({
    archDir: result.archDir,
    inputPath: result.inputPath,
    constraintMinePath: result.constraintMinePath,
    temporal_coupling_count: result.temporal_coupling_count,
    hotspot_count: result.hotspot_count,
  }, null, 2));
}
