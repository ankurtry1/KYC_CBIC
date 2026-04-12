import { Compass } from "lucide-react";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { DiscoverJourneyCard } from "@/components/intelligence/DiscoverJourneyCard";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { groupedJourneys } from "@/lib/intelligence/discovery";
import { getDiscovery } from "@/lib/officers/load";

export default async function DiscoverPage(): Promise<JSX.Element> {
  const discovery = await getDiscovery();
  const groups = groupedJourneys(discovery.journeys);

  return (
    <main data-testid="discover-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <div className="panel bg-mesh-soft p-6 md:p-8">
          <p className="text-label">Guided Discovery</p>
          <h1 className="mt-2 inline-flex items-center gap-2 text-3xl font-semibold tracking-tight text-slate-900">
            <Compass className="h-7 w-7 text-accent" />
            Start your exploration journey
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700">
            Choose a pathway based on what you want to understand. Each route is designed to keep cognitive load
            low while exposing meaningful institutional patterns.
          </p>
        </div>

        <div className="mt-6 space-y-6">
          {groups.map((group) => (
            <section key={group.title}>
              <div className="mb-3">
                <p className="text-label">{group.title}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.items.map((journey) => (
                  <div key={journey.id} data-testid="discover-journey-card">
                    <DiscoverJourneyCard journey={journey} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-6">
          <RecommendationStrip
            testId="discover-recommendation-strip"
            items={[
              {
                title: "Orientation Mode",
                description: "Start with curated learning pathways before deep exploration.",
                href: "/learn"
              },
              {
                title: "Officer Directory",
                description: "Search by officer name, employee ID, batch, cadre, and station.",
                href: "/officers"
              },
              {
                title: "Batch Explorer",
                description: "Understand cohort-level movement and progression patterns.",
                href: "/batches"
              },
              {
                title: "Career Paths",
                description: "Review common progression ladders and trajectory bands.",
                href: "/career-paths"
              },
              {
                title: "Understand intelligence terms",
                description: "See how archetypes, mobility, and similarity labels are derived.",
                href: "/guide/intelligence"
              }
            ]}
          />
        </div>
      </section>
    </main>
  );
}
