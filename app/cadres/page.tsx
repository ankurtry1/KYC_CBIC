import { AppTopNav } from "@/components/officers/AppTopNav";
import { CadreCard } from "@/components/intelligence/CadreCard";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { getCadres } from "@/lib/officers/load";

export default async function CadresPage(): Promise<JSX.Element> {
  const cadres = await getCadres();

  return (
    <main data-testid="cadres-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        <div className="mb-5">
          <p className="text-label">Cadre Explorer</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Understand cadre signatures</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Compare officer counts, timeline richness, progression patterns, and archetype distribution by cadre.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" data-testid="cadres-grid">
          {cadres.map((cadre) => (
            <CadreCard key={cadre.slug} cadre={cadre} />
          ))}
        </div>

        <div className="mt-6">
          <RecommendationStrip
            testId="cadres-recommendation-strip"
            items={[
              {
                title: "Open batch explorer",
                description: "See how cadre signatures vary across adjacent cohorts.",
                href: "/batches"
              },
              {
                title: "Study stations",
                description: "Trace which stations appear frequently in each cadre journey.",
                href: "/stations"
              },
              {
                title: "Career path atlas",
                description: "Compare progression ladders against cadre-level patterns.",
                href: "/career-paths"
              },
              {
                title: "Guided discovery",
                description: "Switch to curated pathways for low-friction exploration.",
                href: "/discover"
              }
            ]}
          />
        </div>
      </section>
    </main>
  );
}
