import Link from "next/link";
import type { StationIntelligence } from "@/lib/intelligence/types";
import { stationImportanceColor } from "@/lib/intelligence/stations";
import { cn } from "@/lib/utils/cn";

type StationCardProps = {
  station: StationIntelligence;
};

export function StationCard({ station }: StationCardProps): JSX.Element {
  return (
    <Link href={`/stations/${station.slug}`} className="panel block p-5 transition hover:-translate-y-0.5 hover:shadow-elevated">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-semibold text-slate-900">{station.name}</h3>
        <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", stationImportanceColor(station.importance_label))}>
          {station.importance_label}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-slate-700">
        <p>Officers: {station.officer_count}</p>
        <p>Posting records: {station.posting_frequency}</p>
      </div>
      <p className="mt-2 text-xs text-slate-600">{station.narrative}</p>
    </Link>
  );
}
