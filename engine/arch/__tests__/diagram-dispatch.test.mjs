import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, afterEach } from "vitest";
import { dispatchDiagram } from "../diagram-dispatch.mjs";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

function tempDir(name) {
  const dir = join(tmpdir(), `understand-arch-${name}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function commandScript(dir, name, jsBody) {
  const script = join(dir, `${name}.mjs`);
  writeFileSync(script, jsBody, "utf-8");
  return script;
}

function fakeTools() {
  const dir = tempDir("diagram-tools");
  const python = commandScript(dir, "python3", `
import { writeFileSync } from "node:fs";
const args = process.argv.slice(2);
if (args[0] === "--version") {
  console.log("Python 3.12.0");
  process.exit(0);
}
if (args[0] === "-c") {
  if (args[1]?.includes("svg2png")) {
    writeFileSync(args[3], "PNG");
  }
  process.exit(0);
}
const output = args[2];
writeFileSync(output, '<svg xmlns="http://www.w3.org/2000/svg"><defs><style>text { font-family: Helvetica, Arial, sans-serif; }</style></defs><text>中文 ok</text></svg>');
`);
  const bash = commandScript(dir, "bash", "process.exit(0);\n");
  const vendor = join(dir, "vendor");
  mkdirSync(join(vendor, "scripts"), { recursive: true });
  writeFileSync(join(vendor, "scripts", "generate-from-template.py"), "# fake\n", "utf-8");
  writeFileSync(join(vendor, "scripts", "validate-svg.sh"), "# fake\n", "utf-8");
  return { python, bash, vendor };
}

describe("diagram-dispatch", () => {
  it("mermaid 路径不调用 Python", () => {
    process.env.ARCH_DIAGRAM_PYTHON = join(tempDir("missing"), "python3");
    const result = dispatchDiagram({ format: "mermaid", type: "c4" });
    expect(result).toMatchObject({ format: "mermaid", handled: false });
  });

  it("默认路径走 svg 并追加 wiki 引用", () => {
    const tools = fakeTools();
    process.env.ARCH_DIAGRAM_PYTHON = process.execPath;
    process.env.ARCH_DIAGRAM_PYTHON_ARGS = JSON.stringify([tools.python]);
    process.env.ARCH_DIAGRAM_BASH = process.execPath;
    process.env.ARCH_DIAGRAM_BASH_ARGS = JSON.stringify([tools.bash]);
    process.env.ARCH_DIAGRAM_VENDOR_ROOT = tools.vendor;
    const archDir = tempDir("diagram-project");
    const specPath = join(archDir, "diagram.json");
    writeFileSync(specPath, JSON.stringify({ title: "系统图", nodes: [], arrows: [] }), "utf-8");

    const result = dispatchDiagram({
      type: "architecture",
      style: "6",
      "arch-dir": archDir,
      "spec-json": specPath,
    });

    expect(result.outputPath.endsWith("architecture-6.svg")).toBe(true);
    const svg = readFileSync(result.outputPath, "utf-8");
    expect(svg).toContain("'Noto Sans SC'");
    const wiki = readFileSync(join(archDir, "wiki", "14-diagrams.md"), "utf-8");
    expect(wiki).toContain("![architecture](assets/diagrams/architecture-6.svg)");
  });

  it("缺 cairosvg 时给出精确错误", () => {
    const dir = tempDir("diagram-fail");
    const python = commandScript(dir, "python3", `
const args = process.argv.slice(2);
if (args[0] === "--version") process.exit(0);
if (args[0] === "-c" && args[1]?.includes("cairosvg")) process.exit(1);
process.exit(0);
`);
    process.env.ARCH_DIAGRAM_PYTHON = process.execPath;
    process.env.ARCH_DIAGRAM_PYTHON_ARGS = JSON.stringify([python]);

    expect(() => dispatchDiagram({
      format: "png",
      type: "architecture",
      style: "1",
      "arch-dir": dir,
      "spec-json": join(dir, "missing.json"),
    })).toThrow("Python 3/cairosvg 不可用");
  });
});
