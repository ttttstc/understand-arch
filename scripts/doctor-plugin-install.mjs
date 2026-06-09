import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  PLUGIN_ID,
  PLUGIN_KEY,
  cacheRoot,
  formatStatus,
  getKnownMarketplacesDocument,
  getSettingsDocument,
  installedPluginsPath,
  knownMarketplacesPath,
  marketplaceRoot,
  parseArgs,
  printDoctorUsage,
  readJson,
  tryRun,
} from "./claude-plugin-utils.mjs";

function claudePluginList() {
  if (process.platform === "win32") {
    const result = spawnSync("cmd.exe", ["/d", "/s", "/c", "claude plugin list"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (result.error || result.status !== 0) return null;
    return result.stdout?.trim() ?? "";
  }
  return tryRun("claude", ["plugin", "list"]);
}

function parseFrontmatterName(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const name = match[1].match(/^name:\s*["']?([^"'\r\n]+)["']?\s*$/m);
  return name?.[1]?.trim() ?? null;
}

function validateSkillDiscovery(installPath, manifest, strict) {
  const checks = [];
  const errors = [];
  const warnings = [];
  const skillsField = manifest?.skills;

  if (!skillsField) {
    errors.push("plugin manifest missing `skills` field");
    return { checks, errors, warnings };
  }

  const skillsDir = path.resolve(installPath, skillsField);
  if (!fs.existsSync(skillsDir)) {
    errors.push(`skills directory from manifest does not exist: ${skillsDir}`);
    return { checks, errors, warnings };
  }

  const discovered = fs
    .readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((skillName) => fs.existsSync(path.join(skillsDir, skillName, "SKILL.md")))
    .sort();

  const missingNames = [];
  const nameMismatches = [];
  for (const skillName of discovered) {
    const skillPath = path.join(skillsDir, skillName, "SKILL.md");
    const frontmatterName = parseFrontmatterName(fs.readFileSync(skillPath, "utf8"));
    if (!frontmatterName) {
      missingNames.push(skillName);
    } else if (frontmatterName !== skillName) {
      nameMismatches.push(`${skillName} has name=${frontmatterName}`);
    }
  }

  if (missingNames.length > 0) {
    errors.push(`skill frontmatter missing name: ${missingNames.join(", ")}`);
  }
  if (nameMismatches.length > 0) {
    errors.push(`skill frontmatter name mismatch: ${nameMismatches.join("; ")}`);
  }
  if (strict && discovered.length !== 8) {
    errors.push(`strict skill discovery expected 8 skills, found ${discovered.length}: ${discovered.join(", ")}`);
  }
  if (errors.length === 0) {
    checks.push(formatStatus("skill discovery", "ok", `${discovered.length} skills: ${discovered.join(", ")}`));
  } else if (discovered.length > 0) {
    warnings.push(`discovered skills before validation failure: ${discovered.join(", ")}`);
  }

  return { checks, errors, warnings };
}

function collectChecks() {
  const checks = [];
  const errors = [];
  const warnings = [];

  const installedPlugins = readJson(installedPluginsPath, { version: 2, plugins: {} });
  const installedEntries = installedPlugins?.plugins?.[PLUGIN_KEY] ?? [];
  if (installedEntries.length !== 1) {
    errors.push(`expected exactly 1 installed entry for ${PLUGIN_KEY}, found ${installedEntries.length}`);
  } else {
    const entry = installedEntries[0];
    const installPath = entry.installPath;
    const manifestPath = path.join(installPath, ".claude-plugin", "plugin.json");
    checks.push(formatStatus("installed_plugins.json", "ok", `${entry.version} -> ${installPath}`));
    if (!fs.existsSync(installPath)) {
      errors.push(`install path does not exist: ${installPath}`);
    } else {
      const manifest = readJson(manifestPath, null);
      if (!manifest?.version) {
        errors.push(`plugin manifest missing or unreadable: ${manifestPath}`);
      } else if (manifest.version !== entry.version) {
        errors.push(`installed version mismatch: installed_plugins.json=${entry.version}, manifest=${manifest.version}`);
      } else {
        checks.push(formatStatus("installed manifest", "ok", manifest.version));
      }
      const onboardSkill = path.join(installPath, "skills", "arch-onboard", "SKILL.md");
      if (!fs.existsSync(onboardSkill)) {
        errors.push(`missing skill file: ${onboardSkill}`);
      } else {
        checks.push(formatStatus("skill presence", "ok", "arch-onboard"));
      }
    }
  }

  const knownMarketplaces = getKnownMarketplacesDocument();
  const marketplaceEntry = knownMarketplaces[PLUGIN_ID];
  if (!marketplaceEntry) {
    warnings.push(`missing entry in ${knownMarketplacesPath}`);
  } else if (marketplaceEntry.installLocation !== marketplaceRoot) {
    warnings.push(`marketplace installLocation mismatch: ${marketplaceEntry.installLocation}`);
  } else {
    checks.push(formatStatus("known marketplace", "ok", marketplaceRoot));
  }

  if (!fs.existsSync(marketplaceRoot)) {
    warnings.push(`marketplace snapshot missing: ${marketplaceRoot}`);
  } else {
    const marketplaceCatalog = readJson(path.join(marketplaceRoot, ".claude-plugin", "marketplace.json"), null);
    const catalogPlugin = marketplaceCatalog?.plugins?.find?.((plugin) => plugin?.name === PLUGIN_ID);
    if (!catalogPlugin) {
      errors.push(`marketplace catalog does not list plugin ${PLUGIN_ID}: ${path.join(marketplaceRoot, ".claude-plugin", "marketplace.json")}`);
    } else if (catalogPlugin.source !== "./") {
      errors.push(`marketplace catalog source must be './' for ${PLUGIN_ID}, got ${catalogPlugin.source}`);
    } else {
      checks.push(formatStatus("marketplace catalog", "ok", `${PLUGIN_ID} -> ${catalogPlugin.source}`));
    }

    const marketplaceManifest = readJson(path.join(marketplaceRoot, ".claude-plugin", "plugin.json"), null);
    if (!marketplaceManifest?.version) {
      warnings.push(`marketplace manifest missing or unreadable under ${marketplaceRoot}`);
    } else {
      checks.push(formatStatus("marketplace manifest", "ok", marketplaceManifest.version));
    }
  }

  const settings = getSettingsDocument();
  if (settings?.enabledPlugins?.[PLUGIN_KEY] !== true) {
    warnings.push(`enabledPlugins does not enable ${PLUGIN_KEY}`);
  } else {
    checks.push(formatStatus("enabledPlugins", "ok", PLUGIN_KEY));
  }

  if (!fs.existsSync(cacheRoot)) {
    errors.push(`cache root missing: ${cacheRoot}`);
  } else {
    const versions = fs
      .readdirSync(cacheRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
    if (versions.length !== 1) {
      warnings.push(`expected 1 cached version under ${cacheRoot}, found ${versions.length}: ${versions.join(", ")}`);
    } else {
      checks.push(formatStatus("cache versions", "ok", versions[0]));
    }
  }

  const installedEntry = installedEntries[0];
  if (installedEntry?.installPath && fs.existsSync(installedEntry.installPath)) {
    const manifestPath = path.join(installedEntry.installPath, ".claude-plugin", "plugin.json");
    const installedManifest = readJson(manifestPath, {});
    const skillDiscovery = validateSkillDiscovery(installedEntry.installPath, installedManifest, true);
    checks.push(...skillDiscovery.checks);
    errors.push(...skillDiscovery.errors);
    warnings.push(...skillDiscovery.warnings);

    const skillsDir = path.resolve(installedEntry.installPath, installedManifest?.skills ?? "skills");
    if (fs.existsSync(skillsDir)) {
      const invalidHints = [];
      for (const skillName of fs.readdirSync(skillsDir)) {
        const skillPath = path.join(skillsDir, skillName, "SKILL.md");
        if (!fs.existsSync(skillPath)) {
          continue;
        }
        const content = fs.readFileSync(skillPath, "utf8");
        if (/^argument-hint:\s*\[/m.test(content)) {
          invalidHints.push(skillName);
        }
      }
      if (invalidHints.length > 0) {
        errors.push(`argument-hint must be a string, not a YAML array: ${invalidHints.join(", ")}`);
      } else {
        checks.push(formatStatus("skill frontmatter", "ok", "argument-hint strings"));
      }
    }
  }

  const pluginList = claudePluginList();
  if (!pluginList) {
    warnings.push("could not run `claude plugin list`; install files were checked but Claude runtime status was not verified");
  } else {
    const lines = pluginList.split(/\r?\n/);
    const marker = `> ${PLUGIN_KEY}`;
    const index = lines.findIndex((line) => line.includes(marker));
    if (index === -1) {
      errors.push(`claude plugin list does not include ${PLUGIN_KEY}`);
    } else {
      const block = lines.slice(index, index + 6).join("\n");
      if (/failed to load/i.test(block)) {
        errors.push(`Claude runtime reports failed plugin load:\n${block}`);
      } else if (!/Status:\s*.*enabled/i.test(block)) {
        warnings.push(`Claude runtime does not report enabled status for ${PLUGIN_KEY}:\n${block}`);
      } else {
        checks.push(formatStatus("claude runtime", "ok", `${PLUGIN_KEY} enabled`));
      }
    }
  }

  return { checks, errors, warnings };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printDoctorUsage();
    return;
  }

  const { checks, errors, warnings } = collectChecks();

  console.log("understand-arch plugin doctor");
  console.log("");
  for (const line of checks) {
    console.log(line);
  }
  for (const warning of warnings) {
    console.log(formatStatus("warning", "warn", warning));
  }
  for (const error of errors) {
    console.log(formatStatus("error", "fail", error));
  }

  console.log("");
  console.log("Recommended verify command:");
  console.log("  /arch-onboard");

  if (errors.length > 0 || (options.strict && warnings.length > 0)) {
    process.exitCode = 1;
    return;
  }
}

main();
