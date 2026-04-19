import Link from "next/link";
import type { Route } from "next";
import { ArrowUpRight, Briefcase, Hash, MapPin } from "lucide-react";
import type { OfficerIndexRecord } from "@/lib/officers/types";
import type { OfficerSearchMatch } from "@/lib/officers/search";
import { officerDisplayName } from "@/lib/officers/derive";
import { sanitizeDisplayLocation } from "@/lib/officers/normalize";
import { buildOfficerProfileHref, stationHrefFromLocation } from "@/lib/officers/navigation";
import { createShortlistEntryFromIndex } from "@/lib/officers/shortlist";
import { DataQualityBadge } from "@/components/officers/DataQualityBadge";
import { ShortlistButton } from "@/components/officers/ShortlistButton";
import { VerificationBadge } from "@/components/officers/VerificationBadge";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils/cn";

type OfficerCardProps = {
  officer: OfficerIndexRecord;
  match?: OfficerSearchMatch | null;
  returnTo?: string | null;
  isPriorityMatch?: boolean;
};

export function OfficerCard({
  officer,
  match,
  returnTo,
  isPriorityMatch = false
}: OfficerCardProps): JSX.Element {
  const location = sanitizeDisplayLocation(officer.current_location);
  const stationHref = stationHrefFromLocation(location);
  const profileHref = buildOfficerProfileHref(officer.id, returnTo);
  const shortlistEntry = createShortlistEntryFromIndex(officer);

  return (
    <article
      className={cn(
        "panel relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-elevated",
        isPriorityMatch ? "border-accent/35 shadow-elevated" : ""
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent/80 via-gold/70 to-accent/40 opacity-80" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <VerificationBadge flag={officer.verification_flag} />
          <DataQualityBadge label={officer.data_quality_label} />
          {match?.primaryLabel ? (
            <span
              data-testid="officer-card-match-cue"
              className="inline-flex items-center rounded-full border border-accent/20 bg-accentSoft px-2.5 py-1 text-xs font-semibold text-accent"
            >
              {match.primaryLabel}
            </span>
          ) : null}
        </div>
        <ShortlistButton entry={shortlistEntry} compact />
      </div>

      <Link
        data-testid="officer-card"
        data-officer-id={officer.id}
        data-employee-id={officer.employee_id}
        data-cadre={officer.cadre ?? ""}
        data-timeline-quality={officer.timeline_quality}
        href={profileHref}
        className="group mt-4 block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p data-testid="officer-card-name" className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
              {officerDisplayName(officer)}
            </p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500">
              <Hash className="h-3.5 w-3.5" />
              <span data-testid="officer-card-employee-id">{officer.employee_id}</span>
            </p>
          </div>

          <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-accent" />
        </div>

        <div className="mt-3 space-y-1.5 text-sm">
          <p className="inline-flex items-center gap-2 text-slate-700">
            <Briefcase className="h-4 w-4 text-accent/70" />
            {officer.current_designation ?? "Designation unavailable"}
          </p>
          <p className="inline-flex items-center gap-2 text-slate-600">
            <MapPin className="h-4 w-4 text-slate-400" />
            {location ?? "Posting details partially inferred"}
          </p>
          <p className="text-xs text-slate-500">Present-rank date: {formatDate(officer.present_rank_date)}</p>
        </div>

        <p className="mt-3 text-xs font-medium text-accent/80 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
          Open profile
        </p>
      </Link>

      <div className="mt-4 flex flex-wrap gap-2">
        {officer.cadre ? (
          <Link href={`/cadres/${officer.cadre.toLowerCase()}` as Route} className="pill transition hover:border-accent/30 hover:text-accent">
            Cadre {officer.cadre}
          </Link>
        ) : (
          <span className="pill">Cadre Unknown</span>
        )}
        {officer.batch ? (
          <Link href={`/batches/${officer.batch}` as Route} className="pill transition hover:border-accent/30 hover:text-accent">
            Batch {officer.batch}
          </Link>
        ) : (
          <span className="pill">Batch NA</span>
        )}
        {stationHref && location ? (
          <Link href={stationHref} className="pill transition hover:border-accent/30 hover:text-accent">
            Station {location}
          </Link>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="pill">{officer.timeline_entry_count} posting records</span>
        {match?.cues?.slice(1).map((cue) => (
          <span key={cue} className="pill">
            {cue}
          </span>
        ))}
      </div>
    </article>
  );
}
