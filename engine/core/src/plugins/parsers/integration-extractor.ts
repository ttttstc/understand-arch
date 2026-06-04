import type { AnalyzerPlugin, StructuralAnalysis, ResourceInfo } from "../../types.js";
import { stripJsoncSyntax } from "./json-parser.js";

const SERVICE_PATTERNS: Array<{ id: string; kind: string; patterns: RegExp[] }> = [
  { id: "postgres", kind: "database", patterns: [/DATABASE_URL/i, /POSTGRES/i, /\bpg\b/i] },
  { id: "mysql", kind: "database", patterns: [/MYSQL/i, /mysql2?/i] },
  { id: "redis", kind: "cache", patterns: [/REDIS/i, /\bredis\b/i] },
  { id: "kafka", kind: "queue", patterns: [/KAFKA/i, /\bkafkajs\b/i, /\bconfluent\b/i] },
  { id: "rabbitmq", kind: "queue", patterns: [/RABBIT/i, /AMQP/i, /\bamqplib\b/i] },
  { id: "s3", kind: "storage", patterns: [/S3_/i, /AWS_BUCKET/i, /@aws-sdk\/client-s3/i] },
  { id: "stripe", kind: "payment", patterns: [/STRIPE/i, /\bstripe\b/i] },
  { id: "github", kind: "api", patterns: [/GITHUB_TOKEN/i, /api\.github\.com/i, /@octokit/i] },
  { id: "openai", kind: "api", patterns: [/OPENAI_API_KEY/i, /\bopenai\b/i] },
  { id: "sendgrid", kind: "notification", patterns: [/SENDGRID/i, /@sendgrid/i] },
];

export class IntegrationExtractor implements AnalyzerPlugin {
  name = "integration-extractor";
  languages = ["json", "jsonc", "yaml", "toml", "env", "xml", "plaintext", "openapi"];

  analyzeFile(filePath: string, content: string): StructuralAnalysis {
    const resources = this.extractResources(filePath, content);
    return { functions: [], classes: [], imports: [], exports: [], resources };
  }

  private extractResources(filePath: string, content: string): ResourceInfo[] {
    const hits = new Map<string, { configKeys: Set<string>; sdkImports: Set<string>; endpoints: Set<string>; lines: number[]; kind: string }>();
    const add = (id: string, kind: string, line: number, detail: { key?: string; sdk?: string; endpoint?: string } = {}) => {
      if (!hits.has(id)) hits.set(id, { configKeys: new Set(), sdkImports: new Set(), endpoints: new Set(), lines: [], kind });
      const hit = hits.get(id)!;
      hit.lines.push(line);
      if (detail.key) hit.configKeys.add(detail.key);
      if (detail.sdk) hit.sdkImports.add(detail.sdk);
      if (detail.endpoint) hit.endpoints.add(detail.endpoint);
    };

    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const key = line.match(/^\s*(?:export\s+)?([A-Z][A-Z0-9_]{2,})\s*[:=]/)?.[1];
      const endpoint = line.match(/https?:\/\/[^\s"',)]+/)?.[0];
      for (const service of SERVICE_PATTERNS) {
        if (service.patterns.some((pattern) => pattern.test(line))) {
          add(service.id, service.kind, i + 1, { key, endpoint });
        }
      }
    }

    for (const dep of this.extractDependencyNames(filePath, content)) {
      for (const service of SERVICE_PATTERNS) {
        if (service.patterns.some((pattern) => pattern.test(dep))) add(service.id, service.kind, 1, { sdk: dep });
      }
    }

    return [...hits.entries()].map(([id, hit]) => ({
      name: id,
      kind: "external-service",
      lineRange: [Math.min(...hit.lines), Math.max(...hit.lines)],
      attributes: {
        service_id: id,
        service_kind: hit.kind,
        config_keys: [...hit.configKeys].sort(),
        sdk_imports: [...hit.sdkImports].sort(),
        endpoints: [...hit.endpoints].sort(),
        source_file: filePath,
      },
    }));
  }

  private extractDependencyNames(filePath: string, content: string): string[] {
    const lower = filePath.toLowerCase();
    if (lower.endsWith("package.json")) {
      try {
        const parsed = JSON.parse(stripJsoncSyntax(content));
        return [
          ...Object.keys(parsed.dependencies || {}),
          ...Object.keys(parsed.devDependencies || {}),
          ...Object.keys(parsed.peerDependencies || {}),
        ];
      } catch {
        return [];
      }
    }
    if (lower.endsWith("requirements.txt")) {
      return content.split(/\r?\n/).map((line) => line.split(/[=<>~]/)[0].trim()).filter(Boolean);
    }
    if (lower.endsWith("pom.xml")) {
      return [...content.matchAll(/<artifactId>([^<]+)<\/artifactId>/g)].map((match) => match[1]);
    }
    return [];
  }
}
