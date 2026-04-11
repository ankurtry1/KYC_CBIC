import type { Officer } from "@/lib/officers/types";
import { formatDate } from "@/lib/utils/date";

type OfficerFactsProps = {
  officer: Officer;
};

const Fact = ({ label, value }: { label: string; value: string }): JSX.Element => (
  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-3">
    <p className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
    <p className="mt-1 text-sm font-medium text-slate-800">{value}</p>
  </div>
);

export function OfficerFacts({ officer }: OfficerFactsProps): JSX.Element {
  return (
    <section className="panel p-5">
      <p className="text-label">Service Facts</p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Fact label="Date of Birth" value={formatDate(officer.dob)} />
        <Fact label="Date of Entry (Gr A)" value={formatDate(officer.date_of_entry_gr_a)} />
        <Fact label="Present-rank date" value={formatDate(officer.present_rank_date)} />
        <Fact
          label="Years in Service"
          value={officer.years_in_service != null ? `${officer.years_in_service.toFixed(1)} years` : "Unknown"}
        />
        <Fact
          label="Time to Current Rank"
          value={
            officer.years_to_current_rank != null
              ? `${officer.years_to_current_rank.toFixed(1)} years`
              : "Unknown"
          }
        />
        <Fact label="Known Timeline Entries" value={String(officer.posting_history.length)} />
      </div>
    </section>
  );
}
