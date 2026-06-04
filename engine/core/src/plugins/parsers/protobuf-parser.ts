import type { AnalyzerPlugin, StructuralAnalysis, DefinitionInfo, EndpointInfo } from "../../types.js";

/**
 * Parses Protocol Buffer (.proto) files to extract message, enum, and service definitions.
 * Extracts message fields, enum values, and service RPC method endpoints.
 * Does not handle nested message types, oneof fields, or proto2 extensions.
 */
export class ProtobufParser implements AnalyzerPlugin {
  name = "protobuf-parser";
  languages = ["protobuf"];

  analyzeFile(_filePath: string, content: string): StructuralAnalysis {
    const definitions = this.extractDefinitions(content);
    const endpoints = this.extractServiceMethods(content);
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

    // Match message definitions
    const messageRegex = /^message\s+(\w+)\s*\{/gm;
    let match;
    while ((match = messageRegex.exec(content)) !== null) {
      const startLine = content.slice(0, match.index).split("\n").length;
      const fieldDetails = this.extractMessageFieldDetails(content, match.index);
      const afterMatch = content.slice(match.index);
      const closeBrace = this.findClosingBrace(afterMatch);
      const endLine = content.slice(0, match.index + closeBrace + 1).split("\n").length;

      definitions.push({
        name: match[1],
        kind: "message",
        lineRange: [startLine, endLine],
        fields: fieldDetails.map((field) => field.name),
        attributes: {
          protobuf_kind: "message",
          fields: fieldDetails,
        },
      });
    }

    // Match enum definitions
    const enumRegex = /^enum\s+(\w+)\s*\{/gm;
    while ((match = enumRegex.exec(content)) !== null) {
      const startLine = content.slice(0, match.index).split("\n").length;
      const fields = this.extractEnumValues(content, match.index);
      const afterMatch = content.slice(match.index);
      const closeBrace = this.findClosingBrace(afterMatch);
      const endLine = content.slice(0, match.index + closeBrace + 1).split("\n").length;

      definitions.push({
        name: match[1],
        kind: "enum",
        lineRange: [startLine, endLine],
        fields,
      });
    }

    return definitions;
  }

  private extractServiceMethods(content: string): EndpointInfo[] {
    const endpoints: EndpointInfo[] = [];
    const serviceRegex = /^service\s+(\w+)\s*\{/gm;
    let match;
    while ((match = serviceRegex.exec(content)) !== null) {
      const serviceName = match[1];
      const startIdx = match.index + match[0].length;
      const afterService = content.slice(match.index);
      const closeBrace = this.findClosingBrace(afterService);
      const body = afterService.slice(match[0].length, closeBrace);

      const rpcRegex = /rpc\s+(\w+)\s*\(\s*([\w.]+)\s*\)\s*returns\s*\(\s*([\w.]+)\s*\)/g;
      let rpcMatch;
      while ((rpcMatch = rpcRegex.exec(body)) !== null) {
        const lineNum = content.slice(0, startIdx + rpcMatch.index).split("\n").length;
        endpoints.push({
          method: "rpc",
          path: `${serviceName}.${rpcMatch[1]}`,
          lineRange: [lineNum, lineNum],
          attributes: {
            protocol: "grpc",
            service: serviceName,
            rpc: rpcMatch[1],
            request_type: rpcMatch[2],
            response_type: rpcMatch[3],
            request_params: [{ name: "request", in: "message", type: rpcMatch[2], required: true }],
            responses: { ok: { type: rpcMatch[3] } },
          },
        });
      }
    }
    return endpoints;
  }

  private extractMessageFields(content: string, startIdx: number): string[] {
    return this.extractMessageFieldDetails(content, startIdx).map((field) => field.name);
  }

  private extractMessageFieldDetails(content: string, startIdx: number): Array<{
    name: string;
    type: string;
    number: number;
    repeated: boolean;
    optional: boolean;
    required: boolean;
    map: boolean;
  }> {
    const details: Array<{
      name: string;
      type: string;
      number: number;
      repeated: boolean;
      optional: boolean;
      required: boolean;
      map: boolean;
    }> = [];
    const afterMsg = content.slice(startIdx);
    const openBrace = afterMsg.indexOf("{");
    if (openBrace === -1) return details;

    const closeBrace = this.findClosingBrace(afterMsg);
    const body = afterMsg.slice(openBrace + 1, closeBrace);

    const fieldRegex = /^\s*(?:(repeated|optional|required)\s+)?((?:map<[^>]+>)|[\w.]+)\s+(\w+)\s*=\s*(\d+)/gm;
    let match;
    while ((match = fieldRegex.exec(body)) !== null) {
      const [, label = "", type, name, numberText] = match;
      details.push({
        name,
        type,
        number: Number(numberText),
        repeated: label === "repeated",
        optional: label === "optional",
        required: label === "required",
        map: type.startsWith("map<"),
      });
    }

    return details;
  }

  private extractEnumValues(content: string, startIdx: number): string[] {
    const values: string[] = [];
    const afterEnum = content.slice(startIdx);
    const openBrace = afterEnum.indexOf("{");
    if (openBrace === -1) return values;

    const closeBrace = this.findClosingBrace(afterEnum);
    const body = afterEnum.slice(openBrace + 1, closeBrace);

    const valueRegex = /^\s*(\w+)\s*=/gm;
    let match;
    while ((match = valueRegex.exec(body)) !== null) {
      values.push(match[1]);
    }

    return values;
  }

  private findClosingBrace(content: string): number {
    let depth = 0;
    for (let i = 0; i < content.length; i++) {
      if (content[i] === "{") depth++;
      if (content[i] === "}") {
        depth--;
        if (depth === 0) return i;
      }
    }
    if (depth !== 0) {
      console.warn(`[protobuf-parser] Unbalanced braces detected (depth=${depth}), results may be incomplete`);
    }
    return content.length;
  }
}
