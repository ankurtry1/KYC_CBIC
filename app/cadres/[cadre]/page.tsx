import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { CadreOverview } from "@/components/intelligence/CadreOverview";
import { OfficerMiniCard } from "@/components/intelligence/OfficerMiniCard";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { getCadreBySlug, getOfficersByIds } from "@/lib/officers/load";

type CadreDetailPageProps = {
  params: {
    cadre: string;
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

export default async function CadreDetailPage({ params }: CadreDetailPageProps): Promise<JSX.Element> {
  const cadre = await getCadreBySlug(params.cadre);
  if (!cadre) notFound();

  const sampleOfficers = await getOfficersByIds(cadre.sample_officer_ids);

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
          <EntryList title="Common stations" entries={cadre.common_stations.slice(0, 8)} />
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

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {sampleOfficers.slice(0, 8).map((officer) => (
              <OfficerMiniCard key={officer.id} officer={officer} />
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
              title: "Compare with batches",
              description: "See how this cadre profile appears across cohort years.",
              href: "/batches"
            },
            {
              title: "Station context",
              description: "Inspect stations commonly linked to this cadre.",
              href: "/stations"
            },
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
