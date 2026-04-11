import type { CadreIntelligence } from "@/lib/intelligence/types";
import { InsightPanel } from "@/components/intelligence/InsightPanel";
import { MetricPill } from "@/components/intelligence/MetricPill";

type CadreOverviewProps = {
  cadre: CadreIntelligence;
};

export function CadreOverview({ cadre }: CadreOverviewProps): JSX.Element {
  return (
    <InsightPanel title={`${cadre.cadre} Cadre Overview`} subtitle={cadre.distinctiveness}>
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricPill label="Officer count" value={cadre.officer_count} />
        <MetricPill label="Avg posting records" value={cadre.average_timeline_entries} />
        <MetricPill label="Archetypes" value={cadre.archetype_distribution.length} />
      </div>
    </InsightPanel>
  );
}
