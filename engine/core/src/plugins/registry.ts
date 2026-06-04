import type { AnalyzerPlugin, StructuralAnalysis, ImportResolution, CallGraphEntry } from "../types.js";
import { LanguageRegistry } from "../languages/language-registry.js";

/**
 * Registry for analyzer plugins. Maps languages to plugins and provides
 * a unified interface for analyzing files across languages.
 *
 * Uses LanguageRegistry for extension-to-language mapping instead of
 * a hardcoded lookup table.
 */
export class PluginRegistry {
  private plugins: AnalyzerPlugin[] = [];
  private languageMap = new Map<string, AnalyzerPlugin[]>();
  private languageRegistry: LanguageRegistry;

  constructor(languageRegistry?: LanguageRegistry) {
    this.languageRegistry = languageRegistry ?? LanguageRegistry.createDefault();
  }

  register(plugin: AnalyzerPlugin): void {
    this.plugins.push(plugin);
    for (const lang of plugin.languages) {
      const existing = this.languageMap.get(lang) ?? [];
      this.languageMap.set(lang, [...existing, plugin]);
    }
  }

  unregister(name: string): void {
    const plugin = this.plugins.find((p) => p.name === name);
    if (!plugin) return;
    this.plugins = this.plugins.filter((p) => p.name !== name);
    this.languageMap.clear();
    for (const p of this.plugins) {
      for (const lang of p.languages) {
          const existing = this.languageMap.get(lang) ?? [];
          this.languageMap.set(lang, [...existing, p]);
      }
    }
  }

  getPluginForLanguage(language: string): AnalyzerPlugin | null {
    const plugins = this.languageMap.get(language) ?? [];
    return plugins[plugins.length - 1] ?? null;
  }

  getPluginsForLanguage(language: string): AnalyzerPlugin[] {
    return [...(this.languageMap.get(language) ?? [])];
  }

  getPluginForFile(filePath: string): AnalyzerPlugin | null {
    const langConfig = this.languageRegistry.getForFile(filePath);
    if (!langConfig) return null;
    return this.getPluginForLanguage(langConfig.id);
  }

  /**
   * Get the language id for a file path using the language registry.
   */
  getLanguageForFile(filePath: string): string | null {
    return this.languageRegistry.getForFile(filePath)?.id ?? null;
  }

  analyzeFile(filePath: string, content: string): StructuralAnalysis | null {
    return this.analyzeFileAll(filePath, content);
  }

  analyzeFileAll(filePath: string, content: string): StructuralAnalysis | null {
    const langConfig = this.languageRegistry.getForFile(filePath);
    if (!langConfig) return null;
    const plugins = this.getPluginsForLanguage(langConfig.id);
    if (plugins.length === 0) return null;
    const analyses = plugins.map((plugin) => plugin.analyzeFile(filePath, content));
    return mergeAnalyses(analyses);
  }

  resolveImports(filePath: string, content: string): ImportResolution[] | null {
    const plugin = this.getPluginForFile(filePath);
    if (!plugin || !plugin.resolveImports) return null;
    return plugin.resolveImports(filePath, content);
  }

  extractCallGraph(filePath: string, content: string): CallGraphEntry[] | null {
    const plugin = this.getPluginForFile(filePath);
    if (!plugin?.extractCallGraph) return null;
    return plugin.extractCallGraph(filePath, content);
  }

  getPlugins(): AnalyzerPlugin[] {
    return [...this.plugins];
  }

  getSupportedLanguages(): string[] {
    return [...this.languageMap.keys()];
  }
}

function mergeAnalyses(analyses: StructuralAnalysis[]): StructuralAnalysis {
  return {
    functions: analyses.flatMap((analysis) => analysis.functions),
    classes: analyses.flatMap((analysis) => analysis.classes),
    imports: analyses.flatMap((analysis) => analysis.imports),
    exports: analyses.flatMap((analysis) => analysis.exports),
    sections: analyses.flatMap((analysis) => analysis.sections ?? []),
    definitions: analyses.flatMap((analysis) => analysis.definitions ?? []),
    services: analyses.flatMap((analysis) => analysis.services ?? []),
    endpoints: analyses.flatMap((analysis) => analysis.endpoints ?? []),
    steps: analyses.flatMap((analysis) => analysis.steps ?? []),
    resources: analyses.flatMap((analysis) => analysis.resources ?? []),
  };
}
