import Link from "next/link";
import type { Officer } from "@/lib/officers/types";
import { ArchetypeBadge } from "@/components/intelligence/ArchetypeBadge";

type OfficerMiniCardProps = {
  officer: Officer;
  reason?: string;
};

export function OfficerMiniCard({ officer, reason }: OfficerMiniCardProps): JSX.Element {
  return (
    <Link
      href={`/officers/${officer.id}`}
      className="rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:-translate-y-0.5 hover:shadow-sm"
    >
      <p className="text-sm font-semibold text-slate-800">{officer.name ?? `Officer ${officer.employee_id}`}</p>
      <p className="mt-0.5 text-xs text-slate-500">{officer.employee_id}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <span className="pill">Batch {officer.batch ?? "NA"}</span>
        <span className="pill">{officer.cadre ?? "Unknown"}</span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <ArchetypeBadge archetype={officer.career_archetype} />
        <span className="pill">{officer.timeline_entry_count} posting records</span>
      </div>
      {reason ? <p className="mt-2 text-xs text-slate-600">{reason}</p> : null}
    </Link>
  );
}
