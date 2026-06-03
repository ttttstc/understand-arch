import { describe, expect, it } from "vitest";
import { renderProjectLanguage } from "../project-language-writer.mjs";

describe("project-language-writer", () => {
  it("renders populated project language tables", () => {
    const rendered = renderProjectLanguage({
      domain_terms: [
        {
          term: "文档",
          meaning: "用户正在编辑的 Markdown 内容",
          recommended_usage: "统一称为文档",
          avoid: "文章",
          evidence_refs: ["typola::module:editor"],
        },
      ],
      roles: [{ role: "编辑者", meaning: "创建和修改文档的用户", source: "PRD" }],
      states_events: [{ name: "保存完成", meaning: "文档已落盘", flow: "保存流程", source: "typola::flow:save" }],
      components: [{ component: "Editor", recommended_chinese_name: "编辑器", code_identifier: "Editor", description: "文档编辑组件" }],
      forbidden_mixups: [{ avoid: "文章", recommended: "文档", reason: "项目内统一称为文档" }],
    });

    expect(rendered.counts.domain_terms).toBe(1);
    expect(rendered.markdown).toContain("|文档|用户正在编辑的 Markdown 内容|统一称为文档|文章|typola::module:editor|");
    expect(rendered.markdown).toContain("## 禁止混用");
  });

  it("renders explicit unknown rows for empty sections", () => {
    const rendered = renderProjectLanguage({});
    expect(rendered.markdown).toContain("|未识别|未识别|未识别|未识别|未识别|");
    expect(rendered.counts.components).toBe(0);
  });
});
