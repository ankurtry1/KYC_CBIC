import Link from "next/link";
import type { BatchIntelligence } from "@/lib/intelligence/types";
import { batchQuickBadge } from "@/lib/intelligence/batches";

type BatchCardProps = {
  batch: BatchIntelligence;
};

export function BatchCard({ batch }: BatchCardProps): JSX.Element {
  return (
    <Link href={`/batches/${batch.year}`} className="panel block p-5 transition hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-label">Batch</p>
          <h3 className="mt-1 text-2xl font-semibold text-slate-900">{batch.year}</h3>
        </div>
        <span className="pill">{batchQuickBadge(batch)}</span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
        <p>Officers: {batch.officer_count}</p>
        <p>Avg postings: {batch.average_timeline_entries}</p>
        <p>Avg stations: {batch.average_station_diversity}</p>
        <p>Archetypes: {batch.archetype_distribution.length}</p>
      </div>
      <p className="mt-3 text-xs text-slate-600">{batch.quick_insight}</p>
    </Link>
  );
}
