import fs from "node:fs";
import path from "node:path";
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
} from "./claude-plugin-utils.mjs";

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
    const skillsDir = path.join(installedEntry.installPath, "skills");
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
