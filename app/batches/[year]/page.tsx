import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { BatchOverview } from "@/components/intelligence/BatchOverview";
import { OfficerMiniCard } from "@/components/intelligence/OfficerMiniCard";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { stationHrefFromLocation } from "@/lib/officers/navigation";
import { getBatchByYear, getSurfaceableOfficersByIds } from "@/lib/officers/load";

type BatchDetailPageProps = {
  params: {
    year: string;
  };
};

function EntryList({
  title,
  entries,
  getHref
}: {
  title: string;
  entries: Array<{ key: string; count: number }>;
  getHref?: (entry: { key: string; count: number }) => Route | null;
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
              {getHref?.(entry) ? (
                <Link href={getHref(entry)!} className="text-sm text-accent transition hover:underline">
                  {entry.key}
                </Link>
              ) : (
                <p className="text-sm text-slate-700">{entry.key}</p>
              )}
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

  const sampleOfficers = await getSurfaceableOfficersByIds(batch.sample_officer_ids, 8);
  const topCadre = batch.cadre_mix[0]?.key;
  const topStation = batch.top_stations[0]?.key;
  const relatedBatch = batch.related_batch_years[0];

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
          <EntryList
            title="Cadre mix"
            entries={batch.cadre_mix.slice(0, 8)}
            getHref={(entry) => `/cadres/${entry.key.toLowerCase()}` as Route}
          />
          <EntryList title="Current rank distribution" entries={batch.current_rank_distribution.slice(0, 8)} />
          <EntryList
            title="Top stations served"
            entries={batch.top_stations.slice(0, 8)}
            getHref={(entry) => stationHrefFromLocation(entry.key)}
          />
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
          {sampleOfficers.length < Math.min(batch.sample_officer_ids.length, 8) ? (
            <p className="mt-2 text-xs text-slate-500">
              Showing a high-trust sample of named profiles with fewer data-quality concerns.
            </p>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {sampleOfficers.slice(0, 8).map((officer) => (
              <OfficerMiniCard key={officer.id} officer={officer} returnTo={`/batches/${batch.year}`} />
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
              title: "Open officers in this batch",
              description: "Continue into the directory without losing the cohort context.",
              href: `/officers?batch=${batch.year}` as Route
            },
            ...(topCadre
              ? [
                  {
                    title: `Top cadre: ${topCadre}`,
                    description: "Inspect how the dominant cadre shapes this batch's rank spread.",
                    href: `/cadres/${topCadre.toLowerCase()}` as Route
                  }
                ]
              : []),
            ...(topStation
              ? [
                  {
                    title: "Top station context",
                    description: "Open the station most frequently linked to this cohort.",
                    href: (stationHrefFromLocation(topStation) ?? "/stations") as Route
                  }
                ]
              : []),
            ...(relatedBatch
              ? [
                  {
                    title: `Compare with batch ${relatedBatch}`,
                    description: "Move directly to the nearest related cohort instead of the generic batch hub.",
                    href: `/batches/${relatedBatch}` as Route
                  }
                ]
              : [])
          ]}
        />
      </section>
    </main>
  );
}
