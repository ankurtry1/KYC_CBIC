import Link from "next/link";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { CompareToolbar } from "@/components/officers/CompareToolbar";
import { DataQualityBadge } from "@/components/officers/DataQualityBadge";
import { VerificationBadge } from "@/components/officers/VerificationBadge";
import { buildOfficerProfileHref } from "@/lib/officers/navigation";
import {
  buildShortlistSummary,
  createShortlistEntryFromOfficer,
  MAX_COMPARE_OFFICERS
} from "@/lib/officers/shortlist";
import { currentPostingSummary, officerDisplayName } from "@/lib/officers/derive";
import { getOfficersByIds } from "@/lib/officers/load";

type ComparePageProps = {
  searchParams?: {
    ids?: string;
  };
};

function parseCompareIds(value: string | undefined): string[] {
  if (!value) return [];

  return [...new Set(value.split(",").map((id) => id.trim()).filter(Boolean))].slice(0, MAX_COMPARE_OFFICERS);
}

export default async function ComparePage({ searchParams }: ComparePageProps): Promise<JSX.Element> {
  const ids = parseCompareIds(searchParams?.ids);
  const comparePath = ids.length > 0 ? `/compare?ids=${ids.join(",")}` : "/compare";
  const officers = ids.length > 0 ? await getOfficersByIds(ids) : [];
  const summary = buildShortlistSummary(officers.map(createShortlistEntryFromOfficer));

  const rows: Array<{
    label: string;
    values: string[];
  }> = [
    {
      label: "Current posting",
      values: officers.map((officer) => currentPostingSummary(officer))
    },
    {
      label: "Current designation",
      values: officers.map((officer) => officer.current_designation ?? "Not available")
    },
    {
      label: "Current station",
      values: officers.map(
        (officer) => officer.current_posting?.station_display ?? officer.current_posting?.location ?? "Not available"
      )
    },
    {
      label: "Batch",
      values: officers.map((officer) => String(officer.batch ?? "NA"))
    },
    {
      label: "Cadre",
      values: officers.map((officer) => officer.cadre ?? "Unknown")
    },
    {
      label: "Timeline richness",
      values: officers.map((officer) => officer.data_quality?.timeline_quality ?? "minimal")
    },
    {
      label: "Posting records",
      values: officers.map((officer) => String(officer.timeline_entry_count))
    },
    {
      label: "Unique stations",
      values: officers.map((officer) => String(officer.unique_station_count))
    },
    {
      label: "Mobility profile",
      values: officers.map((officer) => officer.mobility_profile)
    },
    {
      label: "Known service span",
      values: officers.map((officer) =>
        officer.known_service_span_years != null ? `${officer.known_service_span_years} years` : "Unknown"
      )
    },
    {
      label: "Years to current rank",
      values: officers.map((officer) =>
        officer.years_to_current_rank != null ? `${officer.years_to_current_rank} years` : "Unknown"
      )
    },
    {
      label: "Career archetype",
      values: officers.map((officer) => officer.career_archetype)
    },
    {
      label: "Dominant stations",
      values: officers.map((officer) => officer.dominant_stations.slice(0, 4).join(", ") || "Not available")
    },
    {
      label: "Related officers",
      values: officers.map((officer) => String(officer.related_officer_ids.length))
    }
  ];

  return (
    <main data-testid="compare-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 md:px-8 md:py-8">
        <div className="panel bg-mesh-soft p-6">
          <p className="text-label">Compare</p>
          <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Officer comparison view</h1>
              <p className="mt-2 max-w-3xl text-sm text-slate-700">
                Compare up to {MAX_COMPARE_OFFICERS} officers across current posting, cadre, batch, mobility, timeline
                richness, archetype, and data quality. This view is URL-based and shareable.
              </p>
            </div>
            {officers.length >= 2 ? <CompareToolbar ids={officers.map((officer) => officer.id)} summary={summary} /> : null}
          </div>
        </div>

        {officers.length < 2 ? (
          <div className="panel p-10 text-center">
            <p className="font-medium text-slate-800">Select at least two officers to compare.</p>
            <p className="mt-1 text-sm text-slate-500">
              Use the shortlist button from the directory or a profile page, then open compare from the shortlist drawer.
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <Link href="/officers" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0b3f4d]">
                Open directory
              </Link>
              <Link href="/" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50">
                Go home
              </Link>
            </div>
          </div>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {officers.map((officer) => (
                <article key={officer.id} className="panel p-5">
                  <p className="text-label">Officer</p>
                  <Link
                    href={buildOfficerProfileHref(officer.id, comparePath)}
                    className="mt-1 block text-xl font-semibold tracking-tight text-slate-900 transition hover:text-accent"
                  >
                    {officerDisplayName(officer)}
                  </Link>
                  <p className="mt-1 text-sm text-slate-500">{officer.employee_id}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <VerificationBadge flag={officer.verification_flag} />
                    <DataQualityBadge label={officer.data_quality_label ?? "Needs Review"} />
                    <span className="pill">Batch {officer.batch ?? "NA"}</span>
                    <span className="pill">{officer.cadre ?? "Unknown"}</span>
                  </div>
                </article>
              ))}
            </section>

            <section className="panel overflow-hidden p-0">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                        Field
                      </th>
                      {officers.map((officer) => (
                        <th
                          key={officer.id}
                          className="min-w-[220px] px-4 py-3 text-left text-sm font-semibold text-slate-800"
                        >
                          {officerDisplayName(officer)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.label} className="border-b border-slate-200 last:border-b-0">
                        <th className="bg-slate-50/40 px-4 py-3 text-left text-sm font-medium text-slate-700">
                          {row.label}
                        </th>
                        {row.values.map((value, index) => (
                          <td key={`${row.label}-${officers[index]?.id}`} className="px-4 py-3 text-sm text-slate-700">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </section>
    </main>
  );
}
