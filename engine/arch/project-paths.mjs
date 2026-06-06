import { basename, join, resolve, sep } from "node:path";

const ARCH_DIR_NAME = ".understand-arch";

function pathParts(absPath) {
  return resolve(absPath).split(/[\\/]+/);
}

export function resolveWorkspaceRoot(input = process.cwd()) {
  const resolved = resolve(input);
  const parts = pathParts(resolved);
  const markerIndex = parts.findIndex((part) => part === ARCH_DIR_NAME);
  if (markerIndex <= 0) return resolved;
  return parts.slice(0, markerIndex).join(sep);
}

export function isInsideArchWorkspace(input = process.cwd()) {
  return pathParts(input).includes(ARCH_DIR_NAME);
}

export function inferArchDir(options = {}) {
  if (options.archDir) return resolve(options.archDir);
  if (process.env.ARCH_PROJECT_ROOT) return resolve(process.env.ARCH_PROJECT_ROOT);
  const projectRoot = resolveWorkspaceRoot(options.projectRoot || process.cwd());
  const projectId = options.projectId || process.env.ARCH_PROJECT_ID || basename(projectRoot);
  return join(projectRoot, ARCH_DIR_NAME, projectId);
}

export function inferProjectRoot(options = {}) {
  return resolveWorkspaceRoot(options.projectRoot || process.argv[3] || process.argv[2] || process.cwd());
}
