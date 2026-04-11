import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { OfficerHeader } from "@/components/officers/OfficerHeader";
import { CurrentPostingCard } from "@/components/officers/CurrentPostingCard";
import { OfficerFacts } from "@/components/officers/OfficerFacts";
import { RankProgression } from "@/components/officers/RankProgression";
import { StationHistory } from "@/components/officers/StationHistory";
import { OfficerTimeline } from "@/components/officers/OfficerTimeline";
import { DataQualityPanel } from "@/components/officers/DataQualityPanel";
import { OfficerIntelligenceSummary } from "@/components/intelligence/OfficerIntelligenceSummary";
import { InsightNarrativeCard } from "@/components/intelligence/InsightNarrativeCard";
import { RelatedOfficers } from "@/components/intelligence/RelatedOfficers";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { resolveRelatedOfficers } from "@/lib/intelligence/similarity";
import type { RecommendationItem } from "@/lib/intelligence/types";
import { getOfficerById, getOfficersMap } from "@/lib/officers/load";

type OfficerDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function OfficerDetailPage({ params }: OfficerDetailPageProps): Promise<JSX.Element> {
  const [officer, officersMap] = await Promise.all([getOfficerById(params.id), getOfficersMap()]);

  if (!officer) {
    notFound();
  }

  const related = resolveRelatedOfficers(officer, officersMap);

  const recommendationItems: RecommendationItem[] = [
    {
      title: "Explore related officers",
      description: "Open deterministic peers with overlapping trajectories.",
      href: "/officers"
    },
    {
      title: `See batch ${officer.batch ?? "context"}`,
      description: "Understand cohort-level progression and station patterns.",
      href: officer.batch ? (`/batches/${officer.batch}` as Route) : "/batches"
    },
    {
      title: `Explore cadre ${officer.cadre ?? "patterns"}`,
      description: "Compare typical paths for this cadre.",
      href: officer.cadre ? (`/cadres/${officer.cadre.toLowerCase()}` as Route) : "/cadres"
    },
    {
      title: "Station intelligence",
      description: "Trace stations linked to this officer's journey.",
      href: "/stations"
    }
  ];

  return (
    <main data-testid="officer-profile-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 md:px-8 md:py-8">
        <Link
          href="/officers"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to directory
        </Link>

        <OfficerHeader officer={officer} />

        <div className="grid gap-5 xl:grid-cols-[1.65fr,1fr]">
          <div className="space-y-5">
            <CurrentPostingCard officer={officer} />
            <OfficerTimeline officer={officer} />
            <RelatedOfficers officer={officer} related={related} />
            <RecommendationStrip testId="officer-recommendation-strip" items={recommendationItems} />
          </div>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <OfficerIntelligenceSummary officer={officer} />
            <InsightNarrativeCard officer={officer} />
            <OfficerFacts officer={officer} />
            <RankProgression officer={officer} />
            <StationHistory officer={officer} />
            <DataQualityPanel officer={officer} />
          </aside>
        </div>
      </section>
    </main>
  );
}
