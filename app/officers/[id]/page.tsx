import Link from "next/link";
import type { Route } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { AppTopNav } from "@/components/officers/AppTopNav";
import { OfficerHeader } from "@/components/officers/OfficerHeader";
import { CurrentPostingCard } from "@/components/officers/CurrentPostingCard";
import { OfficerFacts } from "@/components/officers/OfficerFacts";
import { OfficeContextPanel } from "@/components/officers/OfficeContextPanel";
import { RankProgression } from "@/components/officers/RankProgression";
import { StationHistory } from "@/components/officers/StationHistory";
import { OfficerTimeline } from "@/components/officers/OfficerTimeline";
import { ProfileQuickSummary } from "@/components/officers/ProfileQuickSummary";
import { ProfileSectionNav } from "@/components/officers/ProfileSectionNav";
import { ProfileBackLink } from "@/components/officers/ProfileBackLink";
import { DataQualityPanel } from "@/components/officers/DataQualityPanel";
import { OfficerIntelligenceSummary } from "@/components/intelligence/OfficerIntelligenceSummary";
import { InsightNarrativeCard } from "@/components/intelligence/InsightNarrativeCard";
import { RelatedOfficers } from "@/components/intelligence/RelatedOfficers";
import { RecommendationStrip } from "@/components/intelligence/RecommendationStrip";
import { resolveOfficerOfficeContext } from "@/lib/intelligence/officeContext";
import { resolveRelatedOfficers } from "@/lib/intelligence/similarity";
import type { RecommendationItem } from "@/lib/intelligence/types";
import { logOfficerPerf, nowMs } from "@/lib/officers/perf";
import { stationHrefFromLocation } from "@/lib/officers/navigation";
import { getOfficersMap } from "@/lib/officers/load";

type OfficerDetailPageProps = {
  params: {
    id: string;
  };
};

export default async function OfficerDetailPage({
  params
}: OfficerDetailPageProps): Promise<JSX.Element> {
  const totalStart = nowMs();
  const loadStart = nowMs();
  const officersMap = await getOfficersMap();
  const officer =
    officersMap.get(params.id) ??
    [...officersMap.values()].find((candidate) => candidate.employee_id === params.id) ??
    null;
  const loadMs = nowMs() - loadStart;

  if (!officer) {
    notFound();
  }

  const currentStationHref = stationHrefFromLocation(
    officer.current_posting?.station_display ?? officer.current_posting?.location
  );
  const designationHref = officer.current_designation
    ? (`/officers?designation=${encodeURIComponent(officer.current_designation)}` as Route)
    : null;
  const profileReturnToForRelated = `/officers/${officer.id}?from=${encodeURIComponent("/officers")}#related`;
  const profileReturnToForOfficeContext = `/officers/${officer.id}?from=${encodeURIComponent("/officers")}#office-context`;
  const relatedStart = nowMs();
  const related = resolveRelatedOfficers(officer, officersMap);
  const relatedMs = nowMs() - relatedStart;
  const officeContextStart = nowMs();
  const officeContext = resolveOfficerOfficeContext(officer, officersMap);
  const officeContextMs = nowMs() - officeContextStart;

  logOfficerPerf("profile-server", {
    officerId: officer.id,
    loadMs,
    relatedMs,
    officeContextMs,
    totalMs: nowMs() - totalStart
  });

  const recommendationItems: RecommendationItem[] = [
    ...(currentStationHref
      ? [
          {
            title: "Open current station context",
            description: "Review the current institutional node instead of returning to the generic station hub.",
            href: currentStationHref as Route
          }
        ]
      : []),
    ...(officer.batch
      ? [
          {
            title: `See batch ${officer.batch}`,
            description: "Understand cohort-level progression and station patterns.",
            href: `/batches/${officer.batch}` as Route
          }
        ]
      : []),
    ...(officer.cadre
      ? [
          {
            title: `Explore cadre ${officer.cadre}`,
            description: "Compare typical paths for this cadre.",
            href: `/cadres/${officer.cadre.toLowerCase()}` as Route
          }
        ]
      : []),
    ...(designationHref
      ? [
          {
            title: "Compare this designation",
            description: "Open the directory prefiltered to officers at the same designation band.",
            href: designationHref
          }
        ]
      : []),
    {
      title: "Understand intelligence terms",
      description: "See how archetypes, mobility, office context, and trajectory similarity are defined.",
      href: "/guide/intelligence"
    }
  ];

  return (
    <main data-testid="officer-profile-page" className="min-h-screen bg-surface">
      <AppTopNav />

      <section className="mx-auto w-full max-w-7xl space-y-5 px-4 py-6 md:px-8 md:py-8">
        <Suspense
          fallback={
            <Link
              href="/officers"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Back to directory
            </Link>
          }
        >
          <ProfileBackLink officerId={officer.id} />
        </Suspense>

        <OfficerHeader officer={officer} />
        <ProfileSectionNav />

        <div className="grid gap-5 xl:grid-cols-[1.55fr,1fr]">
          <div className="space-y-5">
            <ProfileQuickSummary officer={officer} />
            <section id="career-signals">
              <CurrentPostingCard officer={officer} />
            </section>
            <section id="office-context">
              <OfficeContextPanel officer={officer} context={officeContext} returnTo={profileReturnToForOfficeContext} />
            </section>
            <section id="timeline">
              <OfficerTimeline officer={officer} />
            </section>
            <section id="related">
              <RelatedOfficers officer={officer} related={related} returnTo={profileReturnToForRelated} />
            </section>
            <section id="stations">
              <StationHistory officer={officer} />
            </section>
          </div>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <OfficerIntelligenceSummary officer={officer} />
            <InsightNarrativeCard officer={officer} />
            <RelatedOfficers
              officer={officer}
              related={related}
              compact
              maxItems={3}
              testId="related-officers-preview"
              returnTo={profileReturnToForRelated}
            />
            <section data-testid="officer-terms-panel" className="panel p-4">
              <p className="text-label">Explainability</p>
              <p className="mt-2 text-sm text-slate-700">
                Archetypes, mobility labels, and trajectory similarity are descriptive and deterministic. Current
                office context is shown separately, and hierarchy is not inferred where reporting-line data is absent.
              </p>
              <Link
                data-testid="officer-guide-link"
                href="/guide/intelligence"
                className="mt-3 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <CircleHelp className="h-3.5 w-3.5 text-accent" />
                Understand these terms
              </Link>
            </section>
            <section id="learn-more" className="space-y-5">
              <OfficerFacts officer={officer} />
              <RankProgression officer={officer} />
              <DataQualityPanel officer={officer} />
            </section>
          </aside>
        </div>

        <RecommendationStrip testId="officer-recommendation-strip" items={recommendationItems} />
      </section>
    </main>
  );
}
