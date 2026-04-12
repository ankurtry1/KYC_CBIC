import type { Officer } from "@/lib/officers/types";
import Link from "next/link";
import { InsightPanel } from "@/components/intelligence/InsightPanel";
import { officerNarrativeTitle } from "@/lib/intelligence/narratives";

type InsightNarrativeCardProps = {
  officer: Officer;
};

export function InsightNarrativeCard({ officer }: InsightNarrativeCardProps): JSX.Element {
  return (
    <InsightPanel
      testId="officer-narrative-card"
      title="What this profile suggests"
      subtitle={officerNarrativeTitle(officer)}
    >
      <p className="text-sm leading-relaxed text-slate-700">
        {officer.narrative_summary ?? "This profile has limited known data for an interpretive summary."}
      </p>
      <p className="mt-2 text-xs text-slate-500">
        <Link href="/guide/intelligence" className="text-accent hover:underline">
          Learn how this summary is derived
        </Link>
      </p>
    </InsightPanel>
  );
}
