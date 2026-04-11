import Link from "next/link";
import type { Officer } from "@/lib/officers/types";
import type { RelatedOfficerCard } from "@/lib/intelligence/types";
import { InsightPanel } from "@/components/intelligence/InsightPanel";
import { ArchetypeBadge } from "@/components/intelligence/ArchetypeBadge";

type RelatedOfficersProps = {
  officer: Officer;
  related: RelatedOfficerCard[];
};

export function RelatedOfficers({ officer, related }: RelatedOfficersProps): JSX.Element {
  return (
    <InsightPanel
      testId="related-officers-section"
      title="Related Officers"
      subtitle="Similarity based on batch, cadre, stations, and progression"
    >
      {related.length === 0 ? (
        <p className="text-sm text-slate-600">No close related profiles were identified from current deterministic rules.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {related.map((item) => (
            <Link
              key={item.officer.id}
              href={`/officers/${item.officer.id}`}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-800">
                {item.officer.name ?? `Officer ${item.officer.employee_id}`}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{item.officer.employee_id}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="pill">Batch {item.officer.batch ?? "NA"}</span>
                <span className="pill">{item.officer.cadre ?? "Unknown"}</span>
              </div>
              <p className="mt-2 text-xs text-slate-600">{item.reason}</p>
              <div className="mt-2 flex items-center justify-between">
                <ArchetypeBadge archetype={item.officer.career_archetype} />
                <span className="text-xs font-semibold text-accent">Similarity {item.score}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {related.length > 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          Related profiles for {officer.name ?? officer.employee_id} are explainable and non-judgmental.
        </p>
      ) : null}
    </InsightPanel>
  );
}
