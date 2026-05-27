"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const DEFAULT_IGNORES = new Set([".git", "node_modules", ".understand-arch", "dist", "build", ".next", "coverage"]);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) {
      args._.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i += 1;
    }
  }
  return args;
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function walkFiles(rootDir, options = {}) {
  const maxBytes = options.maxBytes ?? 1024 * 1024;
  const files = [];
  const visit = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (DEFAULT_IGNORES.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(full);
      } else if (entry.isFile()) {
        const stat = fs.statSync(full);
        if (stat.size <= maxBytes) files.push(full);
      }
    }
  };
  visit(rootDir);
  return files;
}

function detectLanguage(file) {
  const ext = path.extname(file).toLowerCase();
  const map = {
    ".ts": "typescript",
    ".tsx": "typescript",
    ".js": "javascript",
    ".jsx": "javascript",
    ".py": "python",
    ".go": "go",
    ".rs": "rust",
    ".java": "java",
    ".md": "markdown",
    ".json": "json",
    ".yaml": "yaml",
    ".yml": "yaml"
  };
  return map[ext] ?? "unknown";
}

function readReposYaml(file) {
  const text = fs.readFileSync(file, "utf8");
  const repos = [];
  let current = null;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const idMatch = line.match(/^\s*-\s+id:\s*(.+)$/);
    if (idMatch) {
      current = { id: idMatch[1].trim().replace(/^["']|["']$/g, "") };
      repos.push(current);
      continue;
    }
    const fieldMatch = line.match(/^\s+([a-z_]+):\s*(.*)$/);
    if (current && fieldMatch) {
      current[fieldMatch[1]] = fieldMatch[2].trim().replace(/^["']|["']$/g, "");
    }
  }
  const versionMatch = text.match(/^version:\s*["']?([^"'\r\n]+)["']?/m);
  return { version: versionMatch?.[1] ?? "1.0", repos };
}

module.exports = {
  detectLanguage,
  parseArgs,
  readJson,
  readReposYaml,
  sha256,
  walkFiles,
  writeJson
};

