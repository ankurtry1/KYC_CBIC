import { AppTopNav } from "@/components/officers/AppTopNav";
import { OfficerDirectoryClient } from "@/components/officers/OfficerDirectoryClient";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { parseOfficerDirectoryState } from "@/lib/officers/directory";
import { getOfficerIndex } from "@/lib/officers/load";

type OfficersPageProps = {
  searchParams?: {
    q?: string;
    cadre?: string;
    batch?: string;
    designation?: string;
    timelineQuality?: string;
    verification?: string;
    location?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  };
};

export default async function OfficersPage({ searchParams }: OfficersPageProps): Promise<JSX.Element> {
  const records = await getOfficerIndex();
  const initialState = parseOfficerDirectoryState(searchParams);

  return (
    <main data-testid="officers-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
        <div data-testid="officers-page-header" className="mb-4">
          <p className="text-label">Officer Directory</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">Search and discover officers</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Start with search and quick filters. Expand advanced filters only when needed.
          </p>
        </div>

        <OfficerDirectoryClient records={records} initialState={initialState} />

        <div className="mt-6">
          <RecommendationStrip
            testId="officers-recommendation-strip"
            items={[
              {
                title: "Guided discovery",
                description: "Use curated entry points if you are not sure what to search next.",
                href: "/discover"
              },
              {
                title: "Learn mode",
                description: "Follow training-oriented pathways using real career journeys.",
                href: "/learn"
              },
              {
                title: "Batch explorer",
                description: "Compare cohort-level progression and mobility patterns.",
                href: "/batches"
              },
              {
                title: "Station intelligence",
                description: "Trace institutional station centrality and movement corridors.",
                href: "/stations"
              }
            ]}
          />
        </div>
      </section>
    </main>
  );
}
