import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { AnimatedStatCard } from "@/components/officers/AnimatedStatCard";
import { LandingSearch } from "@/components/officers/LandingSearch";
import { OfficerCard } from "@/components/officers/OfficerCard";
import { DiscoverJourneyCard } from "@/components/intelligence/DiscoverJourneyCard";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { getDiscovery, getFeaturedOfficers, getOfficerMetrics } from "@/lib/officers/load";
import { groupedJourneys } from "@/lib/intelligence/discovery";

export default async function HomePage(): Promise<JSX.Element> {
  const [metrics, featured, discovery] = await Promise.all([
    getOfficerMetrics(),
    getFeaturedOfficers(6),
    getDiscovery()
  ]);
  const journeyGroups = groupedJourneys(discovery.journeys);
  const primaryJourneys = journeyGroups.flatMap((group) => group.items).slice(0, 4);

  return (
    <main data-testid="home-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section data-testid="home-hero" className="relative overflow-hidden border-b border-slate-200/80 bg-mesh-soft">
        <div className="mx-auto w-full max-w-7xl px-4 py-14 md:px-8 md:py-20">
          <p className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-white/70 px-3 py-1 text-xs font-semibold tracking-[0.08em] text-accent">
            <Sparkles className="h-3.5 w-3.5" />
            INTERNAL OFFICER INTELLIGENCE
          </p>

          <h1 className="mt-4 max-w-4xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 md:text-5xl">
            CBIC Officer Universe
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
            Searchable officer intelligence, postings, timelines, and career context for high-trust
            internal use.
          </p>

          <LandingSearch />

          <div className="mt-8 flex flex-wrap items-center gap-2">
            {[
              { label: "Direct Recruits", value: "DR" },
              { label: "Promotee Appraiser", value: "PA" },
              { label: "Promotee Customs/Prev", value: "PC" },
              { label: "Promotee Central Excise", value: "PE" }
            ].map((item) => (
              <Link
                key={item.value}
                href={`/officers?cadre=${item.value}`}
                className="pill transition hover:border-accent/40 hover:bg-accentSoft"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section data-testid="home-metrics" className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
        <div data-testid="home-metrics-grid" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <AnimatedStatCard
            testId="metric-total-officers"
            label="Total Officers"
            value={metrics.total_officers}
            hint="Parsed profiles"
            delay={0}
          />
          <AnimatedStatCard
            testId="metric-timeline-rich"
            label="Timeline-Rich Profiles"
            value={metrics.timeline_rich_officers}
            hint="Full chronology coverage"
            delay={0.05}
          />
          <AnimatedStatCard
            testId="metric-cadres-covered"
            label="Cadres Covered"
            value={metrics.cadres_covered}
            hint="DR / PA / PC / PE"
            delay={0.1}
          />
          <AnimatedStatCard
            testId="metric-designation-spread"
            label="Designation Spread"
            value={metrics.designation_spread}
            hint="Current-rank diversity"
            delay={0.15}
          />
        </div>
      </section>

      <section data-testid="home-featured" className="mx-auto w-full max-w-7xl px-4 pb-16 md:px-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-label">Featured Profiles</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Timeline-rich officers</h2>
          </div>

          <Link
            href="/officers"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Browse directory
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div data-testid="home-featured-grid" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {featured.map((officer) => (
            <OfficerCard key={officer.id} officer={officer} />
          ))}
        </div>

        <section className="mt-8" data-testid="home-discovery-preview">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-label">Guided Discovery</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Pick your next path</h2>
            </div>
            <Link href="/discover" className="pill">
              Open discover
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {primaryJourneys.map((journey) => (
              <DiscoverJourneyCard key={journey.id} journey={journey} />
            ))}
          </div>
        </section>

        <div className="mt-8">
          <RecommendationStrip
            testId="home-recommendation-strip"
            items={[
              {
                title: "Guided discovery",
                description: "Start with curated journey entry points.",
                href: "/discover"
              },
              {
                title: "Learning mode",
                description: "Orientation pathways for trainees and institutional users.",
                href: "/learn"
              },
              {
                title: "Batch explorer",
                description: "Analyze cohort-level progression patterns.",
                href: "/batches"
              },
              {
                title: "Station intelligence",
                description: "Understand high-traffic nodes and movement corridors.",
                href: "/stations"
              }
            ]}
          />
        </div>
      </section>
    </main>
  );
}
