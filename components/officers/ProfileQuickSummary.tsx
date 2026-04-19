import Link from "next/link";
import type { Route } from "next";
import type { Officer } from "@/lib/officers/types";
import { stationHrefFromLocation } from "@/lib/officers/navigation";
import { formatDate } from "@/lib/utils/date";
import { currentPostingSummary } from "@/lib/officers/derive";
import { sanitizeDisplayLocation } from "@/lib/officers/normalize";

type ProfileQuickSummaryProps = {
  officer: Officer;
};

export function ProfileQuickSummary({ officer }: ProfileQuickSummaryProps): JSX.Element {
  const currentLocation = sanitizeDisplayLocation(
    officer.current_posting?.station_display ?? officer.current_posting?.location
  );
  const stationHref = stationHrefFromLocation(currentLocation);
  const designationHref = officer.current_designation
    ? (`/officers?designation=${encodeURIComponent(officer.current_designation)}` as Route)
    : null;

  return (
    <section id="summary" data-testid="profile-quick-summary" className="panel p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-label">Profile Summary</p>
          <p className="mt-1 text-sm text-slate-700">{currentPostingSummary(officer)}</p>
        </div>
        <span className="pill">{officer.career_archetype}</span>
      </div>

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="font-medium text-slate-800">Cadre:</span> {officer.cadre ?? "Unknown"}
        </p>
        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="font-medium text-slate-800">Batch:</span> {officer.batch ?? "NA"}
        </p>
        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="font-medium text-slate-800">Current designation:</span>{" "}
          {designationHref ? (
            <Link href={designationHref} className="text-accent transition hover:underline">
              {officer.current_designation}
            </Link>
          ) : (
            (officer.current_designation ?? "Not available")
          )}
        </p>
        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="font-medium text-slate-800">Present-rank date:</span> {formatDate(officer.present_rank_date)}
        </p>
        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="font-medium text-slate-800">Posting records:</span> {officer.timeline_entry_count}
        </p>
        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="font-medium text-slate-800">Unique stations:</span> {officer.unique_station_count}
        </p>
        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="font-medium text-slate-800">Known service span:</span>{" "}
          {officer.known_service_span_years != null ? `${officer.known_service_span_years} years` : "Unknown"}
        </p>
        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="font-medium text-slate-800">Mobility profile:</span> {officer.mobility_profile}
        </p>
        <p className="rounded-xl border border-slate-200 bg-white px-3 py-2">
          <span className="font-medium text-slate-800">Current station:</span>{" "}
          {stationHref && currentLocation ? (
            <Link href={stationHref} className="text-accent transition hover:underline">
              {currentLocation}
            </Link>
          ) : (
            (currentLocation ?? "Not available")
          )}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {officer.batch ? (
          <Link href={`/batches/${officer.batch}` as Route} className="pill transition hover:border-accent/30 hover:text-accent">
            Explore this batch
          </Link>
        ) : null}
        {officer.cadre ? (
          <Link
            href={`/cadres/${officer.cadre.toLowerCase()}` as Route}
            className="pill transition hover:border-accent/30 hover:text-accent"
          >
            Explore this cadre
          </Link>
        ) : null}
        {stationHref && currentLocation ? (
          <Link href={stationHref} className="pill transition hover:border-accent/30 hover:text-accent">
            Open {currentLocation} context
          </Link>
        ) : (
          <span className="pill">Current station unavailable</span>
        )}
        {designationHref ? (
          <Link href={designationHref} className="pill transition hover:border-accent/30 hover:text-accent">
            Compare this designation
          </Link>
        ) : null}
        <Link href={"/career-paths" as Route} className="pill transition hover:border-accent/30 hover:text-accent">
          View career paths
        </Link>
      </div>
    </section>
  );
}
