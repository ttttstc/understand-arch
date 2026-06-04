#!/usr/bin/env node
import { execFileSync, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { basename, delimiter, dirname, join, relative, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..", "..");

export const FORMATS = ["mermaid", "svg", "png", "plantuml"];
export const FIREWORKS_TYPES = [
  "architecture",
  "data-flow",
  "flowchart",
  "sequence",
  "comparison",
  "timeline",
  "mind-map",
  "agent",
  "memory",
  "use-case",
  "class",
  "state-machine",
  "er-diagram",
  "network-topology",
];
export const V31_TYPES = ["context", "container", "component", "flow", "risk", "c4"];
export const ALL_TYPES = [...V31_TYPES, ...FIREWORKS_TYPES];

export const PROFILES = {
  web: { type: "architecture", style: 6 },
  middleware: { type: "architecture", style: 2 },
  pipeline: { type: "data-flow", style: 3 },
  agent: { type: "agent", style: 5 },
  "multi-repo": { type: "architecture", style: 1 },
};

export const TYPE_MAP = {
  context: "architecture",
  container: "architecture",
  component: "class",
  flow: "data-flow",
  risk: "architecture",
  c4: "architecture",
};

function parseArgs(argv) {
  const args = {};
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const eq = token.indexOf("=");
    if (eq >= 0) {
      args[token.slice(2, eq)] = token.slice(eq + 1);
      continue;
    }
    const key = token.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args[key] = "true";
    } else {
      args[key] = next;
      index += 1;
    }
  }
  if (positional.length) args.type = args.type || positional[0];
  return args;
}

function fail(message) {
  throw new Error(`[arch-diagram] ${message}`);
}

function resolveOptions(raw) {
  const profile = raw.profile;
  if (profile && !PROFILES[profile]) {
    fail(`未知 profile: ${profile}. 支持: ${Object.keys(PROFILES).join(", ")}`);
  }
  const profileDefaults = profile ? PROFILES[profile] : {};
  const format = raw.format || "svg";
  if (!FORMATS.includes(format)) {
    fail(`未知 format: ${format}. 支持: ${FORMATS.join(", ")}`);
  }
  const requestedType = raw.type || profileDefaults.type || "c4";
  if (!ALL_TYPES.includes(requestedType)) {
    fail(`未知 type: ${requestedType}. 支持: ${ALL_TYPES.join(", ")}`);
  }
  const fireworksType = TYPE_MAP[requestedType] || requestedType;
  const style = Number(raw.style || profileDefaults.style || 1);
  if (!Number.isInteger(style) || style < 1 || style > 7) {
    fail(`未知 style: ${raw.style}. 支持: 1..7`);
  }
  return {
    archDir: resolve(raw["arch-dir"] || raw.archDir || process.env.ARCH_PROJECT_ROOT || "."),
    format,
    requestedType,
    fireworksType,
    style,
    profile,
    specJson: raw["spec-json"] || raw.specJson,
    output: raw.output,
    appendWiki: raw["append-wiki"] !== "false",
  };
}

function commandConfig(envName, fallback) {
  const argsEnv = `${envName}_ARGS`;
  let prefixArgs = [];
  if (process.env[argsEnv]) {
    try {
      prefixArgs = JSON.parse(process.env[argsEnv]);
    } catch {
      fail(`${argsEnv} 必须是 JSON 数组`);
    }
    if (!Array.isArray(prefixArgs) || !prefixArgs.every((item) => typeof item === "string")) {
      fail(`${argsEnv} 必须是字符串数组`);
    }
  }
  return { bin: process.env[envName] || fallback, prefixArgs };
}

function checkCommand(command, args, label) {
  const result = spawnSync(command.bin, [...command.prefixArgs, ...args], { encoding: "utf-8" });
  if (result.status !== 0) {
    const stderr = result.stderr?.trim() || result.error?.message;
    fail(`${label} 不可用.${stderr ? ` ${stderr}` : ""}`);
  }
}

function commandWorks(command, args) {
  const result = spawnSync(command.bin, [...command.prefixArgs, ...args], { encoding: "utf-8" });
  return result.status === 0;
}

function pythonCommand() {
  const configured = process.env.ARCH_DIAGRAM_PYTHON ? [commandConfig("ARCH_DIAGRAM_PYTHON", "python3")] : [];
  const candidates = configured.length > 0
    ? configured
    : [
        { bin: "python3", prefixArgs: [] },
        { bin: "python", prefixArgs: [] },
        { bin: "py", prefixArgs: ["-3"] },
      ];
  for (const candidate of candidates) {
    if (commandWorks(candidate, ["--version"]) && commandWorks(candidate, ["-c", "import cairosvg"])) return candidate;
  }
  const names = candidates.map((candidate) => [candidate.bin, ...candidate.prefixArgs].join(" ")).join(", ");
  fail(`Python 3/cairosvg 不可用. Tried: ${names}. Install Python 3 and cairosvg, or set ARCH_DIAGRAM_PYTHON to a Python executable with cairosvg installed.`);
}

function commandPathCandidates(name) {
  if (process.platform !== "win32") return [name];
  try {
    return execFileSync("where.exe", [name], { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"] })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [name];
  }
}

function bashCommand() {
  if (process.env.ARCH_DIAGRAM_BASH) return commandConfig("ARCH_DIAGRAM_BASH", "bash");
  const candidates = unique([
    ...commandPathCandidates("bash"),
    ...commandPathCandidates("sh"),
    "bash",
  ]).map((bin) => ({ bin, prefixArgs: [] }));
  for (const candidate of candidates) {
    if (commandWorks(candidate, ["--version"])) return candidate;
  }
  fail(`Bash 不可用. Tried: ${candidates.map((candidate) => candidate.bin).join(", ")}. Install Git Bash or set ARCH_DIAGRAM_BASH.`);
}

function checkDependencies(format) {
  if (format !== "svg" && format !== "png") return;
  pythonCommand();
  bashCommand();
}

function loadSpec(options) {
  if (options.format === "mermaid" || options.format === "plantuml") return null;
  if (!options.specJson) {
    fail("svg/png 需要 --spec-json 指向 fireworks JSON,该 JSON 必须由 SKILL/LLM 生成");
  }
  let raw;
  if (options.specJson === "-") {
    raw = readFileSync(0, "utf-8");
  } else {
    const path = resolve(options.specJson);
    if (!existsSync(path)) fail(`找不到 spec JSON: ${path}`);
    raw = readFileSync(path, "utf-8");
  }
  try {
    const data = JSON.parse(raw.replace(/^\uFEFF/, ""));
    if (!data || typeof data !== "object" || Array.isArray(data)) fail("spec JSON 必须是对象");
    if (data.style === undefined) data.style = options.style;
    if (!data.title || typeof data.title !== "string") data.title = options.requestedType;
    return data;
  } catch (error) {
    fail(`JSON 格式错误: ${error.message}`);
  }
}

function vendorRoot() {
  return resolve(process.env.ARCH_DIAGRAM_VENDOR_ROOT || join(repoRoot, "vendor", "fireworks-tech-graph"));
}

function normalizeForCli(path) {
  return path.replace(/\\/g, "/");
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== undefined && value !== null && String(value).trim() !== "").map(String))];
}

function validationEnv(python) {
  if (python.bin === "python3" && python.prefixArgs.length === 0) return process.env;
  const shimDir = mkdtempSync(join(tmpdir(), "understand-arch-python3-"));
  const shimPath = join(shimDir, "python3");
  const prefix = python.prefixArgs.map((arg) => `"${arg.replace(/"/g, '\\"')}"`).join(" ");
  writeFileSync(shimPath, `#!/bin/sh\nexec "${normalizeForCli(python.bin)}"${prefix ? ` ${prefix}` : ""} "$@"\n`, "utf-8");
  chmodSync(shimPath, 0o755);
  return { ...process.env, PATH: `${shimDir}${delimiter}${process.env.PATH || ""}` };
}

function runValidate(svgPath, python) {
  const bash = bashCommand();
  const script = join(vendorRoot(), "scripts", "validate-svg.sh");
  if (!existsSync(script)) fail(`找不到 SVG 校验脚本: ${script}`);
  execFileSync(bash.bin, [...bash.prefixArgs, normalizeForCli(script), normalizeForCli(svgPath)], { env: validationEnv(python), stdio: "pipe" });
}

function renderSvg(options, spec, svgPath) {
  const python = pythonCommand();
  const script = join(vendorRoot(), "scripts", "generate-from-template.py");
  if (!existsSync(script)) fail(`找不到 fireworks 渲染脚本: ${script}`);
  execFileSync(
    python.bin,
    [...python.prefixArgs, script, options.fireworksType, svgPath, JSON.stringify(spec)],
    { encoding: "utf-8", stdio: ["ignore", "pipe", "pipe"] },
  );
  prioritizeCjkFonts(svgPath);
  runValidate(svgPath, python);
}

function prioritizeCjkFonts(svgPath) {
  const svg = readFileSync(svgPath, "utf-8");
  if (!/[\u3400-\u9FFF]/.test(svg)) return;
  const cjkStack = "'Noto Sans SC', 'Microsoft YaHei', 'SimHei', 'HarmonyOS Sans SC', 'PingFang SC', 'Microsoft JhengHei', 'SimSun', 'Helvetica Neue', Helvetica, Arial, sans-serif";
  const patched = svg.replace(/text\s*\{\s*font-family:\s*[^;]+;\s*\}/, `text { font-family: ${cjkStack}; }`);
  if (patched !== svg) writeFileSync(svgPath, patched, "utf-8");
}

function renderPng(svgPath, pngPath) {
  const python = pythonCommand();
  execFileSync(
    python.bin,
    [...python.prefixArgs, "-c", "import cairosvg,sys; cairosvg.svg2png(url=sys.argv[1], write_to=sys.argv[2], scale=2)", svgPath, pngPath],
    { stdio: "pipe" },
  );
}

function appendWikiReference(options, assetPath) {
  if (!options.appendWiki) return;
  const wikiPath = join(options.archDir, "wiki", "14-diagrams.md");
  mkdirSync(dirname(wikiPath), { recursive: true });
  const rel = normalizeForCli(relative(dirname(wikiPath), assetPath));
  const marker = `![${options.requestedType}](${rel})`;
  const current = existsSync(wikiPath) ? readFileSync(wikiPath, "utf-8") : "# 14 图示\n\n";
  if (current.includes(marker)) return;
  writeFileSync(wikiPath, `${current.trimEnd()}\n\n${marker}\n`, "utf-8");
}

export function dispatchDiagram(rawArgs) {
  const options = resolveOptions(rawArgs);
  if (options.format === "mermaid") {
    return {
      format: "mermaid",
      handled: false,
      message: "Mermaid 路径由 arch-diagram SKILL 走 v3.1 原实现处理",
    };
  }
  if (options.format === "plantuml") {
    return {
      format: "plantuml",
      handled: false,
      message: "PlantUML 路径由 arch-diagram SKILL 直接写 .puml 文本",
    };
  }

  checkDependencies(options.format);
  const spec = loadSpec(options);
  const assetsDir = join(options.archDir, "wiki", "assets", "diagrams");
  mkdirSync(assetsDir, { recursive: true });
  const base = `${options.fireworksType}-${options.style}`;
  const svgPath = resolve(options.output || join(assetsDir, `${base}.svg`));
  renderSvg(options, spec, svgPath);

  let outputPath = svgPath;
  if (options.format === "png") {
    outputPath = resolve(options.output || join(assetsDir, `${base}.png`));
    renderPng(svgPath, outputPath);
  }
  appendWikiReference(options, outputPath);

  return {
    format: options.format,
    requestedType: options.requestedType,
    fireworksType: options.fireworksType,
    style: options.style,
    outputPath,
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  try {
    const result = dispatchDiagram(parseArgs(process.argv.slice(2)));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
