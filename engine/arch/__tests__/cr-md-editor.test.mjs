import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { CR_HEADINGS, DETAIL_SUBSECTIONS, validateCr, validateOption } from "../cr-md-editor.mjs";

function validCr() {
  const sectionBody = {
    "## 4. 详细设计": DETAIL_SUBSECTIONS.map((heading) => `${heading}\n\n这里是具体设计内容,包含证据、边界和取舍。`).join("\n\n"),
    "## 9. 实施步骤": `### Slice 1: 最小闭环
- 目标:完成用户主路径。
- 范围:typola::module:editor
- 具体改动:
  - 增加入口。
  - 串联保存流程。
- 验收:
  - \`pnpm test\`
- 回滚:
  - 关闭配置开关。
- 人机边界:AFK
- 依赖:无`,
    "## 13. 关联": "- 候选方案对比:`CR-OPTION.md`",
  };
  return `---\ncr_id: CR-2026-001\ntitle: 示例\nstatus: draft\n---\n\n${CR_HEADINGS.map((heading) => `${heading}\n\n${sectionBody[heading] || "这里是可执行的设计内容,不包含占位。"}\n`).join("\n")}`;
}

function validOption() {
  const option = (name) => `### 核心思路
${name} 的核心思路是围绕当前边界推进。

### 怎么改
- 调整相关组件。

### 影响范围
- typola::module:editor

### 优点
- 风险可控。

### 代价
- 需要补充测试。

### 主要风险
- 合约变化需要观测。

### 适合在什么情况下选
- 适合当前目标明确时。

### 不适合在什么情况下选
- 不适合需求仍有冲突时。`;
  return `# 候选方案对比:示例变更

## 0. 设计问题

### 目标
- 完成能力闭环。

### 非目标
- 不重写系统。

### 必须遵守的约束
- 遵守既有边界。

### 当前架构事实
- 编辑模块负责主路径。

### 需要人确认的问题
- 无。

## 1. 方案 A:最小变更方案
${option("方案 A")}

## 2. 方案 B:架构改良方案
${option("方案 B")}

## 3. 方案 C:长期演进方案
${option("方案 C")}

## 4. 横向对比

| 维度 | 方案 A | 方案 B | 方案 C |
|---|---|---|---|
| 改动成本 | 小,只改当前边界 | 中,需要调整接口 | 大,需要迁移 |
| 风险 | 低,可回滚 | 中,需契约验证 | 高,周期长 |
| 可回滚性 | 高 | 中 | 低 |
| 架构收益 | 低 | 中 | 高 |
| 对现有约束的符合度 | 符合 | 符合 | 需确认 |
| 对未来扩展的支持 | 弱 | 中 | 强 |

## 5. 推荐意见

推荐:方案 B

理由:
- 平衡交付和边界质量。

如果优先快速交付,建议选:方案 A
如果本次是架构升级窗口,建议选:方案 C

## 6. 人类决策

- [ ] 采用方案 A
- [ ] 采用方案 B
- [ ] 采用方案 C
- [ ] 混合方案:{说明}
- [ ] 重新生成候选方案,调整方向:{说明}

决策人:
决策时间:
备注:
`;
}

function tempFile(name, content) {
  const dir = mkdtempSync(join(tmpdir(), "understand-arch-cr-"));
  const file = join(dir, name);
  writeFileSync(file, content);
  return file;
}

describe("cr-md-editor validation", () => {
  it("accepts a v3.3 CR with detail subsections and vertical slices", () => {
    const file = tempFile("CR.md", validCr());
    expect(validateCr(file)).toMatchObject({ ok: true, sections_found: 14 });
  });

  it("rejects CRs that do not use vertical slices", () => {
    const broken = validCr().replace(/### Slice 1:[\s\S]*?## 10\. 回滚/, "1. 改 API\n2. 改 UI\n\n## 10. 回滚");
    const result = validateCr(tempFile("CR.md", broken));
    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.message.includes("vertical slices"))).toBe(true);
  });

  it("rejects CRs missing a required section 4 subsection", () => {
    const broken = validCr().replace("### 4.7 接口质量与复杂度隐藏", "### 4.7 接口说明");
    const result = validateCr(tempFile("CR.md", broken));
    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.message.includes("### 4.7 接口质量与复杂度隐藏"))).toBe(true);
  });

  it("rejects CR slices without AFK or HITL classification", () => {
    const broken = validCr().replace("- 人机边界:AFK", "- 人机边界:待人工判断");
    const result = validateCr(tempFile("CR.md", broken));
    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.message.includes("AFK or HITL"))).toBe(true);
  });

  it("accepts CR-OPTION.md with three human-readable options", () => {
    expect(validateOption(tempFile("CR-OPTION.md", validOption()))).toMatchObject({ ok: true });
  });

  it("accepts CR-OPTION.md recommendation phrased as adopting an option", () => {
    const option = validOption().replace("推荐:方案 B", "推荐: 采用 方案 B");
    expect(validateOption(tempFile("CR-OPTION.md", option))).toMatchObject({ ok: true });
  });

  it("rejects CR-OPTION.md missing option C", () => {
    const broken = validOption().replace(/## 3\. 方案 C:长期演进方案[\s\S]*?## 4\. 横向对比/, "## 4. 横向对比");
    const result = validateOption(tempFile("CR-OPTION.md", broken));
    expect(result.ok).toBe(false);
    expect(result.findings.some((finding) => finding.message.includes("方案 C"))).toBe(true);
  });
});
