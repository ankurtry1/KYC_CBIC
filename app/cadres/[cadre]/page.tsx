import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { CadreOverview } from "@/components/intelligence/CadreOverview";
import { OfficerMiniCard } from "@/components/intelligence/OfficerMiniCard";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { stationHrefFromLocation } from "@/lib/officers/navigation";
import { getCadreBySlug, getSurfaceableOfficersByIds } from "@/lib/officers/load";

type CadreDetailPageProps = {
  params: {
    cadre: string;
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

export default async function CadreDetailPage({ params }: CadreDetailPageProps): Promise<JSX.Element> {
  const cadre = await getCadreBySlug(params.cadre);
  if (!cadre) notFound();

  const sampleOfficers = await getSurfaceableOfficersByIds(cadre.sample_officer_ids, 8);
  const topStation = cadre.common_stations[0]?.key;
  const topBatch = cadre.batch_spread[0]?.key;

  return (
    <main data-testid="cadre-detail-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 md:px-8 md:py-8">
        <Link
          href="/cadres"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cadres
        </Link>

        <CadreOverview cadre={cadre} />

        <section className="grid gap-4 xl:grid-cols-2">
          <EntryList title="Current rank spread" entries={cadre.typical_current_rank_spread.slice(0, 8)} />
          <EntryList title="Common progressions" entries={cadre.common_rank_progressions.slice(0, 8)} />
          <EntryList
            title="Common stations"
            entries={cadre.common_stations.slice(0, 8)}
            getHref={(entry) => stationHrefFromLocation(entry.key)}
          />
          <EntryList title="Archetype distribution" entries={cadre.archetype_distribution.slice(0, 8)} />
        </section>

        <section className="panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-label">Representative Officers</p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">Explore officers in {cadre.cadre}</h2>
            </div>
            <Link href={`/officers?cadre=${cadre.cadre}`} className="pill">
              Open in directory
            </Link>
          </div>
          {sampleOfficers.length < Math.min(cadre.sample_officer_ids.length, 8) ? (
            <p className="mt-2 text-xs text-slate-500">
              Showing a high-trust sample of named profiles with fewer data-quality concerns.
            </p>
          ) : null}

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {sampleOfficers.slice(0, 8).map((officer) => (
              <OfficerMiniCard key={officer.id} officer={officer} returnTo={`/cadres/${cadre.slug}`} />
            ))}
          </div>
        </section>

        <section className="panel p-5">
          <p className="text-label">What this cadre tells us</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{cadre.distinctiveness}</p>
        </section>

        <RecommendationStrip
          testId="cadre-detail-recommendation-strip"
          items={[
            {
              title: "Open officers in this cadre",
              description: "Continue into the directory with the cadre filter already applied.",
              href: `/officers?cadre=${cadre.cadre}` as Route
            },
            ...(topStation
              ? [
                  {
                    title: "Common station context",
                    description: "Jump directly to the station most associated with this cadre.",
                    href: (stationHrefFromLocation(topStation) ?? "/stations") as Route
                  }
                ]
              : []),
            ...(topBatch
              ? [
                  {
                    title: `Top batch: ${topBatch}`,
                    description: "Open the cohort most represented in this cadre's current sample.",
                    href: `/batches/${topBatch}` as Route
                  }
                ]
              : []),
            {
              title: "Career path context",
              description: "Relate common rank progressions to overall progression ladders.",
              href: "/career-paths"
            },
            {
              title: "Guided discovery",
              description: "Continue with curated entry pathways.",
              href: "/discover"
            }
          ]}
        />
      </section>
    </main>
  );
}
