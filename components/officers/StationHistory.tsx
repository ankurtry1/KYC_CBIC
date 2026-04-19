import Link from "next/link";
import type { Officer } from "@/lib/officers/types";
import { getStationSummary } from "@/lib/officers/derive";
import { stationHrefFromLocation } from "@/lib/officers/navigation";
import { daysToYears } from "@/lib/utils/date";
import { sanitizeDisplayLocation } from "@/lib/officers/normalize";

type StationHistoryProps = {
  officer: Officer;
};

export function StationHistory({ officer }: StationHistoryProps): JSX.Element {
  const stations = getStationSummary(officer)
    .map((entry) => ({
      ...entry,
      station: sanitizeDisplayLocation(entry.station)
    }))
    .filter((entry): entry is { station: string; postings: number; tenureDays: number } => Boolean(entry.station))
    .slice(0, 18);

  if (stations.length === 0) {
    return (
      <section data-testid="station-history-section" className="panel p-5">
        <p className="text-label">Station History</p>
        <p className="mt-2 text-sm text-slate-600">No structured station history available for this profile.</p>
      </section>
    );
  }

  const maxPostings = Math.max(...stations.map((station) => station.postings));

  return (
    <section data-testid="station-history-section" className="panel p-5">
      <div className="flex items-end justify-between gap-3">
        <p className="text-label">Station History</p>
        <p className="text-xs text-slate-500">Unique stations: {stations.length}</p>
      </div>

      <div className="mt-4 space-y-3">
        {stations.map((station) => {
          const width = Math.max(8, (station.postings / maxPostings) * 100);
          const stationHref = stationHrefFromLocation(station.station);
          return (
            <div key={station.station} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                {stationHref ? (
                  <Link href={stationHref} className="font-medium text-accent transition hover:underline">
                    {station.station}
                  </Link>
                ) : (
                  <p className="font-medium text-slate-800">{station.station}</p>
                )}
                <p className="text-slate-500">{station.postings} postings</p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent/65" style={{ width: `${width}%` }} />
              </div>
              <p className="mt-2 text-xs text-slate-500">Known tenure: {daysToYears(station.tenureDays)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
