import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { StationOverview } from "@/components/intelligence/StationOverview";
import { OfficerMiniCard } from "@/components/intelligence/OfficerMiniCard";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { getOfficersByIds, getStationBySlug } from "@/lib/officers/load";

type StationDetailPageProps = {
  params: {
    slug: string;
  };
};

function EntryList({
  title,
  entries
}: {
  title: string;
  entries: Array<{ key: string; count: number }>;
}): JSX.Element {
  return (
    <article className="panel p-5">
      <p className="text-label">{title}</p>
      <div className="mt-3 space-y-2">
        {entries.length === 0 ? (
          <p className="text-sm text-slate-500">No records available.</p>
        ) : (
          entries.map((entry) => (
            <div key={`${title}-${entry.key}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
              <p className="text-sm text-slate-700">{entry.key}</p>
              <span className="pill">{entry.count}</span>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

export default async function StationDetailPage({ params }: StationDetailPageProps): Promise<JSX.Element> {
  const station = await getStationBySlug(params.slug);
  if (!station) notFound();

  const notableOfficers = await getOfficersByIds(station.notable_officer_ids);

  return (
    <main data-testid="station-detail-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 md:px-8 md:py-8">
        <Link
          href="/stations"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to stations
        </Link>

        <StationOverview station={station} />

        <section className="grid gap-4 xl:grid-cols-2">
          <EntryList title="Common designations" entries={station.common_designations.slice(0, 8)} />
          <EntryList title="Frequent batches" entries={station.frequent_batches.slice(0, 8)} />
        </section>

        <section className="panel p-5">
          <p className="text-label">Movement Corridors</p>
          {station.movement_corridors.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No strong corridor pattern is available for this station.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {station.movement_corridors.slice(0, 8).map((corridor, index) => (
                <div key={`${corridor.from}-${corridor.to}-${index}`} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <p className="text-sm text-slate-700">
                    {corridor.from} → {corridor.to}
                  </p>
                  <span className="pill">{corridor.count}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel p-5">
          <p className="text-label">Notable Officers</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Explore officers linked to this station</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {notableOfficers.slice(0, 8).map((officer) => (
              <OfficerMiniCard key={officer.id} officer={officer} />
            ))}
          </div>
        </section>

        <section className="panel p-5">
          <p className="text-label">Related Stations</p>
          {station.related_stations.length === 0 ? (
            <p className="mt-2 text-sm text-slate-600">No related station links are currently available.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {station.related_stations.slice(0, 8).map((entry) => (
                <Link key={entry.slug} href={`/stations/${entry.slug}`} className="pill">
                  {entry.station} ({entry.count})
                </Link>
              ))}
            </div>
          )}
        </section>

        <RecommendationStrip
          testId="station-detail-recommendation-strip"
          items={[
            {
              title: "Explore officers from this station",
              description: "Open filtered officer profiles linked to this institutional node.",
              href: "/officers"
            },
            {
              title: "View common designation mix",
              description: "Compare role concentration with cadre and batch patterns.",
              href: "/cadres"
            },
            {
              title: "Compare batches",
              description: "Review which cohorts are most represented in this station.",
              href: "/batches"
            },
            {
              title: "Return to guided discovery",
              description: "Continue with structured journey entry points.",
              href: "/discover"
            }
          ]}
        />
      </section>
    </main>
  );
}
