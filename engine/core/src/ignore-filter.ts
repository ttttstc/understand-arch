import ignore, { type Ignore } from "ignore";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Hardcoded default ignore patterns for files that do not carry first-order
 * product structure. Project-level `.understandignore` files can override
 * these defaults with `!` negation when tests, generated code, or assets are
 * intentionally part of the architecture evidence.
 */
export const DEFAULT_IGNORE_PATTERNS: string[] = [
  // Dependency directories
  "node_modules/",
  "bower_components/",
  ".git/",
  ".svn/",
  ".hg/",
  "vendor/",
  "venv/",
  ".venv/",
  ".mypy_cache/",
  ".pytest_cache/",
  ".ruff_cache/",
  ".tox/",
  ".nox/",
  "__pycache__/",

  // Build output
  "dist/",
  "build/",
  "out/",
  "public/build/",
  "coverage/",
  ".nyc_output/",
  ".next/",
  ".nuxt/",
  ".svelte-kit/",
  ".angular/",
  ".cache/",
  ".parcel-cache/",
  ".turbo/",
  ".vite/",
  "target/",
  "obj/",
  "DerivedData/",
  ".dart_tool/",
  ".gradle/",
  ".serverless/",
  ".terraform/",
  ".vercel/",
  ".netlify/",

  // Test-only files and directories
  "**/*.test.*",
  "**/*.spec.*",
  "**/*.snap",
  "**/__tests__/**",
  "**/__test__/**",
  "**/tests/**",
  "**/test/**",
  "**/snapshots/**",
  "**/__snapshots__/**",

  // Mock, fixture, and sample data
  "**/__mocks__/**",
  "**/mocks/**",
  "**/mock/**",
  "**/fixtures/**",
  "**/fixture/**",
  "**/testdata/**",
  "**/test-data/**",
  "**/sample-data/**",

  // Generated code and generated artifacts
  "**/generated/**",
  "**/gen/**",
  "**/__generated__/**",
  "**/*.generated.*",
  "**/*.gen.*",
  "**/*-generated.*",
  "**/*_generated.*",
  "**/*.pb.go",
  "**/*_pb2.py",
  "**/*.g.dart",
  "**/*.freezed.dart",
  "**/*.designer.cs",
  "**/*.Designer.cs",
  "**/openapi/generated/**",

  // Lock files
  "*.lock",
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "Cargo.lock",
  "poetry.lock",
  "Pipfile.lock",
  "Gemfile.lock",
  "composer.lock",
  "go.sum",
  "terraform.lock.hcl",

  // Binary/asset files
  "*.bmp",
  "*.dib",
  "*.png",
  "*.apng",
  "*.jpg",
  "*.jpeg",
  "*.jpe",
  "*.jfif",
  "*.pjpeg",
  "*.pjp",
  "*.gif",
  "*.webp",
  "*.avif",
  "*.svg",
  "*.tif",
  "*.tiff",
  "*.heic",
  "*.heif",
  "*.jp2",
  "*.j2k",
  "*.jpf",
  "*.jpx",
  "*.jpm",
  "*.jxl",
  "*.psd",
  "*.psb",
  "*.ai",
  "*.eps",
  "*.raw",
  "*.dng",
  "*.cr2",
  "*.cr3",
  "*.nef",
  "*.nrw",
  "*.arw",
  "*.srf",
  "*.sr2",
  "*.orf",
  "*.rw2",
  "*.pef",
  "*.raf",
  "*.x3f",
  "*.ico",
  "*.icns",
  "*.woff",
  "*.woff2",
  "*.ttf",
  "*.otf",
  "*.eot",
  "*.mp3",
  "*.wav",
  "*.flac",
  "*.mp4",
  "*.mov",
  "*.avi",
  "*.mkv",
  "*.pdf",
  "*.doc",
  "*.docx",
  "*.ppt",
  "*.pptx",
  "*.xls",
  "*.xlsx",
  "*.sqlite",
  "*.sqlite3",
  "*.db",
  "*.wasm",
  "*.jar",
  "*.war",
  "*.ear",
  "*.class",
  "*.dll",
  "*.dylib",
  "*.so",
  "*.exe",
  "*.bin",
  "*.zip",
  "*.tar",
  "*.gz",
  "*.tgz",
  "*.bz2",
  "*.7z",
  "*.rar",

  // Generated files
  "*.min.js",
  "*.min.css",
  "*.map",
  "*.tsbuildinfo",

  // IDE/editor
  ".idea/",
  ".vscode/",
  ".fleet/",
  ".history/",
  ".vs/",
  "*.swp",
  "*.swo",
  "*~",

  // Local environment, secrets, and logs
  ".env",
  ".env.*",
  "!.env.example",
  "!.env.sample",
  "*.pem",
  "*.key",
  "*.cert",
  "*.crt",
  "*.p12",
  "*.pfx",
  "*.log",
  "*.tmp",
  "*.temp",
  ".DS_Store",
  "Thumbs.db",

  // Repository metadata with little structural value
  "LICENSE",
  ".gitignore",
  ".gitattributes",
  ".dockerignore",
  ".editorconfig",
  ".prettierrc",
  ".prettierignore",
  ".eslintrc*",
];

export interface IgnoreFilter {
  /** Returns true if the given relative path should be excluded from analysis. */
  isIgnored(relativePath: string): boolean;
}

/**
 * Creates an IgnoreFilter that merges hardcoded defaults with user-defined
 * patterns from .understandignore files.
 *
 * Pattern load order (later entries can override earlier ones via ! negation):
 * 1. Hardcoded defaults
 * 2. .understand-arch/.understandignore (if exists)
 * 3. .understandignore at project root (if exists)
 */
export function createIgnoreFilter(projectRoot: string): IgnoreFilter {
  const ig: Ignore = ignore();

  // Layer 1: hardcoded defaults
  ig.add(DEFAULT_IGNORE_PATTERNS);

  // Layer 2: .understand-arch/.understandignore
  const projectIgnorePath = join(projectRoot, ".understand-arch", ".understandignore");
  if (existsSync(projectIgnorePath)) {
    const content = readFileSync(projectIgnorePath, "utf-8");
    ig.add(content);
  }

  // Layer 3: .understandignore at project root
  const rootIgnorePath = join(projectRoot, ".understandignore");
  if (existsSync(rootIgnorePath)) {
    const content = readFileSync(rootIgnorePath, "utf-8");
    ig.add(content);
  }

  return {
    isIgnored(relativePath: string): boolean {
      return ig.ignores(relativePath);
    },
  };
}
