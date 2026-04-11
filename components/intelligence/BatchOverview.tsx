import type { BatchIntelligence } from "@/lib/intelligence/types";
import { InsightPanel } from "@/components/intelligence/InsightPanel";
import { MetricPill } from "@/components/intelligence/MetricPill";

type BatchOverviewProps = {
  batch: BatchIntelligence;
};

export function BatchOverview({ batch }: BatchOverviewProps): JSX.Element {
  return (
    <InsightPanel title={`Batch ${batch.year} Overview`} subtitle={batch.quick_insight}>
      <div className="grid gap-2 sm:grid-cols-3">
        <MetricPill label="Officers" value={batch.officer_count} />
        <MetricPill label="Avg posting records" value={batch.average_timeline_entries} />
        <MetricPill label="Avg unique stations" value={batch.average_station_diversity} />
      </div>
      <p className="mt-3 text-sm text-slate-600">{batch.narrative}</p>
    </InsightPanel>
  );
}
