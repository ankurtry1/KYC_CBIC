import Link from "next/link";
import type { Officer } from "@/lib/officers/types";
import type { RelatedOfficerCard } from "@/lib/intelligence/types";
import { InsightPanel } from "@/components/intelligence/InsightPanel";
import { ArchetypeBadge } from "@/components/intelligence/ArchetypeBadge";
import { ProfileLink } from "@/components/officers/ProfileLink";
import { buildOfficerProfileHref } from "@/lib/officers/navigation";

type RelatedOfficersProps = {
  officer: Officer;
  related: RelatedOfficerCard[];
  compact?: boolean;
  maxItems?: number;
  testId?: string;
  returnTo?: string | null;
};

export function RelatedOfficers({
  officer,
  related,
  compact = false,
  maxItems,
  testId = "related-officers-section",
  returnTo
}: RelatedOfficersProps): JSX.Element {
  const visible = related.slice(0, maxItems ?? (compact ? 3 : 8));

  return (
    <InsightPanel
      testId={testId}
      title={compact ? "Trajectory Similarity (Preview)" : "Trajectory Similarity"}
      subtitle={
        compact
          ? "People with similar progression patterns"
          : "Deterministic similarity based on batch, cadre, stations, and progression history"
      }
    >
      {related.length === 0 ? (
        <p className="text-sm text-slate-600">No close related profiles were identified from current deterministic rules.</p>
      ) : (
        <div className={compact ? "space-y-2" : "grid gap-3 md:grid-cols-2"}>
          {visible.map((item) => (
            <ProfileLink
              key={item.officer.id}
              href={buildOfficerProfileHref(item.officer.id, returnTo)}
              officerId={item.officer.id}
              className="rounded-xl border border-slate-200 bg-white px-3 py-3 transition hover:-translate-y-0.5 hover:shadow-sm"
            >
              <p className="text-sm font-semibold text-slate-800">
                {item.officer.name ?? "Name unavailable"}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">{item.officer.employee_id}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="pill">Batch {item.officer.batch ?? "NA"}</span>
                <span className="pill">{item.officer.cadre ?? "Unknown"}</span>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.reason.split(",").map((reasonPart) => (
                  <span key={`${item.officer.id}-${reasonPart}`} className="pill">
                    {reasonPart.trim()}
                  </span>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <ArchetypeBadge archetype={item.officer.career_archetype} />
                <span className="text-xs font-semibold text-accent">Match {item.score}/100</span>
              </div>
            </ProfileLink>
          ))}
        </div>
      )}

      {related.length > 0 ? (
        <p className="mt-3 text-xs text-slate-500">
          Similarity for {officer.name ?? officer.employee_id} is explainable and deterministic. It does not imply
          reporting hierarchy or command chain.
        </p>
      ) : null}

      <p className="mt-2 text-xs text-slate-500">
        <Link href="/guide/intelligence" className="text-accent hover:underline">
          Understand similarity logic
        </Link>
      </p>
    </InsightPanel>
  );
}
