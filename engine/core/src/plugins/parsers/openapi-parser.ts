import type { AnalyzerPlugin, StructuralAnalysis, EndpointInfo, DefinitionInfo } from "../../types.js";
import { stripJsoncSyntax } from "./json-parser.js";

const HTTP_METHODS = new Set(["get", "put", "post", "delete", "patch", "options", "head", "trace"]);

export class OpenAPIParser implements AnalyzerPlugin {
  name = "openapi-parser";
  languages = ["openapi"];

  analyzeFile(_filePath: string, content: string): StructuralAnalysis {
    const doc = parseStructured(content);
    if (!doc || typeof doc !== "object" || !("openapi" in doc || "swagger" in doc)) {
      return empty();
    }
    return {
      ...empty(),
      endpoints: this.extractEndpoints(doc as Record<string, unknown>, content),
      definitions: this.extractSchemas(doc as Record<string, unknown>, content),
    };
  }

  private extractEndpoints(doc: Record<string, unknown>, content: string): EndpointInfo[] {
    const paths = objectValue(doc.paths);
    const endpoints: EndpointInfo[] = [];
    for (const [path, pathItemRaw] of Object.entries(paths)) {
      const pathItem = objectValue(pathItemRaw);
      for (const [method, operationRaw] of Object.entries(pathItem)) {
        if (!HTTP_METHODS.has(method.toLowerCase())) continue;
        const operation = objectValue(operationRaw);
        const params = [
          ...arrayValue(pathItem.parameters),
          ...arrayValue(operation.parameters),
        ].map((param) => normalizeParameter(param));
        const requestBody = normalizeRequestBody(operation.requestBody);
        const responses = normalizeResponses(operation.responses);
        endpoints.push({
          method: method.toUpperCase(),
          path,
          lineRange: [lineOf(content, path), lineOf(content, path)],
          attributes: {
            protocol: "http",
            source: "openapi",
            http_method: method.toUpperCase(),
            path,
            operation: stringValue(operation.operationId),
            request_params: params,
            request_body: requestBody,
            responses,
            auth_required: hasSecurity(operation) || hasSecurity(doc),
          },
        });
      }
    }
    return endpoints;
  }

  private extractSchemas(doc: Record<string, unknown>, content: string): DefinitionInfo[] {
    const schemas = objectValue(objectValue(doc.components).schemas);
    return Object.entries(schemas).map(([name, raw]) => {
      const schema = objectValue(raw);
      const fields = Object.keys(objectValue(schema.properties));
      return {
        name,
        kind: "type",
        lineRange: [lineOf(content, name), lineOf(content, name)],
        fields,
        attributes: {
          openapi_kind: "schema",
          type: stringValue(schema.type) || "object",
          required: arrayValue(schema.required).map(String),
          fields: Object.entries(objectValue(schema.properties)).map(([fieldName, fieldRaw]) => ({
            name: fieldName,
            type: stringValue(objectValue(fieldRaw).type) || stringValue(objectValue(fieldRaw).$ref) || "unknown",
            required: arrayValue(schema.required).includes(fieldName),
          })),
        },
      };
    });
  }
}

function empty(): StructuralAnalysis {
  return { functions: [], classes: [], imports: [], exports: [] };
}

function parseStructured(content: string): unknown {
  try {
    return JSON.parse(stripJsoncSyntax(content));
  } catch {
    return parseSimpleYaml(content);
  }
}

function parseSimpleYaml(content: string): Record<string, unknown> | null {
  const lines = content.split(/\r?\n/);
  if (!lines.some((line) => /^\s*openapi\s*:|^\s*swagger\s*:/.test(line))) return null;
  const doc: Record<string, unknown> = { paths: {}, components: { schemas: {} } };
  let currentPath = "";
  let currentMethod = "";
  for (const line of lines) {
    const pathMatch = line.match(/^\s{2}(["']?\/[^:'"]+["']?)\s*:/);
    if (pathMatch) {
      currentPath = stripQuotes(pathMatch[1]);
      objectValue(doc.paths)[currentPath] = {};
      currentMethod = "";
      continue;
    }
    const methodMatch = line.match(/^\s{4}(get|put|post|delete|patch|options|head|trace)\s*:/i);
    if (methodMatch && currentPath) {
      currentMethod = methodMatch[1].toLowerCase();
      objectValue(objectValue(doc.paths)[currentPath])[currentMethod] = {};
      continue;
    }
    const opMatch = line.match(/^\s{6}operationId\s*:\s*(.+)$/);
    if (opMatch && currentPath && currentMethod) {
      objectValue(objectValue(objectValue(doc.paths)[currentPath])[currentMethod]).operationId = stripQuotes(opMatch[1].trim());
    }
  }
  return doc;
}

function normalizeParameter(value: unknown): Record<string, unknown> {
  const param = objectValue(value);
  const schema = objectValue(param.schema);
  return {
    name: stringValue(param.name),
    in: stringValue(param.in) || "unknown",
    required: Boolean(param.required),
    type: stringValue(schema.type) || stringValue(schema.$ref) || "unknown",
    description: stringValue(param.description),
  };
}

function normalizeRequestBody(value: unknown): Record<string, unknown> | undefined {
  const body = objectValue(value);
  if (Object.keys(body).length === 0) return undefined;
  return {
    required: Boolean(body.required),
    content_types: Object.keys(objectValue(body.content)),
  };
}

function normalizeResponses(value: unknown): Record<string, unknown> {
  const responses = objectValue(value);
  return Object.fromEntries(Object.entries(responses).map(([status, raw]) => [
    status,
    {
      description: stringValue(objectValue(raw).description),
      content_types: Object.keys(objectValue(objectValue(raw).content)),
    },
  ]));
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function hasSecurity(value: Record<string, unknown>): boolean {
  return Array.isArray(value.security) && value.security.length > 0;
}

function lineOf(content: string, needle: string): number {
  const index = content.indexOf(needle);
  return index === -1 ? 1 : content.slice(0, index).split(/\r?\n/).length;
}

function stripQuotes(value: string): string {
  return value.replace(/^['"]|['"]$/g, "");
}
