import Link from "next/link";
import type { Route } from "next";
import type { Officer } from "@/lib/officers/types";
import { ArchetypeBadge } from "@/components/intelligence/ArchetypeBadge";
import { DataQualityBadge } from "@/components/officers/DataQualityBadge";
import { VerificationBadge } from "@/components/officers/VerificationBadge";
import { officerDisplayName } from "@/lib/officers/derive";
import { buildOfficerProfileHref, stationHrefFromLocation } from "@/lib/officers/navigation";
import { sanitizeDisplayLocation } from "@/lib/officers/normalize";

type OfficerMiniCardProps = {
  officer: Officer;
  reason?: string;
  returnTo?: string | null;
};

export function OfficerMiniCard({ officer, reason, returnTo }: OfficerMiniCardProps): JSX.Element {
  const location = sanitizeDisplayLocation(officer.current_posting?.station_display ?? officer.current_posting?.location);
  const stationHref = stationHrefFromLocation(location);

  return (
    <article className="rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:-translate-y-0.5 hover:shadow-sm">
      <Link href={buildOfficerProfileHref(officer.id, returnTo)} className="block">
        <p className="text-sm font-semibold text-slate-800">{officerDisplayName(officer)}</p>
        <p className="mt-0.5 text-xs text-slate-500">{officer.employee_id}</p>
        <p className="mt-2 text-sm text-slate-700">{officer.current_designation ?? "Designation unavailable"}</p>
        <p className="mt-1 text-xs text-slate-500">{location ?? "Current station unavailable"}</p>
      </Link>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {officer.batch ? (
          <Link href={`/batches/${officer.batch}` as Route} className="pill transition hover:border-accent/30 hover:text-accent">
            Batch {officer.batch}
          </Link>
        ) : (
          <span className="pill">Batch NA</span>
        )}
        {officer.cadre ? (
          <Link href={`/cadres/${officer.cadre.toLowerCase()}` as Route} className="pill transition hover:border-accent/30 hover:text-accent">
            {officer.cadre}
          </Link>
        ) : (
          <span className="pill">Unknown cadre</span>
        )}
        {stationHref && location ? (
          <Link href={stationHref} className="pill transition hover:border-accent/30 hover:text-accent">
            {location}
          </Link>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <VerificationBadge flag={officer.verification_flag} />
        <DataQualityBadge label={officer.data_quality_label ?? "Needs Review"} />
        <ArchetypeBadge archetype={officer.career_archetype} />
        <span className="pill">{officer.timeline_entry_count} posting records</span>
      </div>
      {reason ? <p className="mt-2 text-xs text-slate-600">{reason}</p> : null}
    </article>
  );
}
