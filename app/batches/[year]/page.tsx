import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { BatchOverview } from "@/components/intelligence/BatchOverview";
import { OfficerMiniCard } from "@/components/intelligence/OfficerMiniCard";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { getBatchByYear, getOfficersByIds } from "@/lib/officers/load";

type BatchDetailPageProps = {
  params: {
    year: string;
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

export default async function BatchDetailPage({ params }: BatchDetailPageProps): Promise<JSX.Element> {
  const year = Number(params.year);
  if (!Number.isFinite(year)) notFound();

  const batch = await getBatchByYear(year);
  if (!batch) notFound();

  const sampleOfficers = await getOfficersByIds(batch.sample_officer_ids);

  return (
    <main data-testid="batch-detail-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 md:px-8 md:py-8">
        <Link
          href="/batches"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to batches
        </Link>

        <BatchOverview batch={batch} />

        <section className="grid gap-4 xl:grid-cols-2">
          <EntryList title="Cadre mix" entries={batch.cadre_mix.slice(0, 8)} />
          <EntryList title="Current rank distribution" entries={batch.current_rank_distribution.slice(0, 8)} />
          <EntryList title="Top stations served" entries={batch.top_stations.slice(0, 8)} />
          <EntryList title="Archetype distribution" entries={batch.archetype_distribution.slice(0, 8)} />
        </section>

        <section className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-label">Sample Officers</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Explore officers from this batch</h2>
            </div>
            <Link href={`/officers?batch=${batch.year}`} className="pill">
              Open in directory
            </Link>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {sampleOfficers.slice(0, 8).map((officer) => (
              <OfficerMiniCard key={officer.id} officer={officer} />
            ))}
          </div>
        </section>

        <section className="panel p-5">
          <p className="text-label">What this batch tells us</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{batch.narrative}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {batch.related_batch_years.map((relatedYear) => (
              <Link key={relatedYear} href={`/batches/${relatedYear}`} className="pill">
                Compare with batch {relatedYear}
              </Link>
            ))}
          </div>
        </section>

        <RecommendationStrip
          testId="batch-detail-recommendation-strip"
          items={[
            {
              title: "Compare previous/next batches",
              description: "Use nearby batch years to understand cohort movement shifts.",
              href: "/batches"
            },
            {
              title: "Cadre context",
              description: "Inspect how cadre structure shapes this batch's rank spread.",
              href: "/cadres"
            },
            {
              title: "Station intelligence",
              description: "Open station nodes frequently linked to this cohort.",
              href: "/stations"
            },
            {
              title: "Discover guided pathways",
              description: "Continue exploration using curated intelligence journeys.",
              href: "/discover"
            }
          ]}
        />
      </section>
    </main>
  );
}
