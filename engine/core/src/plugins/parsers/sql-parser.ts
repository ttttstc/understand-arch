import type { AnalyzerPlugin, StructuralAnalysis, DefinitionInfo } from "../../types.js";

/**
 * Parses SQL files to extract table, view, and index definitions.
 * Handles CREATE TABLE, CREATE VIEW, CREATE INDEX with IF NOT EXISTS and OR REPLACE variants.
 * Does not handle stored procedures, triggers, or schema-qualified names (e.g., public.users).
 */
export class SQLParser implements AnalyzerPlugin {
  name = "sql-parser";
  languages = ["sql"];

  analyzeFile(_filePath: string, content: string): StructuralAnalysis {
    const definitions = this.extractDefinitions(content);
    return {
      functions: [],
      classes: [],
      imports: [],
      exports: [],
      definitions,
    };
  }

  private extractDefinitions(content: string): DefinitionInfo[] {
    const definitions: DefinitionInfo[] = [];

    // Match CREATE TABLE statements
    const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|")?(\w+)(?:`|")?/gi;
    let match;
    while ((match = tableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const startLine = content.slice(0, match.index).split("\n").length;

      const tableDetails = this.extractTableDetails(content, match.index);

      // Find the end of the CREATE TABLE statement
      const afterMatch = content.slice(match.index);
      const endParen = afterMatch.indexOf(");");
      const endLine = endParen !== -1
        ? content.slice(0, match.index + endParen + 2).split("\n").length
        : startLine + 5;

      definitions.push({
        name: tableName,
        kind: "table",
        lineRange: [startLine, endLine],
        fields: tableDetails.columns.map((column) => column.name),
        attributes: {
          sql_kind: "table",
          columns: tableDetails.columns,
          primary_key: tableDetails.primary_key,
          foreign_keys: tableDetails.foreign_keys,
          indexes: [],
        },
      });
    }

    // Match CREATE VIEW
    const viewRegex = /CREATE\s+(?:OR\s+REPLACE\s+)?VIEW\s+(?:`|")?(\w+)(?:`|")?/gi;
    while ((match = viewRegex.exec(content)) !== null) {
      const startLine = content.slice(0, match.index).split("\n").length;
      definitions.push({
        name: match[1],
        kind: "view",
        lineRange: [startLine, startLine],
        fields: [],
      });
    }

    // Match CREATE INDEX
    const indexRegex = /CREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|")?(\w+)(?:`|")?/gi;
    while ((match = indexRegex.exec(content)) !== null) {
      const startLine = content.slice(0, match.index).split("\n").length;
      definitions.push({
        name: match[1],
        kind: "index",
        lineRange: [startLine, startLine],
        fields: this.extractIndexColumns(content, match.index),
        attributes: {
          sql_kind: "index",
          unique: /^CREATE\s+UNIQUE/i.test(match[0]),
          columns: this.extractIndexColumns(content, match.index),
          table: this.extractIndexTable(content, match.index),
        },
      });
    }

    return definitions;
  }

  private extractColumns(content: string, startIdx: number): string[] {
    return this.extractTableDetails(content, startIdx).columns.map((column) => column.name);
  }

  private extractTableDetails(content: string, startIdx: number): {
    columns: Array<{ name: string; type: string; nullable: boolean; default?: string }>;
    primary_key: string[];
    foreign_keys: Array<{ columns: string[]; references: string; referenced_columns: string[] }>;
  } {
    const empty = { columns: [], primary_key: [], foreign_keys: [] };
    const afterCreate = content.slice(startIdx);
    const openParen = afterCreate.indexOf("(");
    if (openParen === -1) return empty;

    const closeParen = afterCreate.indexOf(");", openParen);
    if (closeParen === -1) return empty;

    const body = afterCreate.slice(openParen + 1, closeParen);
    const lines = this.splitSqlList(body);
    const columns: Array<{ name: string; type: string; nullable: boolean; default?: string }> = [];
    const primaryKey = new Set<string>();
    const foreignKeys: Array<{ columns: string[]; references: string; referenced_columns: string[] }> = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const pkMatch = trimmed.match(/^(?:CONSTRAINT\s+\w+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        for (const col of this.parseColumnList(pkMatch[1])) primaryKey.add(col);
        continue;
      }
      const fkMatch = trimmed.match(/^(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+([`"]?\w+[`"]?)\s*\(([^)]+)\)/i);
      if (fkMatch) {
        foreignKeys.push({
          columns: this.parseColumnList(fkMatch[1]),
          references: this.stripQuote(fkMatch[2]),
          referenced_columns: this.parseColumnList(fkMatch[3]),
        });
        continue;
      }
      if (/^(UNIQUE|CHECK|CONSTRAINT|INDEX|KEY)/i.test(trimmed)) continue;
      const colMatch = trimmed.match(/^(?:`|")?(\w+)(?:`|")?\s+(.+)$/);
      if (colMatch) {
        const [, name, rest] = colMatch;
        const type = this.extractColumnType(rest);
        if (/\bPRIMARY\s+KEY\b/i.test(rest)) primaryKey.add(name);
        columns.push({
          name,
          type,
          nullable: !/\bNOT\s+NULL\b/i.test(rest) && !/\bPRIMARY\s+KEY\b/i.test(rest),
          default: rest.match(/\bDEFAULT\s+([^,\s]+)/i)?.[1],
        });
      }
    }

    return { columns, primary_key: [...primaryKey], foreign_keys: foreignKeys };
  }

  private splitSqlList(body: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let current = "";
    for (const ch of body) {
      if (ch === "(") depth++;
      if (ch === ")") depth = Math.max(0, depth - 1);
      if (ch === "," && depth === 0) {
        parts.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
    if (current.trim()) parts.push(current);
    return parts;
  }

  private parseColumnList(value: string): string[] {
    return value.split(",").map((part) => this.stripQuote(part.trim())).filter(Boolean);
  }

  private stripQuote(value: string): string {
    return value.replace(/^[`"]|[`"]$/g, "");
  }

  private extractColumnType(rest: string): string {
    return rest
      .replace(/\bPRIMARY\s+KEY\b.*$/i, "")
      .replace(/\bNOT\s+NULL\b.*$/i, "")
      .replace(/\bNULL\b.*$/i, "")
      .replace(/\bDEFAULT\b.*$/i, "")
      .replace(/\bUNIQUE\b.*$/i, "")
      .trim();
  }

  private extractIndexColumns(content: string, startIdx: number): string[] {
    const match = content.slice(startIdx).match(/\bON\s+[`"]?\w+[`"]?\s*\(([^)]+)\)/i);
    return match ? this.parseColumnList(match[1]) : [];
  }

  private extractIndexTable(content: string, startIdx: number): string | undefined {
    const match = content.slice(startIdx).match(/\bON\s+([`"]?\w+[`"]?)\s*\(/i);
    return match ? this.stripQuote(match[1]) : undefined;
  }
}
