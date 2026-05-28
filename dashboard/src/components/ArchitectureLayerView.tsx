import { useDashboardStore } from "../store";

function text(value: unknown, fallback = "Unspecified"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function count(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

export default function ArchitectureLayerView() {
  const archLayer = useDashboardStore((s) => s.archLayer);

  if (!archLayer) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-root">
        <p className="text-sm text-text-muted">No architecture layer found. Run /arch-enrich first.</p>
      </div>
    );
  }

  const capabilities = archLayer.capabilities ?? [];
  const qualities = archLayer.quality_attributes ?? [];
  const risks = archLayer.risks ?? [];
  const debt = archLayer.technical_debt ?? [];
  const crossEdges = archLayer.cross_edges ?? [];
  const stats = [
    ["Capabilities", capabilities.length],
    ["Quality", qualities.length],
    ["Risks", risks.length],
    ["Debt", debt.length],
    ["Cross edges", crossEdges.length],
    ["ADRs", count(archLayer.architecture_decisions)],
  ];

  return (
    <div className="h-full w-full overflow-auto bg-root p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h2 className="font-heading text-2xl text-text-primary">Architecture Layer</h2>
          <p className="text-sm text-text-secondary mt-1">
            Capabilities, quality attributes, risks, debt, decisions, and cross-repo links projected from
            <span className="font-mono"> arch-layer.json</span>.
          </p>
        </header>

        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
          {stats.map(([label, value]) => (
            <div key={label} className="bg-surface border border-border-subtle rounded-lg p-3">
              <div className="font-mono text-2xl text-accent">{value}</div>
              <div className="text-[11px] uppercase tracking-wider text-text-muted mt-1">{label}</div>
            </div>
          ))}
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <Panel title="Capabilities" items={capabilities} fields={["name", "maturity", "importance"]} />
          <Panel title="Quality Attributes" items={qualities} fields={["type", "status", "description"]} />
          <Panel title="Risks" items={risks} fields={["title", "severity", "likelihood"]} />
          <Panel title="Technical Debt" items={debt} fields={["title", "severity", "category"]} />
        </section>
      </div>
    </div>
  );
}

function Panel({
  title,
  items,
  fields,
}: {
  title: string;
  items: Array<Record<string, unknown>>;
  fields: string[];
}) {
  return (
    <div className="bg-surface border border-border-subtle rounded-lg p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-accent mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-text-muted">No entries.</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 8).map((item, index) => (
            <div key={text(item.id, `${title}-${index}`)} className="bg-elevated rounded-lg p-3 border border-border-subtle">
              <div className="text-sm font-medium text-text-primary">{text(item[fields[0]], text(item.id))}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {fields.slice(1).map((field) => (
                  <span key={field} className="text-[11px] font-mono text-text-secondary bg-root px-2 py-1 rounded">
                    {field}: {text(item[field])}
                  </span>
                ))}
              </div>
              {Array.isArray(item.evidence_refs) && item.evidence_refs.length > 0 && (
                <div className="text-[11px] text-text-muted mt-2 truncate">
                  evidence: {item.evidence_refs.join(", ")}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
