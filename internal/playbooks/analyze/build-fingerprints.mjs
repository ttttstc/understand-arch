#!/usr/bin/env node
/**
 * build-fingerprints.mjs
 *
 * Builds the structural-fingerprint baseline used by auto-update's
 * incremental change detection. Runs once per analyze playbook full rebuild
 * (Phase 7 step 2.5), generating the per-repo fingerprint baseline consumed
 * by understand-arch v3.4 incremental planning.
 *
 * Replaces the LLM-written fingerprint script that previously sat in
 * SKILL.md as a code example — that example had the wrong signature
 * for buildFingerprintStore() and never successfully produced a baseline,
 * which silently broke auto-update for every install (see issue #152).
 *
 * Usage:
 *   node build-fingerprints.mjs <input.json>
 *
 * Input JSON:
 *   { projectRoot: string, sourceFilePaths: string[], gitCommitHash: string, repoId?: string }
 *
 * Writes: <ARCH_PROJECT_ROOT>/specs/repos/<repo_id>/.fingerprint.json
 * Exit code: 0 on success (including 0 files analyzed); non-zero on error.
 */

import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolveWorkspaceRoot } from '../../../engine/arch/project-paths.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
// internal/playbooks/analyze/ -> plugin root is three dirs up
const pluginRoot = resolve(__dirname, '../../..');
const require = createRequire(resolve(pluginRoot, 'package.json'));

// ---------------------------------------------------------------------------
// Resolve @understand-arch/core (matches extract-structure.mjs).
// pathToFileURL() is required for Windows: dynamic import() of a raw
// "C:\..." path throws ERR_UNSUPPORTED_ESM_URL_SCHEME.
// ---------------------------------------------------------------------------
let core;
try {
  core = await import(pathToFileURL(require.resolve('@understand-arch/core')).href);
} catch {
  core = await import(pathToFileURL(resolve(pluginRoot, 'engine/core/dist/index.js')).href);
}

const {
  TreeSitterPlugin,
  PluginRegistry,
  builtinLanguageConfigs,
  registerAllParsers,
  buildFingerprintStore,
} = core;

function archProjectDir(projectRoot) {
  const root = resolveWorkspaceRoot(projectRoot);
  return process.env.ARCH_PROJECT_DIR || join(root, '.understand-arch', process.env.ARCH_PROJECT_ID || basename(root));
}

function archProjectRoot(projectRoot) {
  return process.env.ARCH_PROJECT_ROOT || archProjectDir(projectRoot);
}

async function main() {
  const [, , inputPath] = process.argv;
  if (!inputPath) {
    process.stderr.write('Usage: node build-fingerprints.mjs <input.json>\n');
    process.exit(1);
  }

  const { projectRoot, sourceFilePaths, gitCommitHash, repoId } = JSON.parse(
    readFileSync(inputPath, 'utf-8'),
  );

  if (!projectRoot || !Array.isArray(sourceFilePaths) || typeof gitCommitHash !== 'string') {
    throw new Error(
      'Invalid input: requires { projectRoot: string, sourceFilePaths: string[], gitCommitHash: string }',
    );
  }

  // Create tree-sitter plugin with all configs that have WASM grammars,
  // mirroring extract-structure.mjs so the baseline matches the comparison
  // logic used during auto-updates.
  const tsConfigs = builtinLanguageConfigs.filter((c) => c.treeSitter);
  const tsPlugin = new TreeSitterPlugin(tsConfigs);
  await tsPlugin.init();

  const registry = new PluginRegistry();
  registry.register(tsPlugin);
  registerAllParsers(registry);

  const store = buildFingerprintStore(projectRoot, sourceFilePaths, registry, gitCommitHash);
  const archRoot = archProjectRoot(projectRoot);
  const resolvedRepoId = repoId || process.env.ARCH_REPO_ID || basename(projectRoot);
  const repoOutDir = join(archRoot, 'specs', 'repos', resolvedRepoId);
  mkdirSync(repoOutDir, { recursive: true });
  writeFileSync(join(repoOutDir, '.fingerprint.json'), JSON.stringify(store, null, 2), 'utf-8');

  // Compatibility for older UA-derived flows that still look beside ARCH_PROJECT_DIR.
  const legacyOutDir = archProjectDir(projectRoot);
  mkdirSync(legacyOutDir, { recursive: true });
  writeFileSync(join(legacyOutDir, 'fingerprints.json'), JSON.stringify(store, null, 2), 'utf-8');

  const fileCount = Object.keys(store.files).length;
  process.stdout.write(`Fingerprints baseline: ${fileCount} files -> ${join(repoOutDir, '.fingerprint.json')}\n`);
}

await main();
