import Link from "next/link";
import type { CareerPathIntelligence } from "@/lib/intelligence/types";
import { InsightPanel } from "@/components/intelligence/InsightPanel";
import { topProgressionLabel } from "@/lib/intelligence/careerPaths";

type CareerPathExplorerProps = {
  paths: CareerPathIntelligence;
};

export function CareerPathExplorer({ paths }: CareerPathExplorerProps): JSX.Element {
  return (
    <div className="space-y-5">
      <InsightPanel title="Typical Progression Ladder" subtitle="Common rank sequence context across known records">
        <div className="flex flex-wrap gap-2">
          {paths.typical_progression_ladder.map((rank, index) => (
            <div key={rank} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm">
              <span>{rank}</span>
              {index < paths.typical_progression_ladder.length - 1 ? <span className="text-slate-400">→</span> : null}
            </div>
          ))}
        </div>
      </InsightPanel>

      <InsightPanel title="Common Progressions" subtitle={`Most observed path: ${topProgressionLabel(paths)}`}>
        <div className="space-y-2">
          {paths.common_progressions.slice(0, 8).map((entry) => (
            <div key={entry.key} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-sm text-slate-700">{entry.key}</p>
              <span className="pill">{entry.count}</span>
            </div>
          ))}
        </div>
      </InsightPanel>

      <InsightPanel title="Trajectory Bands" subtitle="Fast vs steady vs deliberate progression by years to current rank">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { label: "Fast trajectories", data: paths.trajectory_bands.fast },
            { label: "Steady trajectories", data: paths.trajectory_bands.steady },
            { label: "Deliberate trajectories", data: paths.trajectory_bands.deliberate }
          ].map((band) => (
            <div key={band.label} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              <p className="text-sm font-semibold text-slate-800">{band.label}</p>
              <p className="mt-1 text-xs text-slate-500">Sample size: {band.data.sample_size}</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {band.data.sample_officer_ids.slice(0, 3).map((id) => (
                  <Link key={id} href={`/officers/${id}`} className="pill">
                    {id.replace("officer-", "")}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </InsightPanel>
    </div>
  );
}
