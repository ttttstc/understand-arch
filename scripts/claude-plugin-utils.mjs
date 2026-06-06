import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const PLUGIN_ID = "understand-arch";
export const PLUGIN_KEY = `${PLUGIN_ID}@${PLUGIN_ID}`;
export const DEFAULT_GITHUB_REPO = "ttttstc/understand-arch";
export const DEFAULT_REF = "main";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, "..");
export const claudeHome = path.join(os.homedir(), ".claude");
export const pluginsRoot = path.join(claudeHome, "plugins");
export const marketplaceRoot = path.join(pluginsRoot, "marketplaces", PLUGIN_ID);
export const cacheRoot = path.join(pluginsRoot, "cache", PLUGIN_ID, PLUGIN_ID);
export const installedPluginsPath = path.join(pluginsRoot, "installed_plugins.json");
export const knownMarketplacesPath = path.join(pluginsRoot, "known_marketplaces.json");
export const settingsPath = path.join(claudeHome, "settings.json");

export function parseArgs(argv) {
  const options = {
    ref: DEFAULT_REF,
    strict: false,
    verbose: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token === "--ref") {
      options.ref = argv[index + 1];
      index += 1;
      continue;
    }
    if (token.startsWith("--ref=")) {
      options.ref = token.slice("--ref=".length);
      continue;
    }
    if (token === "--strict") {
      options.strict = true;
      continue;
    }
    if (token === "--verbose") {
      options.verbose = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      options.help = true;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (!options.ref) {
    throw new Error("Missing value for --ref");
  }

  return options;
}

export function printInstallUsage() {
  console.log("Usage: node scripts/install-claude-plugin.mjs [--ref <git-ref>] [--verbose]");
  console.log("");
  console.log("Default ref: main");
  console.log("Examples:");
  console.log("  node scripts/install-claude-plugin.mjs");
  console.log("  node scripts/install-claude-plugin.mjs --ref v3.7.0-rc2");
  console.log("  node scripts/install-claude-plugin.mjs --ref HEAD");
}

export function printDoctorUsage() {
  console.log("Usage: node scripts/doctor-plugin-install.mjs [--strict] [--verbose]");
}

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readJson(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) {
    return fallback;
  }
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

export function writeJson(filePath, value) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

export function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    stdio: options.capture === false ? "inherit" : ["ignore", "pipe", "pipe"],
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    const stderr = result.stderr?.trim();
    const stdout = result.stdout?.trim();
    const details = [stdout, stderr].filter(Boolean).join("\n");
    throw new Error(`${command} ${args.join(" ")} failed with exit code ${result.status}${details ? `\n${details}` : ""}`);
  }
  return result.stdout?.trim() ?? "";
}

export function tryRun(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error || result.status !== 0) {
    return null;
  }
  return result.stdout?.trim() ?? "";
}

export function resolveGitRef(ref) {
  const candidates = [
    ref,
    `origin/${ref}`,
    `refs/tags/${ref}`,
    `refs/remotes/origin/${ref}`,
  ];
  for (const candidate of candidates) {
    const resolved = tryRun("git", ["rev-parse", "--verify", `${candidate}^{commit}`]);
    if (resolved) {
      return resolved;
    }
  }
  throw new Error(`Unable to resolve git ref '${ref}'. Try fetching origin or use an explicit tag/sha.`);
}

export function getOriginRepo() {
  const remoteUrl = tryRun("git", ["remote", "get-url", "origin"]) ?? "";
  const sshMatch = remoteUrl.match(/github\.com[:/](.+?)(?:\.git)?$/i);
  if (sshMatch?.[1]) {
    return sshMatch[1];
  }
  return DEFAULT_GITHUB_REPO;
}

export function copySnapshot(sourceDir, destinationDir) {
  fs.rmSync(destinationDir, { recursive: true, force: true });
  ensureDir(path.dirname(destinationDir));
  fs.cpSync(sourceDir, destinationDir, {
    recursive: true,
    filter: (source) => {
      const baseName = path.basename(source);
      return baseName !== ".git" && baseName !== "node_modules" && baseName !== ".claude";
    },
  });
}

export function getInstalledPluginsDocument() {
  return readJson(installedPluginsPath, { version: 2, plugins: {} });
}

export function getKnownMarketplacesDocument() {
  return readJson(knownMarketplacesPath, {});
}

export function getSettingsDocument() {
  return readJson(settingsPath, { enabledPlugins: {} });
}

export function formatStatus(label, state, detail) {
  return `[${state}] ${label}${detail ? `: ${detail}` : ""}`;
}
