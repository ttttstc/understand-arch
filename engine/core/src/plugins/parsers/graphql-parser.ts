import type { AnalyzerPlugin, StructuralAnalysis, DefinitionInfo, EndpointInfo } from "../../types.js";

/**
 * Parses GraphQL schema files to extract type, input, enum, interface, union, and scalar definitions.
 * Extracts Query, Mutation, and Subscription endpoints as separate endpoint entries.
 * Does not handle fragments or inline union members.
 */
export class GraphQLParser implements AnalyzerPlugin {
  name = "graphql-parser";
  languages = ["graphql"];

  analyzeFile(_filePath: string, content: string): StructuralAnalysis {
    const definitions = this.extractDefinitions(content);
    const endpoints = this.extractEndpoints(content);
    return {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      definitions,
      endpoints,
    };
  }

  private extractDefinitions(content: string): DefinitionInfo[] {
    const definitions: DefinitionInfo[] = [];

    // Match type, input, enum, interface, union, scalar definitions
    const typeRegex = /^(type|input|enum|interface|union|scalar)\s+(\w+)/gm;
    let match;
    while ((match = typeRegex.exec(content)) !== null) {
      const kind = match[1];
      const name = match[2];
      if (name === "Query" || name === "Mutation" || name === "Subscription") continue;
      const startLine = content.slice(0, match.index).split("\n").length;

      // Extract fields (for type/input/interface/enum)
      const fieldDetails = this.extractFieldDetails(content, match.index);
      const directives = this.extractDirectivesFromHeader(content, match.index);

      // Find closing brace
      const afterMatch = content.slice(match.index);
      const closeBrace = afterMatch.indexOf("}");
      const endLine = closeBrace !== -1
        ? content.slice(0, match.index + closeBrace + 1).split("\n").length
        : startLine;

      definitions.push({
        name,
        kind,
        lineRange: [startLine, endLine],
        fields: fieldDetails.map((field) => field.name),
        attributes: {
          graphql_kind: kind,
          fields: fieldDetails,
          directives,
        },
      });
    }

    return definitions;
  }

  private extractEndpoints(content: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];

    // Find Query, Mutation, Subscription blocks and extract their fields
    const blockRegex = /^(type)\s+(Query|Mutation|Subscription)\s*\{/gm;
    let match;
    while ((match = blockRegex.exec(content)) !== null) {
      const method = match[2]; // Query, Mutation, Subscription
      const startIdx = match.index + match[0].length;

      // Find closing brace
      let depth = 1;
      let i = startIdx;
      while (i < content.length && depth > 0) {
        if (content[i] === "{") depth++;
        if (content[i] === "}") depth--;
        i++;
      }

      const blockContent = content.slice(startIdx, i - 1);
      const blockLines = blockContent.split("\n");
      const blockStartLine = content.slice(0, startIdx).split("\n").length;

      for (let j = 0; j < blockLines.length; j++) {
        const field = this.parseField(blockLines[j].trim());
        if (field) {
          const lineNum = blockStartLine + j;
          endpoints.push({
            method,
            path: field.name,
            lineRange: [lineNum, lineNum],
            attributes: {
              protocol: "graphql",
              operation_type: method,
              operation: field.name,
              request_params: field.args,
              return_type: field.type,
              directives: field.directives,
            },
          });
        }
      }
    }

    return endpoints;
  }

  private extractFieldDetails(content: string, startIdx: number): Array<Record<string, unknown> & { name: string }> {
    const fields: Array<Record<string, unknown> & { name: string }> = [];
    const afterType = content.slice(startIdx);
    const openBrace = afterType.indexOf("{");
    if (openBrace === -1) return fields;

    let depth = 1;
    let i = openBrace + 1;
    while (i < afterType.length && depth > 0) {
      if (afterType[i] === "{") depth++;
      if (afterType[i] === "}") depth--;
      i++;
    }

    const body = afterType.slice(openBrace + 1, i - 1);
    const lines = body.split("\n");
    for (const line of lines) {
      const field = this.parseField(line.trim());
      if (field) fields.push(field);
    }

    return fields;
  }

  private parseField(line: string): (Record<string, unknown> & { name: string; type: string; args: unknown[]; directives: string[] }) | null {
    const cleaned = line.replace(/#.*/, "").trim();
    if (!cleaned || cleaned === "}") return null;
    const match = cleaned.match(/^(\w+)\s*(?:\(([^)]*)\))?\s*:\s*([^@]+)(.*)$/);
    if (!match) return null;
    const [, name, argsText = "", typeText, tail = ""] = match;
    const type = typeText.trim();
    return {
      name,
      type,
      required: type.endsWith("!"),
      list: type.includes("["),
      args: this.parseArgs(argsText),
      directives: this.extractDirectives(tail),
    };
  }

  private parseArgs(argsText: string): Array<Record<string, unknown>> {
    if (!argsText.trim()) return [];
    return argsText.split(",").map((part) => {
      const match = part.trim().match(/^(\w+)\s*:\s*([^=]+?)(?:\s*=\s*(.+))?$/);
      if (!match) return null;
      const [, name, typeText, defaultValue] = match;
      const type = typeText.trim();
      return {
        name,
        in: "argument",
        type,
        required: type.endsWith("!") && defaultValue === undefined,
        default: defaultValue?.trim(),
      };
    }).filter(Boolean) as Array<Record<string, unknown>>;
  }

  private extractDirectives(text: string): string[] {
    return [...text.matchAll(/@(\w+)(?:\([^)]*\))?/g)].map((match) => match[0]);
  }

  private extractDirectivesFromHeader(content: string, startIdx: number): string[] {
    const line = content.slice(startIdx, content.indexOf("{", startIdx) === -1 ? undefined : content.indexOf("{", startIdx));
    return this.extractDirectives(line);
  }
}
