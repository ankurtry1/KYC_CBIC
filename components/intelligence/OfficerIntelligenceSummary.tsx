import type { Officer } from "@/lib/officers/types";
import { InsightPanel } from "@/components/intelligence/InsightPanel";
import { MetricPill } from "@/components/intelligence/MetricPill";
import { ArchetypeBadge } from "@/components/intelligence/ArchetypeBadge";

type OfficerIntelligenceSummaryProps = {
  officer: Officer;
};

export function OfficerIntelligenceSummary({ officer }: OfficerIntelligenceSummaryProps): JSX.Element {
  const summary = officer.insight_summary;

  if (!summary) return <></>;

  return (
    <InsightPanel
      testId="officer-intelligence-summary"
      title="Officer Intelligence Summary"
      subtitle="Deterministic interpretation from known records"
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <MetricPill label="Posting records" value={summary.posting_records} />
        <MetricPill label="Unique stations" value={summary.unique_stations_served} />
        <MetricPill
          label="Known service span"
          value={summary.known_service_span_years != null ? `${summary.known_service_span_years} years` : "Unknown"}
        />
        <MetricPill
          label="Years to current rank"
          value={summary.years_to_current_rank != null ? `${summary.years_to_current_rank} years` : "Unknown"}
        />
        <MetricPill label="Mobility profile" value={summary.mobility_profile} />
        <MetricPill label="Timeline richness" value={summary.timeline_richness_label} />
        <MetricPill label="Exposure breadth" value={summary.probable_exposure_breadth} />
        <MetricPill label="Similar officers" value={summary.similar_officers_count} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Career archetype</span>
        <ArchetypeBadge archetype={summary.likely_career_archetype} />
      </div>
      <p className="mt-2 text-sm text-slate-600">{officer.career_archetype_reason}</p>
    </InsightPanel>
  );
}
