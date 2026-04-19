import { AppTopNav } from "@/components/officers/AppTopNav";
import { CareerPathExplorer } from "@/components/intelligence/CareerPathExplorer";
import { OfficerMiniCard } from "@/components/intelligence/OfficerMiniCard";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { getCareerPaths, getSurfaceableOfficersByIds } from "@/lib/officers/load";

export default async function CareerPathsPage(): Promise<JSX.Element> {
  const paths = await getCareerPaths();
  const representativeIds = paths.representative_journeys.slice(0, 8).map((entry) => entry.officer_id);
  const representative = await getSurfaceableOfficersByIds(representativeIds, 8);

  return (
    <main data-testid="career-paths-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <div className="mb-5">
          <p className="text-label">Career Path Explorer</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Understand progression pathways</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Explore common rank sequences, trajectory bands, and representative officer journeys with transparent
            deterministic rules.
          </p>
        </div>

        <CareerPathExplorer paths={paths} returnTo="/career-paths" />

        <section className="mt-5 panel p-5" data-testid="career-path-rank-timings">
          <p className="text-label">Average Years to Reach Rank</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {paths.rank_step_timings.map((item) => (
              <div key={item.rank} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-sm font-semibold text-slate-800">{item.rank}</p>
                <p className="mt-1 text-xs text-slate-500">Sample size: {item.sample_size}</p>
                <p className="mt-1 text-sm text-slate-700">
                  {item.average_years_to_reach != null ? `${item.average_years_to_reach} years` : "Insufficient data"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 panel p-5" data-testid="career-path-representative-journeys">
          <p className="text-label">Representative Journeys</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-900">Profiles that illustrate path patterns</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {representative.map((officer) => (
              <OfficerMiniCard key={officer.id} officer={officer} returnTo="/career-paths" />
            ))}
          </div>
        </section>

        <section className="mt-5 panel p-5">
          <p className="text-label">What the data can and cannot say</p>
          <p className="mt-2 text-sm leading-relaxed text-slate-700">{paths.caveat}</p>
        </section>

        <div className="mt-6">
          <RecommendationStrip
            testId="career-paths-recommendation-strip"
            items={[
              {
                title: "Open timeline-rich officers",
                description: "Validate progression patterns through the most complete individual profile timelines.",
                href: "/officers?sortBy=timeline_richness&sortOrder=desc" as const
              },
              {
                title: "Compare by batch",
                description: "See how progression differs across cohort years.",
                href: "/batches"
              },
              {
                title: "Compare by cadre",
                description: "Understand cadre-linked progression signatures.",
                href: "/cadres"
              },
              {
                title: "Return to discovery",
                description: "Use guided pathways to continue structured exploration.",
                href: "/discover"
              }
            ]}
          />
        </div>
      </section>
    </main>
  );
}
