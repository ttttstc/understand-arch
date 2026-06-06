import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  PLUGIN_ID,
  PLUGIN_KEY,
  cacheRoot,
  copySnapshot,
  ensureDir,
  getKnownMarketplacesDocument,
  getOriginRepo,
  getSettingsDocument,
  installedPluginsPath,
  knownMarketplacesPath,
  marketplaceRoot,
  parseArgs,
  printInstallUsage,
  readJson,
  repoRoot,
  resolveGitRef,
  run,
  settingsPath,
  writeJson,
} from "./claude-plugin-utils.mjs";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printInstallUsage();
    return;
  }

  ensureDir(path.dirname(installedPluginsPath));
  const useWorktree = options.ref === "worktree" || options.ref === "working-tree";
  if (!useWorktree) {
    try {
      run("git", ["fetch", "--tags", "origin"], { capture: options.verbose === false });
    } catch (error) {
      console.warn(`Warning: ${error.message}`);
      console.warn("Continuing with locally available refs.");
    }
  }

  const resolvedCommit = useWorktree ? run("git", ["rev-parse", "HEAD"]) : resolveGitRef(options.ref);
  const sourceRepo = getOriginRepo();
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), `${PLUGIN_ID}-install-`));
  const worktreeDir = path.join(tempRoot, "snapshot");

  try {
    const snapshotDir = useWorktree ? repoRoot : worktreeDir;
    if (!useWorktree) {
      run("git", ["worktree", "add", "--detach", worktreeDir, resolvedCommit], {
        capture: options.verbose === false,
        cwd: repoRoot,
      });
    }

    const manifestPath = path.join(snapshotDir, ".claude-plugin", "plugin.json");
    const manifest = readJson(manifestPath);
    if (!manifest?.version) {
      throw new Error(`Missing version in ${manifestPath}`);
    }

    const version = manifest.version;
    const targetCacheDir = path.join(cacheRoot, version);

    ensureDir(cacheRoot);
    for (const entry of fs.readdirSync(cacheRoot, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        fs.rmSync(path.join(cacheRoot, entry.name), { recursive: true, force: true });
      }
    }

    copySnapshot(snapshotDir, marketplaceRoot);
    copySnapshot(snapshotDir, targetCacheDir);

    const installedPlugins = readJson(installedPluginsPath, { version: 2, plugins: {} });
    installedPlugins.version ??= 2;
    installedPlugins.plugins ??= {};
    const now = new Date().toISOString();
    installedPlugins.plugins[PLUGIN_KEY] = [
      {
        scope: "user",
        installPath: targetCacheDir,
        version,
        installedAt: now,
        lastUpdated: now,
        gitCommitSha: resolvedCommit,
      },
    ];
    writeJson(installedPluginsPath, installedPlugins);

    const knownMarketplaces = getKnownMarketplacesDocument();
    knownMarketplaces[PLUGIN_ID] = {
      source: {
        source: "github",
        repo: sourceRepo,
      },
      installLocation: marketplaceRoot,
      lastUpdated: now,
    };
    writeJson(knownMarketplacesPath, knownMarketplaces);

    const settings = getSettingsDocument();
    settings.enabledPlugins ??= {};
    settings.enabledPlugins[PLUGIN_KEY] = true;
    writeJson(settingsPath, settings);

    console.log(`Installed ${PLUGIN_KEY}`);
    console.log(`  ref: ${options.ref}`);
    console.log(`  commit: ${resolvedCommit}`);
    console.log(`  version: ${version}`);
    console.log(`  cache: ${targetCacheDir}`);
    console.log("");
    console.log("Next steps:");
    console.log("  1. Run /reload-plugins in Claude Code");
    console.log("  2. Verify with /arch-onboard");
    console.log("  3. Optional: node scripts/doctor-plugin-install.mjs --strict");
  } finally {
    if (!useWorktree) {
      try {
        run("git", ["worktree", "remove", "--force", worktreeDir], {
          capture: options.verbose === false,
          cwd: repoRoot,
        });
      } catch {
        // Best effort cleanup; the temp directory is disposable.
      }
    }
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
