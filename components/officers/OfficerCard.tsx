import Link from "next/link";
import { ArrowUpRight, Briefcase, Hash, MapPin } from "lucide-react";
import type { OfficerIndexRecord } from "@/lib/officers/types";
import { DataQualityBadge } from "@/components/officers/DataQualityBadge";
import { VerificationBadge } from "@/components/officers/VerificationBadge";
import { formatDate } from "@/lib/utils/date";
import { titleCase } from "@/lib/utils/format";
import { sanitizeDisplayLocation } from "@/lib/officers/normalize";

type OfficerCardProps = {
  officer: OfficerIndexRecord;
};

export function OfficerCard({ officer }: OfficerCardProps): JSX.Element {
  const location = sanitizeDisplayLocation(officer.current_location);

  return (
    <Link
      data-testid="officer-card"
      data-officer-id={officer.id}
      data-employee-id={officer.employee_id}
      data-cadre={officer.cadre ?? ""}
      data-timeline-quality={officer.timeline_quality}
      href={`/officers/${officer.id}`}
      className="group panel relative block cursor-pointer overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent/80 via-gold/70 to-accent/40 opacity-80" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <p data-testid="officer-card-name" className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            {officer.name ?? `Officer ${officer.employee_id}`}
          </p>
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500">
            <Hash className="h-3.5 w-3.5" />
            <span data-testid="officer-card-employee-id">{officer.employee_id}</span>
          </p>
        </div>

        <ArrowUpRight className="h-4 w-4 text-slate-300 transition group-hover:text-accent" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="pill">Cadre {officer.cadre ?? "Unknown"}</span>
        <span className="pill">Batch {officer.batch ?? "NA"}</span>
      </div>

      <div className="mt-3 space-y-1.5 text-sm">
        <p className="inline-flex items-center gap-2 text-slate-700">
          <Briefcase className="h-4 w-4 text-accent/70" />
          {officer.current_designation ?? "Designation unavailable"}
        </p>
        <p className="inline-flex items-center gap-2 text-slate-600">
          <MapPin className="h-4 w-4 text-slate-400" />
          {titleCase(location ?? "Posting details partially inferred")}
        </p>
        <p className="text-xs text-slate-500">Present-rank date: {formatDate(officer.present_rank_date)}</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <VerificationBadge flag={officer.verification_flag} />
        <DataQualityBadge label={officer.data_quality_label} />
        <span className="pill">{officer.timeline_richness_score} posting records</span>
      </div>

      <p className="mt-3 text-xs font-medium text-accent/80 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
        Open profile
      </p>
    </Link>
  );
}
