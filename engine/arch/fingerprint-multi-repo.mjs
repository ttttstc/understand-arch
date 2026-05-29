#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";

const projectRoot = resolve(process.argv[2] || ".");
const projectId = process.env.ARCH_PROJECT_ID || basename(projectRoot);
const archDir = process.env.ARCH_PROJECT_ROOT || join(projectRoot, ".understand-arch", projectId);
const reposPath = process.argv[3] ? resolve(process.argv[3]) : join(archDir, "specs", "repos.json");
const outPath = process.argv[4] ? resolve(process.argv[4]) : join(archDir, "specs", "freshness.json");

const reposDoc = existsSync(reposPath) ? JSON.parse(readFileSync(reposPath, "utf-8")) : { repos: [] };
const repos = Array.isArray(reposDoc) ? reposDoc : reposDoc.repos || [];
const freshness = {
  generated_at: new Date().toISOString(),
  repos: repos.map((repo) => {
    const repoId = repo.repo_id || repo.id || repo.name;
    const fingerprintPath = repo.fingerprint_path || join(archDir, "specs", "repos", repoId, ".fingerprint.json");
    return {
      repo_id: repoId,
      fingerprint_path: fingerprintPath,
      exists: existsSync(resolve(projectRoot, fingerprintPath)),
    };
  }),
};

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(freshness, null, 2)}\n`, "utf-8");
console.log(outPath);
