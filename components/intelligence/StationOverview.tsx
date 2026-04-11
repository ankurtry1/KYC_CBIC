import type { StationIntelligence } from "@/lib/intelligence/types";
import { InsightPanel } from "@/components/intelligence/InsightPanel";
import { MetricPill } from "@/components/intelligence/MetricPill";

type StationOverviewProps = {
  station: StationIntelligence;
};

export function StationOverview({ station }: StationOverviewProps): JSX.Element {
  return (
    <InsightPanel title={`${station.name} Station Intelligence`} subtitle={station.importance_label}>
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricPill label="Linked officers" value={station.officer_count} />
        <MetricPill label="Posting frequency" value={station.posting_frequency} />
        <MetricPill
          label="Avg postings among linked officers"
          value={station.average_timeline_entries_for_linked_officers}
        />
      </div>
      <p className="mt-3 text-sm text-slate-600">{station.narrative}</p>
    </InsightPanel>
  );
}
