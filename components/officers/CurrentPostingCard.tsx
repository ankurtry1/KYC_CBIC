import { Building2, CalendarClock, MapPin, ShieldAlert } from "lucide-react";
import type { Officer } from "@/lib/officers/types";
import { confidenceLabel } from "@/lib/utils/format";
import { formatDate } from "@/lib/utils/date";

type CurrentPostingCardProps = {
  officer: Officer;
};

export function CurrentPostingCard({ officer }: CurrentPostingCardProps): JSX.Element {
  const posting = officer.current_posting;
  const isInferred = !posting?.organization_unit_name || !posting?.location;

  return (
    <section data-testid="current-posting-card" className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-label">Current Posting</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            {posting?.designation ?? officer.current_designation ?? "Current role not available"}
          </h2>
        </div>

        <span className="pill">Confidence {confidenceLabel(posting?.confidence)}</span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-slate-700">
        <p className="inline-flex items-center gap-2">
          <Building2 className="h-4 w-4 text-accent/80" />
          {posting?.organization_unit_name ?? "Organization unit not available"}
        </p>
        <p className="inline-flex items-center gap-2">
          <MapPin className="h-4 w-4 text-accent/80" />
          {posting?.location ?? "Location not available"}
        </p>
        <p className="inline-flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-accent/80" />
          Start date: {formatDate(posting?.start_date)}
        </p>
      </div>

      {isInferred ? (
        <p className="mt-4 inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
          <ShieldAlert className="h-3.5 w-3.5" />
          Inferred current posting. Partial posting data available.
        </p>
      ) : null}
    </section>
  );
}
