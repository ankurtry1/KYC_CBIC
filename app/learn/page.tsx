import { BookOpen } from "lucide-react";
import Link from "next/link";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { LearnPathCard } from "@/components/intelligence/LearnPathCard";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { OfficerCard } from "@/components/officers/OfficerCard";
import { getBatches, getCadres, getCareerPaths, getFeaturedOfficers, getStations } from "@/lib/officers/load";

export default async function LearnPage(): Promise<JSX.Element> {
  const [paths, batches, cadres, stations, featured] = await Promise.all([
    getCareerPaths(),
    getBatches(),
    getCadres(),
    getStations(),
    getFeaturedOfficers(6)
  ]);

  const topBatches = batches.slice(0, 3);
  const topCadres = cadres.slice(0, 3);
  const topStations = stations.slice(0, 3);
  const trajectoryCards = [
    {
      title: "Fast trajectories",
      sampleSize: paths.trajectory_bands.fast.sample_size,
      threshold: paths.trajectory_bands.fast.threshold_years,
      ids: paths.trajectory_bands.fast.sample_officer_ids.slice(0, 4)
    },
    {
      title: "Steady trajectories",
      sampleSize: paths.trajectory_bands.steady.sample_size,
      threshold: paths.trajectory_bands.steady.threshold_years,
      ids: paths.trajectory_bands.steady.sample_officer_ids.slice(0, 4)
    },
    {
      title: "Deliberate trajectories",
      sampleSize: paths.trajectory_bands.deliberate.sample_size,
      threshold: null,
      ids: paths.trajectory_bands.deliberate.sample_officer_ids.slice(0, 4)
    }
  ];

  return (
    <main data-testid="learn-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <div className="panel bg-mesh-soft p-6 md:p-8">
          <p className="text-label">Learning Mode</p>
          <h1 className="mt-2 inline-flex items-center gap-2 text-3xl font-semibold tracking-tight text-slate-900">
            <BookOpen className="h-7 w-7 text-accent" />
            Institutional learning through real journeys
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700">
            This guided mode helps trainees, serving officers, and training institutions learn from real officer
            trajectories without needing a precise search query upfront.
          </p>
        </div>

        <section className="mt-6">
          <p className="text-label">Start Here</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3" data-testid="learn-path-grid">
            <LearnPathCard
              title="Learn through officer journeys"
              description="Open profiles and see intelligence summaries, narratives, and related officers."
              href="/officers"
            />
            <LearnPathCard
              title="Understand cohort evolution"
              description="Explore how batches differ in progression, stations, and archetypes."
              href="/batches"
            />
            <LearnPathCard
              title="Study cadre signatures"
              description="Compare common mobility patterns, rank spread, and archetype distribution."
              href="/cadres"
            />
            <LearnPathCard
              title="Read station context"
              description="Understand institutional corridors and high-traffic station nodes."
              href="/stations"
            />
            <LearnPathCard
              title="See progression ladders"
              description="Review fast, steady, and deliberate trajectories with representative examples."
              href="/career-paths"
            />
            <LearnPathCard
              title="Use guided discovery"
              description="Navigate the portal with clear journey entry points and next-step prompts."
              href="/discover"
            />
          </div>
        </section>

        <section className="mt-6 grid gap-4 xl:grid-cols-3">
          <article className="panel p-5" data-testid="learn-senior-journeys">
            <p className="text-label">Senior Journey Examples</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">5 leadership trajectories</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {featured.slice(0, 5).map((officer) => (
                <li key={officer.id}>
                  <Link href={`/officers/${officer.id}`} className="hover:text-accent">
                    {officer.name ?? `Officer ${officer.employee_id}`} • {officer.current_designation ?? "Unknown"}
                  </Link>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel p-5" data-testid="learn-batch-orientation">
            <p className="text-label">Batch Orientation</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">How batch progression looks</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {topBatches.map((batch) => (
                <li key={batch.year}>
                  <Link href={`/batches/${batch.year}`} className="hover:text-accent">
                    Batch {batch.year}: {batch.officer_count} officers, avg {batch.average_timeline_entries} posting records
                  </Link>
                </li>
              ))}
            </ul>
          </article>

          <article className="panel p-5" data-testid="learn-station-orientation">
            <p className="text-label">Station Orientation</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">How stations shape journeys</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {topStations.map((station) => (
                <li key={station.slug}>
                  <Link href={`/stations/${station.slug}`} className="hover:text-accent">
                    {station.name}: linked to {station.officer_count} officers ({station.importance_label})
                  </Link>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="mt-6 panel p-5" data-testid="learn-trajectory-bands">
          <p className="text-label">Trajectory Bands</p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">Fast vs steady progression context</h2>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {trajectoryCards.map((band) => (
              <div key={band.title} className="rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-sm font-semibold text-slate-800">{band.title}</p>
                <p className="mt-1 text-xs text-slate-500">Sample size: {band.sampleSize}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {band.threshold != null ? `Threshold: up to ${band.threshold} years` : "Highest observed timing band"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {band.ids.map((id) => (
                    <Link key={id} href={`/officers/${id}`} className="pill">
                      {id.replace("officer-", "")}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-label">Representative Profiles</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Learn from rich journeys</h2>
            </div>
            <Link href="/officers" className="pill">
              Open full directory
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {featured.map((officer) => (
              <OfficerCard key={officer.id} officer={officer} />
            ))}
          </div>
        </section>

        <div className="mt-6">
          <RecommendationStrip
            testId="learn-recommendation-strip"
            items={[
              {
                title: "Discover pathways",
                description: "Follow guided intelligence entry points for low-friction exploration.",
                href: "/discover"
              },
              {
                title: "Compare cadres",
                description: `${topCadres.map((cadre) => cadre.cadre).join(" / ")} trajectory signatures.`,
                href: "/cadres"
              },
              {
                title: "Track station centrality",
                description: "Identify major institutional nodes and movement corridors.",
                href: "/stations"
              },
              {
                title: "Career path atlas",
                description: "Understand what data can and cannot say about progression speed.",
                href: "/career-paths"
              }
            ]}
          />
        </div>
      </section>
    </main>
  );
}
