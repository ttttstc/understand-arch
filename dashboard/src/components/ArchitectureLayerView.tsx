import { useDashboardStore } from "../store";

function text(value: unknown, fallback = "Unspecified"): string {
  return typeof value === "string" && value.trim() ? value : fallback;
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
  const profiles = archLayer.component_profiles ?? [];
  const flows = archLayer.flows ?? [];
  const hotspots = archLayer.complexity_hotspots ?? [];
  const constraints = archLayer.extension_constraints ?? [];
  const tour = [...(archLayer.tour ?? [])].sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
  const stats = [
    ["Components", profiles.length],
    ["Capabilities", capabilities.length],
    ["Flows", flows.length],
    ["Quality", qualities.length],
    ["Risks", risks.length],
    ["Hotspots", hotspots.length],
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

        <section className="bg-surface border border-border-subtle rounded-lg p-4 mb-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-accent mb-2">Architecture Style</h3>
          <div className="text-lg font-medium text-text-primary">{text(archLayer.architecture_style?.primary, "Unknown")}</div>
          <p className="text-sm text-text-secondary mt-2">{text(archLayer.architecture_style?.rationale, "No narrative available.")}</p>
        </section>

        <section className="grid lg:grid-cols-[1.1fr_0.9fr] gap-4 mb-4">
          <Panel title="Component Profiles" items={profiles} fields={["name", "role", "change_risk"]} />
          <ArchitectureTour tour={tour} capabilities={capabilities} risks={risks} />
        </section>

        <section className="grid lg:grid-cols-2 gap-4">
          <Panel title="Capabilities" items={capabilities} fields={["name", "maturity", "importance"]} />
          <Panel title="Flows" items={flows} fields={["name", "trigger", "outcome"]} />
          <Panel title="Quality Attributes" items={qualities} fields={["type", "status", "description"]} />
          <Panel title="Risks" items={risks} fields={["title", "severity", "likelihood"]} />
          <Panel title="Technical Debt" items={debt} fields={["title", "severity", "category"]} />
          <Panel title="Complexity Hotspots" items={hotspots} fields={["title", "type", "severity"]} />
          <Panel title="Extension Constraints" items={constraints} fields={["title", "constraint_type", "impact"]} />
          <Panel title="Cross Repo Edges" items={crossEdges} fields={["id", "type", "description"]} />
        </section>
      </div>
    </div>
  );
}

function ArchitectureTour({
  tour,
  capabilities,
  risks,
}: {
  tour: Array<{ order?: number; title?: string; description?: string; nodeIds?: string[] }>;
  capabilities: Array<Record<string, unknown>>;
  risks: Array<Record<string, unknown>>;
}) {
  return (
    <div className="bg-surface border border-border-subtle rounded-lg p-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-accent mb-3">Architecture Tour</h3>
      {tour.length === 0 ? (
        <p className="text-sm text-text-muted">No architecture tour available.</p>
      ) : (
        <div className="space-y-3">
          {tour.slice(0, 8).map((step, index) => (
            <div key={`${step.order ?? index}-${step.title ?? "step"}`} className="bg-elevated rounded-lg p-3 border border-border-subtle">
              <div className="flex items-start gap-3">
                <div className="font-mono text-xs text-root bg-accent rounded px-2 py-1">{step.order ?? index + 1}</div>
                <div>
                  <div className="text-sm font-medium text-text-primary">{text(step.title, "Untitled step")}</div>
                  <p className="text-xs text-text-secondary mt-1">{text(step.description, "No description.")}</p>
                  {Array.isArray(step.nodeIds) && step.nodeIds.length > 0 && (
                    <div className="text-[11px] text-text-muted mt-2 truncate">highlight: {step.nodeIds.join(", ")}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 mt-4">
        <MiniCard label="Capabilities" value={capabilities.length} />
        <MiniCard label="Risks" value={risks.length} />
      </div>
    </div>
  );
}

function MiniCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-root rounded-lg p-3 border border-border-subtle">
      <div className="font-mono text-lg text-accent">{value}</div>
      <div className="text-[11px] text-text-muted uppercase tracking-wider">{label}</div>
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
