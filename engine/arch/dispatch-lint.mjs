import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

export const TARGET_SKILLS = [
  "arch-enrich",
  "arch-audit",
  "arch-design",
  "arch-interview",
  "arch-wiki",
  "arch-diagram",
  "arch-improve",
];

export const EXEMPT_SKILLS = new Set(["arch-analyze", "arch-dashboard"]);
export const ORCHESTRATOR_SKILLS = new Set(["arch-onboard"]);

const REQUIRED_PHRASES = [
  "Subagent Dispatch Is Mandatory",
  "Use the Claude Code Task tool",
  "subagent_type=",
  "Do not inline this phase",
  "The user must see subagent activity in Claude Code",
];

const RUNTIME_FALLBACK_PHRASES = [
  "Runtime fallback",
  "[runtime-fallback: inline subagent",
];

const PARALLEL_SKILLS = new Set([
  "arch-enrich",
  "arch-audit",
  "arch-design",
  "arch-wiki",
]);

function stripFencedBlocks(text) {
  return text.replace(/```[\s\S]*?```/g, "");
}

function stripRuntimeFallback(text) {
  return text.replace(/\*\*Runtime fallback\*\*:[\s\S]*?should not be used in Claude Code\.\s*/g, "");
}

function lineNumberFor(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

export function lintSkillText(skillName, text, options = {}) {
  const strict = Boolean(options.strict);
  const errors = [];
  const warnings = [];
  const visibleText = stripFencedBlocks(text);
  const dispatchText = stripRuntimeFallback(visibleText);

  if (EXEMPT_SKILLS.has(skillName)) {
    if (skillName === "arch-analyze" && !text.includes("Subagent Dispatch Is Mandatory")) {
      warnings.push("benchmark skill does not declare Subagent Dispatch Is Mandatory");
    }
    return { skillName, errors, warnings };
  }

  if (TARGET_SKILLS.includes(skillName)) {
    for (const phrase of REQUIRED_PHRASES) {
      if (!text.includes(phrase)) {
        errors.push(`missing required phrase: ${phrase}`);
      }
    }
    for (const phrase of RUNTIME_FALLBACK_PHRASES) {
      if (!text.includes(phrase)) {
        errors.push(`missing runtime fallback phrase: ${phrase}`);
      }
    }
  }

  if (ORCHESTRATOR_SKILLS.has(skillName)) {
    for (const phrase of ["Task Calling Convention", "Use the Claude Code Task tool", "Do not inline this phase", "The user must see subagent activity in Claude Code"]) {
      if (!text.includes(phrase)) {
        errors.push(`orchestrator missing required phrase: ${phrase}`);
      }
    }
  }

  if (TARGET_SKILLS.includes(skillName)) {
    const legacyDispatch = /(^|\n)\s*(Dispatch|dispatch)\s+`[^`]+`/g;
    for (const match of visibleText.matchAll(legacyDispatch)) {
      const index = match.index ?? 0;
      const line = lineNumberFor(visibleText, index);
      const surrounding = visibleText.slice(Math.max(0, index - 180), index + 260);
      if (!surrounding.includes("Use the Claude Code Task tool") || !surrounding.includes("subagent_type=")) {
        errors.push(`legacy dispatch wording without Task/subagent_type near line ${line}`);
      }
    }
  }

  if (/inline (simulate|simulation)|simulate .*inline|内嵌模拟|自行模拟/i.test(dispatchText)) {
    errors.push("forbidden inline simulation wording found");
  }

  if (PARALLEL_SKILLS.has(skillName) && !text.includes("Send these N dispatches in a single message to run concurrently")) {
    errors.push("missing parallel dispatch phrase: Send these N dispatches in a single message to run concurrently");
  }

  if (strict && /concurrently|并行|parallel/i.test(dispatchText) && !text.includes("Send these N dispatches in a single message to run concurrently")) {
    errors.push("concurrent/parallel wording must use the required single-message dispatch phrase");
  }

  return { skillName, errors, warnings };
}

export function lintSkillFile(filePath, options = {}) {
  const text = readFileSync(filePath, "utf8");
  const skillName = options.skillName ?? path.basename(path.dirname(filePath));
  return {
    filePath,
    ...lintSkillText(skillName, text, options),
  };
}

export function lintAllSkills(options = {}) {
  const skillsDir = path.join(repoRoot, "skills");
  const results = [];

  for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const skillPath = path.join(skillsDir, entry.name, "SKILL.md");
    if (!existsSync(skillPath)) continue;
    results.push(lintSkillFile(skillPath, options));
  }

  const playbooksDir = path.join(repoRoot, "internal", "playbooks");
  if (existsSync(playbooksDir)) {
    for (const entry of readdirSync(playbooksDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const playbookPath = path.join(playbooksDir, entry.name, "playbook.md");
      if (!existsSync(playbookPath)) continue;
      results.push(lintSkillFile(playbookPath, { ...options, skillName: `arch-${entry.name}` }));
    }
  }

  return results;
}

function collectSkillAndPlaybookFiles(root = repoRoot) {
  const files = [];
  const skillsDir = path.join(root, "skills");
  if (existsSync(skillsDir)) {
    for (const entry of readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const skillPath = path.join(skillsDir, entry.name, "SKILL.md");
      if (existsSync(skillPath)) files.push(skillPath);
    }
  }

  const playbooksDir = path.join(root, "internal", "playbooks");
  if (existsSync(playbooksDir)) {
    for (const entry of readdirSync(playbooksDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const playbookPath = path.join(playbooksDir, entry.name, "playbook.md");
      if (existsSync(playbookPath)) files.push(playbookPath);
    }
  }

  return files;
}

function collectAgentNames(root = repoRoot) {
  const agentsDir = path.join(root, "agents");
  if (!existsSync(agentsDir)) return new Set();
  return new Set(
    readdirSync(agentsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name.replace(/\.md$/, "")),
  );
}

export function lintSubagentReferences(options = {}) {
  const root = options.repoRoot ?? repoRoot;
  const files = options.files ?? collectSkillAndPlaybookFiles(root);
  const agentNames = options.agentNames ?? collectAgentNames(root);
  const results = [];

  const patterns = [
    /subagent_type\s*=\s*["'`]?([a-z][a-z0-9:-]*)/g,
    /subagent_type\s*:\s*["'`]([a-z][a-z0-9:-]*)/g,
  ];

  for (const filePath of files) {
    const text = readFileSync(filePath, "utf8");
    const refs = new Set();
    for (const pattern of patterns) {
      for (const match of text.matchAll(pattern)) {
        refs.add(match[1]);
      }
    }
    const errors = [];
    for (const ref of [...refs].sort()) {
      const unqualified = ref.includes(":") ? ref.split(":").pop() : ref;
      if (!agentNames.has(unqualified)) {
        errors.push(`unresolved subagent_type=${ref}; expected agents/${unqualified}.md`);
      }
    }
    results.push({ filePath, errors });
  }

  return results;
}

function formatResult(result) {
  const rel = path.relative(repoRoot, result.filePath ?? `skills/${result.skillName}/SKILL.md`);
  return result.errors.map((error) => `${rel}: ${error}`);
}

export function runCli(argv = process.argv.slice(2)) {
  const strict = argv.includes("--strict");
  const results = lintAllSkills({ strict });
  const referenceResults = lintSubagentReferences();
  const errors = [
    ...results.flatMap(formatResult),
    ...referenceResults.flatMap((result) =>
      result.errors.map((error) => `${path.relative(repoRoot, result.filePath)}: ${error}`),
    ),
  ];
  const warnings = results.flatMap((result) =>
    result.warnings.map((warning) => `${path.relative(repoRoot, result.filePath)}: warning: ${warning}`),
  );

  for (const warning of warnings) {
    console.warn(warning);
  }

  if (errors.length > 0) {
    console.error(errors.join("\n"));
    return 1;
  }

  console.log(`dispatch-lint ok (${results.length} skills checked, ${referenceResults.length} reference files checked, strict=${strict})`);
  return 0;
}

if (process.argv[1] === __filename) {
  process.exitCode = runCli();
}
